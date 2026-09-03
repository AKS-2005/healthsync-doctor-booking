const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { checkDbConnection } = require('./config/database');
const { safeRedis } = require('./config/redis');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const specializationRoutes = require('./routes/specializationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const demoRoutes = require('./routes/demoRoutes');

// Import Error Handler
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.originalUrl.startsWith('/api')) {
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await checkDbConnection();
  const redisHealth = await safeRedis.ping();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    redis: redisHealth
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/demo', demoRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Doctor Appointment Booking System API',
    version: '1.0.0',
    description: 'High-concurrency medical appointment scheduling powered by Redis Slot Locking & PostgreSQL',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      doctors: '/api/doctors',
      appointments: '/api/appointments',
      admin: '/api/admin',
      specializations: '/api/specializations',
      demo: '/api/demo/simulate-race-condition'
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start server if not in serverless environment and not imported by test runner
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🏥 HealthSync Doctor Appointment API Server`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`====================================================`);

    // Verify DB and Redis connectivity
    const dbStatus = await checkDbConnection();
    if (dbStatus.connected) {
      console.log('✅ Connected to PostgreSQL Database');
    } else {
      console.warn(`⚠️  PostgreSQL connection notice: ${dbStatus.error}`);
    }

    const redisStatus = await safeRedis.ping();
    if (redisStatus.connected) {
      console.log(`✅ Slot Locking & Caching Engine Active (${redisStatus.mode})`);
    }
  });
}

module.exports = app;
