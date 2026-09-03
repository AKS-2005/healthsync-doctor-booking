const { query } = require('../config/database');
const cacheService = require('../services/cacheService');

class AdminController {
  /**
   * GET /api/admin/stats
   * Returns complete platform analytics and metrics
   */
  async getStats(req, res, next) {
    try {
      // 1. Total counts
      const countsSql = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'PATIENT') as total_patients,
          (SELECT COUNT(*) FROM doctors WHERE is_approved = TRUE) as total_doctors,
          (SELECT COUNT(*) FROM appointments) as total_appointments,
          (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE) as today_appointments,
          (SELECT COUNT(*) FROM appointments WHERE status = 'COMPLETED') as completed_appointments,
          (SELECT COUNT(*) FROM appointments WHERE status = 'CANCELLED') as cancelled_appointments,
          (SELECT COUNT(*) FROM specializations) as total_specializations;
      `;
      const countsRes = await query(countsSql);
      const stats = countsRes.rows[0];

      // 2. Appointments by Status breakdown
      const statusSql = `
        SELECT status, COUNT(*) as count 
        FROM appointments 
        GROUP BY status;
      `;
      const statusRes = await query(statusSql);

      // 3. Appointments by Specialization
      const specSql = `
        SELECT s.name, COUNT(a.id) as count
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN specializations s ON d.specialization_id = s.id
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 6;
      `;
      const specRes = await query(specSql);

      // 4. Recent Appointments
      const recentSql = `
        SELECT 
          a.id, a.appointment_date, a.appointment_time, a.status,
          u.name as patient_name,
          doc_u.name as doctor_name,
          s.name as specialization_name
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users doc_u ON d.user_id = doc_u.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        ORDER BY a.created_at DESC
        LIMIT 8;
      `;
      const recentRes = await query(recentSql);

      res.json({
        success: true,
        data: {
          metrics: {
            totalPatients: parseInt(stats.total_patients, 10),
            totalDoctors: parseInt(stats.total_doctors, 10),
            totalAppointments: parseInt(stats.total_appointments, 10),
            todayAppointments: parseInt(stats.today_appointments, 10),
            completedAppointments: parseInt(stats.completed_appointments, 10),
            cancelledAppointments: parseInt(stats.cancelled_appointments, 10),
            totalSpecializations: parseInt(stats.total_specializations, 10)
          },
          statusBreakdown: statusRes.rows,
          specializationBreakdown: specRes.rows,
          recentAppointments: recentRes.rows
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users
   */
  async getAllUsers(req, res, next) {
    try {
      const { role, search, page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

      let whereClauses = [];
      let params = [];
      let idx = 1;

      if (role) {
        whereClauses.push(`role = $${idx}`);
        params.push(role.toUpperCase());
        idx++;
      }

      if (search) {
        whereClauses.push(`(LOWER(name) LIKE LOWER($${idx}) OR LOWER(email) LIKE LOWER($${idx}))`);
        params.push(`%${search}%`);
        idx++;
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) as total FROM users ${whereSql};`;
      const countRes = await query(countSql, params);
      const total = parseInt(countRes.rows[0].total, 10);

      const sql = `
        SELECT id, name, email, role, phone, avatar_url, created_at
        FROM users
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1};
      `;
      params.push(parseInt(limit, 10), offset);

      const usersRes = await query(sql, params);

      res.json({
        success: true,
        data: usersRes.rows,
        pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10) }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/doctors
   */
  async getAllDoctorsAdmin(req, res, next) {
    try {
      const sql = `
        SELECT 
          d.id, d.user_id, d.qualification, d.experience_years, d.consultation_fee,
          d.is_approved, d.rating, d.created_at,
          u.name as doctor_name, u.email, u.phone,
          s.name as specialization_name
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        ORDER BY d.created_at DESC;
      `;
      const resDocs = await query(sql);
      res.json({ success: true, data: resDocs.rows });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/doctors/:id/approve
   */
  async toggleDoctorApproval(req, res, next) {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;

      const sql = `
        UPDATE doctors
        SET is_approved = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `;
      const resDoc = await query(sql, [isApproved, id]);

      if (resDoc.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }

      await cacheService.invalidateDoctor(id);

      res.json({
        success: true,
        message: `Doctor status updated to ${isApproved ? 'Approved' : 'Blocked'}.`,
        data: resDoc.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
