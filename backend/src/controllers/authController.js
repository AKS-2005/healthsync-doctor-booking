const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthController {
  /**
   * Register a new user (PATIENT, DOCTOR, or ADMIN)
   */
  async register(req, res, next) {
    try {
      const { name, email, password, role = 'PATIENT', phone, specializationId, qualification, experienceYears, consultationFee, bio } = req.body;

      // Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const normalizedRole = role.toUpperCase();

      const newUser = await transaction(async (client) => {
        // Insert user
        const userSql = `
          INSERT INTO users (name, email, password_hash, role, phone)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, email, role, phone, created_at;
        `;
        const userRes = await client.query(userSql, [name, email, passwordHash, normalizedRole, phone || null]);
        const user = userRes.rows[0];

        // If registering as a DOCTOR, initialize doctor profile and default schedule
        if (normalizedRole === 'DOCTOR') {
          const docSql = `
            INSERT INTO doctors (user_id, specialization_id, qualification, experience_years, consultation_fee, bio, is_approved)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE)
            RETURNING id;
          `;
          const docRes = await client.query(docSql, [
            user.id,
            specializationId || 1,
            qualification || 'MBBS, MD',
            experienceYears || 5,
            consultationFee || 75.00,
            bio || 'Dedicated healthcare specialist committed to patient well-being.'
          ]);

          const doctorId = docRes.rows[0].id;

          // Default schedule: Monday - Friday 09:00 - 17:00
          const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
          for (const day of days) {
            await client.query(
              `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration)
               VALUES ($1, $2, '09:00:00', '17:00:00', 30)`,
              [doctorId, day]
            );
          }
        }

        return user;
      });

      // Generate JWT Token
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: newUser
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const userRes = await query(
        `SELECT id, name, email, password_hash, role, phone, avatar_url FROM users WHERE email = $1`
        ,
        [email]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email address or password.'
        });
      }

      const user = userRes.rows[0];

      // Verify bcrypt password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email address or password.'
        });
      }

      let doctorProfile = null;
      if (user.role === 'DOCTOR') {
        const docRes = await query(
          `SELECT d.*, s.name as specialization_name 
           FROM doctors d 
           LEFT JOIN specializations s ON d.specialization_id = s.id 
           WHERE d.user_id = $1`,
          [user.id]
        );
        if (docRes.rows.length > 0) {
          doctorProfile = docRes.rows[0];
        }
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      delete user.password_hash;

      res.json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: {
          ...user,
          doctorProfile
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Current Authenticated User Profile
   */
  async getMe(req, res, next) {
    try {
      const userRes = await query(
        `SELECT id, name, email, role, phone, avatar_url, created_at FROM users WHERE id = $1`,
        [req.user.userId]
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userRes.rows[0];
      let doctorProfile = null;

      if (user.role === 'DOCTOR') {
        const docRes = await query(
          `SELECT d.*, s.name as specialization_name 
           FROM doctors d 
           LEFT JOIN specializations s ON d.specialization_id = s.id 
           WHERE d.user_id = $1`,
          [user.id]
        );
        if (docRes.rows.length > 0) {
          doctorProfile = docRes.rows[0];
        }
      }

      res.json({
        success: true,
        user: {
          ...user,
          doctorProfile
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
