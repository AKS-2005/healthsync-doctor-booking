const appointmentService = require('../services/appointmentService');
const { query } = require('../config/database');

class AppointmentController {
  /**
   * GET /api/doctors/:doctorId/availability?date=YYYY-MM-DD
   */
  async getAvailability(req, res, next) {
    try {
      const { doctorId } = req.params;
      const { date } = req.query;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Valid date parameter in YYYY-MM-DD format is required.'
        });
      }

      const currentUserId = req.user ? req.user.userId : null;
      const availability = await appointmentService.getDoctorAvailability(
        parseInt(doctorId, 10),
        date,
        currentUserId
      );

      res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/appointments/lock
   * Acquires a 5-minute Redis temporary lock on a slot
   */
  async lockSlot(req, res, next) {
    try {
      const { doctorId, date, time } = req.body;
      const userId = req.user.userId;

      const result = await appointmentService.lockSlot({
        doctorId: parseInt(doctorId, 10),
        date,
        time,
        userId
      });

      res.status(200).json({
        success: true,
        message: result.message,
        lockToken: result.lockToken,
        expiresIn: result.expiresIn,
        doctorSlot: {
          doctorId,
          date,
          time
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/appointments/lock
   * Releases a temporary Redis slot lock
   */
  async releaseLock(req, res, next) {
    try {
      const { doctorId, date, time, lockToken } = req.body;
      const userId = req.user.userId;

      const result = await appointmentService.releaseLock({
        doctorId: parseInt(doctorId, 10),
        date,
        time,
        lockToken,
        userId
      });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/appointments
   * Confirms temporary slot lock and saves permanent booking into PostgreSQL
   */
  async confirmBooking(req, res, next) {
    try {
      const { doctorId, date, time, reason, notes, lockToken } = req.body;
      const patientId = req.user.userId;

      const appointment = await appointmentService.confirmBooking({
        patientId,
        doctorId: parseInt(doctorId, 10),
        date,
        time,
        reason,
        notes,
        lockToken
      });

      res.status(201).json({
        success: true,
        message: 'Appointment confirmed successfully!',
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/appointments/my
   * Returns current user's appointments (Patient or Doctor)
   */
  async getMyAppointments(req, res, next) {
    try {
      const { status, date, limit = 50, page = 1 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const userId = req.user.userId;
      const role = req.user.role;

      let whereClauses = [];
      let params = [];
      let paramIdx = 1;

      if (role === 'PATIENT') {
        whereClauses.push(`a.patient_id = $${paramIdx}`);
        params.push(userId);
        paramIdx++;
      } else if (role === 'DOCTOR') {
        whereClauses.push(`d.user_id = $${paramIdx}`);
        params.push(userId);
        paramIdx++;
      }

      if (status) {
        whereClauses.push(`a.status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      if (date) {
        whereClauses.push(`a.appointment_date = $${paramIdx}`);
        params.push(date);
        paramIdx++;
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countSql = `
        SELECT COUNT(a.id) as total
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        ${whereSql};
      `;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0].total, 10);

      const sql = `
        SELECT 
          a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time, 
          a.status, a.reason, a.notes, a.created_at,
          patient.name as patient_name, patient.email as patient_email, patient.phone as patient_phone,
          doc_user.name as doctor_name, doc_user.email as doctor_email,
          d.qualification, d.consultation_fee,
          s.name as specialization_name, s.icon as specialization_icon
        FROM appointments a
        JOIN users patient ON a.patient_id = patient.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users doc_user ON d.user_id = doc_user.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        ${whereSql}
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
      `;
      params.push(parseInt(limit, 10), offset);

      const resList = await query(sql, params);

      res.json({
        success: true,
        data: resList.rows,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/appointments/:id
   */
  async getAppointmentById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const role = req.user.role;

      const sql = `
        SELECT 
          a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time, 
          a.status, a.reason, a.notes, a.created_at,
          patient.name as patient_name, patient.email as patient_email, patient.phone as patient_phone,
          doc_user.name as doctor_name, doc_user.email as doctor_email,
          d.qualification, d.consultation_fee,
          s.name as specialization_name
        FROM appointments a
        JOIN users patient ON a.patient_id = patient.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users doc_user ON d.user_id = doc_user.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        WHERE a.id = $1;
      `;
      const result = await query(sql, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      const appointment = result.rows[0];

      // Authorization check
      if (role === 'PATIENT' && appointment.patient_id !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/appointments/:id/cancel
   */
  async cancelAppointment(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;
      const role = req.user.role;

      const updated = await appointmentService.cancelAppointment(
        parseInt(id, 10),
        userId,
        role,
        reason
      );

      res.json({
        success: true,
        message: 'Appointment cancelled successfully.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/appointments/:id/status
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user.userId;
      const role = req.user.role;

      const validStatuses = ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'CONFIRMED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
      }

      const updated = await appointmentService.updateStatus(
        parseInt(id, 10),
        status,
        notes,
        userId,
        role
      );

      res.json({
        success: true,
        message: `Appointment updated to ${status}.`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppointmentController();
