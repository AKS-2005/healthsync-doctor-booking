const { query } = require('../config/database');

class NotificationService {
  /**
   * Create an in-app notification for a user
   */
  async createNotification({ userId, appointmentId = null, title, message }) {
    try {
      const sql = `
        INSERT INTO notifications (user_id, appointment_id, title, message, is_read, created_at)
        VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
        RETURNING *;
      `;
      const res = await query(sql, [userId, appointmentId, title, message]);
      return res.rows[0];
    } catch (error) {
      console.error('Failed to create notification:', error.message);
      return null;
    }
  }

  /**
   * Get all notifications for a specific user
   */
  async getUserNotifications(userId, limit = 20) {
    const sql = `
      SELECT id, user_id, appointment_id, title, message, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const res = await query(sql, [userId, limit]);
    return res.rows;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId, userId) {
    const sql = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
    const res = await query(sql, [notificationId, userId]);
    return res.rows[0] || null;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const sql = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1;
    `;
    await query(sql, [userId]);
    return { success: true };
  }
}

module.exports = new NotificationService();
