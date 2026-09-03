const { query, transaction } = require('../config/database');
const redisLockService = require('./redisLockService');
const notificationService = require('./notificationService');

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

class AppointmentService {
  /**
   * Helper to format Date into YYYY-MM-DD string
   */
  formatDate(dateObj) {
    if (typeof dateObj === 'string') return dateObj.substring(0, 10);
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * Helper to generate time slots array between startTime and endTime
   * e.g., '09:00:00' to '12:00:00' step 30 mins -> ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
   */
  generateSlots(startTimeStr, endTimeStr, durationMinutes = 30) {
    const slots = [];
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + durationMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push(timeStr);
      currentMinutes += durationMinutes;
    }

    return slots;
  }

  /**
   * Fast Availability Check:
   * Merges Doctor Schedule + Blocked Dates + PostgreSQL Bookings + Active Redis Locks
   * 
   * @param {number} doctorId 
   * @param {string} dateStr (YYYY-MM-DD)
   * @param {number|null} currentUserId 
   */
  async getDoctorAvailability(doctorId, dateStr, currentUserId = null) {
    const parsedDate = new Date(`${dateStr}T00:00:00Z`);
    const dayOfWeek = DAY_NAMES[parsedDate.getUTCDay()];

    // 1. Check if the date is blocked by the doctor
    const blockedRes = await query(
      `SELECT * FROM doctor_blocked_dates WHERE doctor_id = $1 AND blocked_date = $2`,
      [doctorId, dateStr]
    );

    if (blockedRes.rows.length > 0) {
      return {
        doctorId,
        date: dateStr,
        dayOfWeek,
        isBlocked: true,
        blockReason: blockedRes.rows[0].reason || 'Doctor unavailable on this date',
        slots: []
      };
    }

    // 2. Fetch Doctor's schedule for this day of week
    const scheduleRes = await query(
      `SELECT * FROM doctor_schedules WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = TRUE`,
      [doctorId, dayOfWeek]
    );

    if (scheduleRes.rows.length === 0) {
      return {
        doctorId,
        date: dateStr,
        dayOfWeek,
        isOffDay: true,
        message: `Doctor does not work on ${dayOfWeek}s`,
        slots: []
      };
    }

    const schedule = scheduleRes.rows[0];
    const candidateSlots = this.generateSlots(
      schedule.start_time,
      schedule.end_time,
      schedule.slot_duration || 30
    );

    // 3. Query PostgreSQL for existing active bookings on this date
    const bookedRes = await query(
      `SELECT id, appointment_time, status, patient_id 
       FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND status != 'CANCELLED'`,
      [doctorId, dateStr]
    );

    const bookedTimeMap = new Map();
    bookedRes.rows.forEach(row => {
      // Normalize '09:00:00' to '09:00'
      const timeFormatted = String(row.appointment_time).substring(0, 5);
      bookedTimeMap.set(timeFormatted, row);
    });

    // 4. Query Redis for all candidate slot lock states in parallel
    const slotPromises = candidateSlots.map(async (timeStr) => {
      // If already booked in SQL, it's permanently BOOKED
      if (bookedTimeMap.has(timeStr)) {
        const booking = bookedTimeMap.get(timeStr);
        return {
          time: timeStr,
          status: 'BOOKED',
          isMine: currentUserId ? booking.patient_id === currentUserId : false
        };
      }

      // Check Redis lock status
      const lockInfo = await redisLockService.getSlotLockInfo(doctorId, dateStr, timeStr, currentUserId);

      if (lockInfo.isLocked) {
        return {
          time: timeStr,
          status: 'LOCKED',
          isMine: lockInfo.isMine,
          remainingTtl: lockInfo.remainingTtl,
          lockToken: lockInfo.lockToken // Only returned if isMine is true
        };
      }

      return {
        time: timeStr,
        status: 'AVAILABLE',
        isMine: false
      };
    });

    const slots = await Promise.all(slotPromises);

    return {
      doctorId,
      date: dateStr,
      dayOfWeek,
      schedule: {
        startTime: schedule.start_time.substring(0, 5),
        endTime: schedule.end_time.substring(0, 5),
        slotDuration: schedule.slot_duration
      },
      slots
    };
  }

