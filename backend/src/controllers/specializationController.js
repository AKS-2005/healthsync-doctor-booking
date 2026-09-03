const { query } = require('../config/database');
const cacheService = require('../services/cacheService');

class SpecializationController {
  /**
   * GET /api/specializations
   * Uses Redis Cache
   */
  async getAllSpecializations(req, res, next) {
    try {
      // 1. Try cache
      const cached = await cacheService.getSpecializations();
      if (cached) {
        return res.json({ success: true, data: cached, source: 'cache' });
      }

      // 2. Query Postgres
      const sql = `
        SELECT s.id, s.name, s.description, s.icon, COUNT(d.id) as doctor_count
        FROM specializations s
        LEFT JOIN doctors d ON s.id = d.specialization_id AND d.is_approved = TRUE
        GROUP BY s.id
        ORDER BY s.name ASC;
      `;
      const result = await query(sql);

      // 3. Cache result
      await cacheService.setSpecializations(result.rows);

      res.json({
        success: true,
        data: result.rows,
        source: 'database'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/specializations (Admin only)
   */
  async createSpecialization(req, res, next) {
    try {
      const { name, description, icon } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Specialization name is required' });
      }

      const sql = `
        INSERT INTO specializations (name, description, icon)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      const result = await query(sql, [name, description || '', icon || 'stethoscope']);

      await cacheService.invalidateSpecializations();

      res.status(201).json({
        success: true,
        message: 'Specialization created successfully.',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/specializations/:id
   */
  async updateSpecialization(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, icon } = req.body;

      const sql = `
        UPDATE specializations
        SET name = COALESCE($1, name), description = COALESCE($2, description), icon = COALESCE($3, icon)
        WHERE id = $4
        RETURNING *;
      `;
      const result = await query(sql, [name, description, icon, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Specialization not found' });
      }

      await cacheService.invalidateSpecializations();

      res.json({
        success: true,
        message: 'Specialization updated successfully.',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/specializations/:id
   */
  async deleteSpecialization(req, res, next) {
    try {
      const { id } = req.params;

      const check = await query(`SELECT COUNT(*) as count FROM doctors WHERE specialization_id = $1`, [id]);
      if (parseInt(check.rows[0].count, 10) > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete specialization because active doctors are associated with it.'
        });
      }

      const result = await query(`DELETE FROM specializations WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Specialization not found' });
      }

      await cacheService.invalidateSpecializations();

      res.json({
        success: true,
        message: 'Specialization deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SpecializationController();
