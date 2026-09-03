const { query, transaction } = require('../config/database');
const cacheService = require('../services/cacheService');

class DoctorController {
  /**
   * Get all doctors with filters, search, pagination, and Redis caching
   */
  async getAllDoctors(req, res, next) {
    try {
      const { specialization, search, page = 1, limit = 12 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

      let whereClauses = ['d.is_approved = TRUE'];
      let params = [];
      let paramIndex = 1;

      if (specialization) {
        whereClauses.push(`(LOWER(s.name) = LOWER($${paramIndex}) OR s.id = $${paramIndex + 1})`);
        params.push(specialization, isNaN(specialization) ? -1 : parseInt(specialization, 10));
        paramIndex += 2;
      }

      if (search) {
        whereClauses.push(`(LOWER(u.name) LIKE LOWER($${paramIndex}) OR LOWER(s.name) LIKE LOWER($${paramIndex}) OR LOWER(d.qualification) LIKE LOWER($${paramIndex}))`);
        params.push(`%${search}%`);
        paramIndex += 1;
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count query
      const countSql = `
        SELECT COUNT(d.id) as total
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        ${whereSql};
      `;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0].total, 10);

      // Data query
      const dataSql = `
        SELECT 
          d.id, d.user_id, d.specialization_id, d.qualification, d.experience_years, 
          d.consultation_fee, d.bio, d.rating, d.is_approved, d.created_at,
          u.name as doctor_name, u.email, u.phone, u.avatar_url,
          s.name as specialization_name, s.icon as specialization_icon
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        ${whereSql}
        ORDER BY d.rating DESC, d.experience_years DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
      `;
      params.push(parseInt(limit, 10), offset);

      const docsRes = await query(dataSql, params);

      res.json({
        success: true,
        data: docsRes.rows,
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
   * Get single doctor by ID (Using Redis cache)
   */
  async getDoctorById(req, res, next) {
    try {
      const { id } = req.params;

      // 1. Try Redis cache
      const cached = await cacheService.getDoctor(id);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          source: 'cache'
        });
      }

      // 2. Fetch from PostgreSQL
      const docSql = `
        SELECT 
          d.id, d.user_id, d.specialization_id, d.qualification, d.experience_years, 
          d.consultation_fee, d.bio, d.rating, d.is_approved, d.created_at,
          u.name as doctor_name, u.email, u.phone, u.avatar_url,
          s.name as specialization_name, s.description as specialization_description, s.icon as specialization_icon
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        WHERE d.id = $1;
      `;
      const docRes = await query(docSql, [id]);

      if (docRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }

      const doctor = docRes.rows[0];

      // Fetch working schedules
      const schedRes = await query(
        `SELECT day_of_week, start_time, end_time, slot_duration, is_active 
         FROM doctor_schedules 
         WHERE doctor_id = $1 AND is_active = TRUE
         ORDER BY id ASC`,
        [id]
      );
      doctor.schedules = schedRes.rows;

      // Fetch upcoming blocked dates
      const blockedRes = await query(
        `SELECT blocked_date, reason 
         FROM doctor_blocked_dates 
         WHERE doctor_id = $1 AND blocked_date >= CURRENT_DATE 
         ORDER BY blocked_date ASC`,
        [id]
      );
      doctor.blockedDates = blockedRes.rows;

      // 3. Store in Redis cache
      await cacheService.setDoctor(id, doctor);

      res.json({
        success: true,
        data: doctor,
        source: 'database'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update doctor profile (Invalidates Redis cache)
   */
  async updateDoctorProfile(req, res, next) {
    try {
      const { id } = req.params;
      const { qualification, experienceYears, consultationFee, bio, specializationId } = req.body;

      // Check doctor ownership or admin
      const existingRes = await query(`SELECT user_id FROM doctors WHERE id = $1`, [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }

      if (req.user.role === 'DOCTOR' && existingRes.rows[0].user_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot update other doctor profile' });
      }

      const updateSql = `
        UPDATE doctors
        SET 
          qualification = COALESCE($1, qualification),
          experience_years = COALESCE($2, experience_years),
          consultation_fee = COALESCE($3, consultation_fee),
          bio = COALESCE($4, bio),
          specialization_id = COALESCE($5, specialization_id),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *;
      `;
      const result = await query(updateSql, [
        qualification,
        experienceYears,
        consultationFee,
        bio,
        specializationId,
        id
      ]);

      // Invalidate Redis cache
      await cacheService.invalidateDoctor(id);

      res.json({
        success: true,
        message: 'Doctor profile updated successfully.',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get doctor schedules
   */
  async getDoctorSchedules(req, res, next) {
    try {
      const { id } = req.params;
      const schedRes = await query(
        `SELECT id, day_of_week, start_time, end_time, slot_duration, is_active 
         FROM doctor_schedules 
         WHERE doctor_id = $1
         ORDER BY id ASC`,
        [id]
      );
      res.json({ success: true, data: schedRes.rows });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set or update doctor schedules (Doctor/Admin)
   */
  async setDoctorSchedules(req, res, next) {
    try {
      const { id } = req.params;
      const { schedules } = req.body; // Array of { day_of_week, start_time, end_time, slot_duration, is_active }

      // Check ownership
      const existingRes = await query(`SELECT user_id FROM doctors WHERE id = $1`, [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      if (req.user.role === 'DOCTOR' && existingRes.rows[0].user_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      await transaction(async (client) => {
        // Delete existing schedules for this doctor
        await client.query(`DELETE FROM doctor_schedules WHERE doctor_id = $1`, [id]);

        // Insert new schedules
        for (const s of schedules) {
          await client.query(
            `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, s.day_of_week, s.start_time, s.end_time, s.slot_duration || 30, s.is_active !== false]
          );
        }
      });

      // Invalidate Redis cache
      await cacheService.invalidateDoctor(id);

      res.json({
        success: true,
        message: 'Doctor schedules updated successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Block a specific date (Vacation, emergency)
   */
  async addBlockedDate(req, res, next) {
    try {
      const { id } = req.params;
      const { date, reason } = req.body;

      const existingRes = await query(`SELECT user_id FROM doctors WHERE id = $1`, [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      if (req.user.role === 'DOCTOR' && existingRes.rows[0].user_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const sql = `
        INSERT INTO doctor_blocked_dates (doctor_id, blocked_date, reason)
        VALUES ($1, $2, $3)
        ON CONFLICT (doctor_id, blocked_date) 
        DO UPDATE SET reason = $3
        RETURNING *;
      `;
      const result = await query(sql, [id, date, reason || 'Unavailable']);

      await cacheService.invalidateDoctor(id);

      res.json({
        success: true,
        message: `Date ${date} blocked successfully.`,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove a blocked date
   */
  async removeBlockedDate(req, res, next) {
    try {
      const { id, date } = req.params;

      const existingRes = await query(`SELECT user_id FROM doctors WHERE id = $1`, [id]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      if (req.user.role === 'DOCTOR' && existingRes.rows[0].user_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      await query(`DELETE FROM doctor_blocked_dates WHERE doctor_id = $1 AND blocked_date = $2`, [id, date]);
      await cacheService.invalidateDoctor(id);

      res.json({
        success: true,
        message: `Date ${date} unblocked successfully.`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DoctorController();