  /**
   * Acquire a 5-minute temporary slot lock in Redis
   */
  async lockSlot({ doctorId, date, time, userId }) {
    // 1. Verify doctor exists and has active status
    const docCheck = await query(`SELECT id FROM doctors WHERE id = $1 AND is_approved = TRUE`, [doctorId]);
    if (docCheck.rows.length === 0) {
      throw { status: 404, message: 'Doctor not found or not approved' };
    }

    // 2. Verify not already booked in PostgreSQL
    const existing = await query(
      `SELECT id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status != 'CANCELLED'`,
      [doctorId, date, time]
    );

    if (existing.rows.length > 0) {
      throw { status: 409, message: 'This slot is already booked and confirmed by another patient.' };
    }

    // 3. Attempt Redis Atomic Lock
    const lockResult = await redisLockService.acquireSlotLock(doctorId, date, time, userId);

    if (!lockResult.success) {
      throw {
        status: 409,
        message: lockResult.message || 'This appointment slot is currently being held by another patient.',
        expiresIn: lockResult.expiresIn
      };
    }

    return lockResult;
  }

  /**
   * Release an acquired temporary slot lock
   */
  async releaseLock({ doctorId, date, time, lockToken, userId }) {
    const result = await redisLockService.releaseSlotLock(doctorId, date, time, lockToken, userId);
    if (!result.success) {
      throw { status: 403, message: result.message };
    }
    return result;
  }

  /**
   * Confirm and Permanently Book an Appointment
   * 
   * Security & Race-Condition Sequence:
   * 1. Verify Redis Lock ownership and validity
   * 2. Start PostgreSQL Transaction
   * 3. Select existing appointment FOR UPDATE to guarantee SQL row-lock
   * 4. Insert appointment record
   * 5. Send notifications
   * 6. Commit PostgreSQL Transaction
   * 7. Delete Redis Lock
   */
  async confirmBooking({ patientId, doctorId, date, time, reason, notes, lockToken }) {
    // Step 1: Verify Redis lock belongs to this user and is active
    const lockVerification = await redisLockService.verifySlotLock(doctorId, date, time, lockToken, patientId);
    if (!lockVerification.valid) {
      throw {
        status: 400,
        message: lockVerification.message || 'Your reservation has expired or is invalid. Please select the slot again.'
      };
    }

    // Normalized time e.g. "10:30:00"
    const normalizedTime = time.length === 5 ? `${time}:00` : time;

    // Step 2 & 3 & 4: PostgreSQL Transaction
    const newAppointment = await transaction(async (client) => {
      // Check SQL duplicate
      const checkSql = `
        SELECT id FROM appointments 
        WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status != 'CANCELLED'
        FOR UPDATE;
      `;
      const existing = await client.query(checkSql, [doctorId, date, normalizedTime]);

      if (existing.rows.length > 0) {
        throw {
          status: 409,
          message: 'Appointment slot was already booked. Transaction aborted.'
        };
      }

      // Insert appointment
      const insertSql = `
        INSERT INTO appointments 
          (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes, lock_token_reference)
        VALUES 
          ($1, $2, $3, $4, 'CONFIRMED', $5, $6, $7)
        RETURNING *;
      `;
      const insertRes = await client.query(insertSql, [
        patientId,
        doctorId,
        date,
        normalizedTime,
        reason || 'General Consultation',
        notes || '',
        lockToken
      ]);

      const appointment = insertRes.rows[0];

      // Create notification for Patient
      await client.query(
        `INSERT INTO notifications (user_id, appointment_id, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          patientId,
          appointment.id,
          'Appointment Confirmed',
          `Your appointment for ${date} at ${time} has been successfully confirmed.`
        ]
      );

      // Fetch Doctor user_id for notification
      const docUserRes = await client.query(`SELECT user_id FROM doctors WHERE id = $1`, [doctorId]);
      if (docUserRes.rows.length > 0) {
        const docUserId = docUserRes.rows[0].user_id;
        await client.query(
          `INSERT INTO notifications (user_id, appointment_id, title, message)
           VALUES ($1, $2, $3, $4)`,
          [
            docUserId,
            appointment.id,
            'New Appointment Booked',
            `A patient has booked an appointment for ${date} at ${time}.`
          ]
        );
      }

      return appointment;
    });

    // Step 7: Delete the temporary Redis lock now that SQL has permanently stored the appointment
    await redisLockService.forceReleaseLock(doctorId, date, time);

    return newAppointment;
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId, userId, userRole, cancelReason = '') {
    return await transaction(async (client) => {
      // Find appointment
      const findSql = `
        SELECT a.*, d.user_id as doctor_user_id 
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.id = $1;
      `;
      const res = await client.query(findSql, [appointmentId]);

      if (res.rows.length === 0) {
        throw { status: 404, message: 'Appointment not found' };
      }

      const appt = res.rows[0];

      // Authorization check
      if (userRole === 'PATIENT' && appt.patient_id !== userId) {
        throw { status: 403, message: 'Unauthorized to cancel this appointment' };
      }
      if (userRole === 'DOCTOR' && appt.doctor_user_id !== userId) {
        throw { status: 403, message: 'Unauthorized to cancel this appointment' };
      }

      if (appt.status === 'CANCELLED') {
        throw { status: 400, message: 'Appointment is already cancelled' };
      }

      if (appt.status === 'COMPLETED') {
        throw { status: 400, message: 'Cannot cancel a completed appointment' };
      }

      // Update status
      const updateSql = `
        UPDATE appointments 
        SET status = 'CANCELLED', notes = COALESCE(notes, '') || ' [Cancelled: ' || $2 || ']', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
      `;
      const updateRes = await client.query(updateSql, [appointmentId, cancelReason || 'Cancelled by user']);
      const updated = updateRes.rows[0];

      // Notify other party
      const notifyUserId = (userRole === 'PATIENT') ? appt.doctor_user_id : appt.patient_id;
      const cancelledBy = userRole === 'PATIENT' ? 'Patient' : 'Doctor';

      await client.query(
        `INSERT INTO notifications (user_id, appointment_id, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          notifyUserId,
          appointmentId,
          'Appointment Cancelled',
          `The appointment on ${appt.appointment_date.toISOString().split('T')[0]} at ${appt.appointment_time} was cancelled by ${cancelledBy}.`
        ]
      );

      return updated;
    });
  }

  /**
   * Update appointment status (Doctor/Admin: COMPLETED, NO_SHOW, etc.)
   */
  async updateStatus(appointmentId, status, notes = '', doctorUserId = null, userRole = null) {
    return await transaction(async (client) => {
      const findRes = await client.query(
        `SELECT a.*, d.user_id as doctor_user_id 
         FROM appointments a 
         JOIN doctors d ON a.doctor_id = d.id 
         WHERE a.id = $1`,
        [appointmentId]
      );

      if (findRes.rows.length === 0) {
        throw { status: 404, message: 'Appointment not found' };
      }

      const appt = findRes.rows[0];

      if (userRole === 'DOCTOR' && appt.doctor_user_id !== doctorUserId) {
        throw { status: 403, message: 'Unauthorized to update this appointment' };
      }

      const updateSql = `
        UPDATE appointments 
        SET status = $1, notes = CASE WHEN $2 != '' THEN $2 ELSE notes END, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *;
      `;
      const res = await client.query(updateSql, [status, notes, appointmentId]);

      // Notify patient
      await client.query(
        `INSERT INTO notifications (user_id, appointment_id, title, message)
         VALUES ($1, $2, $3, $4)`,
        [
          appt.patient_id,
          appointmentId,
          `Appointment Status: ${status}`,
          `Your appointment status has been updated to ${status}.`
        ]
      );

      return res.rows[0];
    });
  }
}

module.exports = new AppointmentService();
