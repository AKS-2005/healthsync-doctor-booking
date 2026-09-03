const bcrypt = require('bcryptjs');
const { pool, transaction } = require('../config/database');
const runMigrations = require('../scripts/migrate');
const cacheService = require('../services/cacheService');

const seedDatabase = async () => {
  console.log('🌱 Seeding database with realistic sample data...');

  try {
    // 1. Ensure migrations are applied
    await runMigrations();

    // 2. Clear existing records in proper dependency order
    await pool.query(`
      TRUNCATE TABLE notifications, appointments, doctor_blocked_dates, doctor_schedules, doctors, specializations, users RESTART IDENTITY CASCADE;
    `);

    // 3. Clear Redis cache
    await cacheService.clearAll();

    // Passwords hash
    const adminPass = await bcrypt.hash('admin123', 10);
    const doctorPass = await bcrypt.hash('doctor123', 10);
    const patientPass = await bcrypt.hash('patient123', 10);

    await transaction(async (client) => {
      // A. Insert Admin User
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, phone)
        VALUES ('System Administrator', 'admin@healthsync.com', $1, 'ADMIN', '+1-555-0100')
      `, [adminPass]);

      // B. Insert Specializations
      const specializations = [
        { name: 'Cardiology', description: 'Expert diagnosis and treatment for heart, cardiovascular, and blood vessel conditions.', icon: 'heart-pulse' },
        { name: 'Dermatology', description: 'Comprehensive skin, hair, and nail health treatments and aesthetic care.', icon: 'sparkles' },
        { name: 'Neurology', description: 'Advanced care for brain, spinal cord, and peripheral nervous system disorders.', icon: 'brain' },
        { name: 'Orthopedics', description: 'Specialized surgical and non-surgical musculoskeletal bone and joint care.', icon: 'bone' },
        { name: 'Pediatrics', description: 'Compassionate pediatric healthcare for infants, children, and adolescents.', icon: 'baby' },
        { name: 'General Medicine', description: 'Primary healthcare, preventive medicine, and chronic disease management.', icon: 'stethoscope' }
      ];

      const specMap = new Map();
      for (const spec of specializations) {
        const res = await client.query(`
          INSERT INTO specializations (name, description, icon)
          VALUES ($1, $2, $3) RETURNING id, name
        `, [spec.name, spec.description, spec.icon]);
        specMap.set(res.rows[0].name, res.rows[0].id);
      }

      // C. Insert 5 Doctors
      const doctorsData = [
        {
          name: 'Dr. Aarti Sharma',
          email: 'dr.sharma@healthsync.com',
          phone: '+1-555-0111',
          spec: 'Cardiology',
          qualification: 'MD, FACC - Harvard Medical School',
          experience: 14,
          fee: 120.00,
          rating: 4.9,
          bio: 'Senior Consultant Cardiologist with 14+ years of clinical experience specializing in preventive cardiology, coronary interventions, and hypertension management.'
        },
        {
          name: 'Dr. Vikram Patel',
          email: 'dr.patel@healthsync.com',
          phone: '+1-555-0112',
          spec: 'Neurology',
          qualification: 'MD, DM Neurology - Johns Hopkins',
          experience: 11,
          fee: 140.00,
          rating: 4.8,
          bio: 'Renowned Neurologist focusing on neurovascular care, epilepsy management, stroke prevention, and cognitive health disorders.'
        },
        {
          name: 'Dr. Sneha Reddy',
          email: 'dr.reddy@healthsync.com',
          phone: '+1-555-0113',
          spec: 'Dermatology',
          qualification: 'MD Dermatology, FAAD - Stanford University',
          experience: 8,
          fee: 95.00,
          rating: 4.9,
          bio: 'Board-certified Dermatologist offering advanced clinical treatments for eczema, psoriasis, acne, and aesthetic rejuvenation.'
        },
        {
          name: 'Dr. Rajesh Gupta',
          email: 'dr.gupta@healthsync.com',
          phone: '+1-555-0114',
          spec: 'Orthopedics',
          qualification: 'MS Ortho, MCh - Oxford University',
          experience: 16,
          fee: 130.00,
          rating: 4.7,
          bio: 'Specialist Orthopedic Surgeon with vast expertise in sports medicine, joint preservation, arthroscopy, and spine health.'
        },
        {
          name: 'Dr. Ananya Iyer',
          email: 'dr.iyer@healthsync.com',
          phone: '+1-555-0115',
          spec: 'Pediatrics',
          qualification: 'MD Pediatrics, FAAP - Columbia University',
          experience: 9,
          fee: 85.00,
          rating: 4.9,
          bio: 'Compassionate Pediatrician dedicated to neonatal care, child growth development, immunizations, and pediatric wellness.'
        }
      ];

      const createdDoctorIds = [];
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

      for (const d of doctorsData) {
        // Insert User
        const userRes = await client.query(`
          INSERT INTO users (name, email, password_hash, role, phone)
          VALUES ($1, $2, $3, 'DOCTOR', $4) RETURNING id
        `, [d.name, d.email, doctorPass, d.phone]);
        const userId = userRes.rows[0].id;

        // Insert Doctor Record
        const specId = specMap.get(d.spec);
        const docRes = await client.query(`
          INSERT INTO doctors (user_id, specialization_id, qualification, experience_years, consultation_fee, bio, rating, is_approved)
          VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id
        `, [userId, specId, d.qualification, d.experience, d.fee, d.bio, d.rating]);
        const docId = docRes.rows[0].id;
        createdDoctorIds.push(docId);

        // Insert Schedules (09:00 - 17:00, 30 min duration)
        for (const day of days) {
          await client.query(`
            INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration)
            VALUES ($1, $2, '09:00:00', '17:00:00', 30)
          `, [docId, day]);
        }
      }

      // D. Insert 20 Patient Users
      const patientNames = [
        'John Doe', 'Jane Smith', 'Michael Johnson', 'Emily Davis', 'David Wilson',
        'Sarah Brown', 'James Taylor', 'Emma Anderson', 'Robert Martinez', 'Olivia Thomas',
        'William Jackson', 'Sophia White', 'Daniel Harris', 'Isabella Martin', 'Matthew Thompson',
        'Ava Garcia', 'Joseph Robinson', 'Mia Clark', 'Alexander Rodriguez', 'Charlotte Lewis'
      ];

      const createdPatientIds = [];
      for (let i = 0; i < patientNames.length; i++) {
        const email = `patient${i + 1}@healthsync.com`;
        const phone = `+1-555-02${String(i + 1).padStart(2, '0')}`;
        const pRes = await client.query(`
          INSERT INTO users (name, email, password_hash, role, phone)
          VALUES ($1, $2, $3, 'PATIENT', $4) RETURNING id
        `, [patientNames[i], email, patientPass, phone]);
        createdPatientIds.push(pRes.rows[0].id);
      }

      // E. Insert Sample Appointments across different dates & statuses
      const sampleAppointments = [
        { patientIdx: 0, docIdx: 0, date: '2026-08-27', time: '11:00:00', status: 'CONFIRMED', reason: 'Routine heart checkup & ECG review' },
        { patientIdx: 1, docIdx: 0, date: '2026-08-27', time: '14:00:00', status: 'CONFIRMED', reason: 'Blood pressure fluctuation consultation' },
        { patientIdx: 2, docIdx: 1, date: '2026-08-27', time: '10:00:00', status: 'CONFIRMED', reason: 'Recurring migraine headache evaluation' },
        { patientIdx: 3, docIdx: 2, date: '2026-08-28', time: '09:30:00', status: 'CONFIRMED', reason: 'Skin rash diagnosis' },
        { patientIdx: 4, docIdx: 3, date: '2026-08-28', time: '11:30:00', status: 'CONFIRMED', reason: 'Knee ligament follow-up' },
        { patientIdx: 5, docIdx: 4, date: '2026-08-29', time: '10:00:00', status: 'CONFIRMED', reason: 'Child vaccination & growth assessment' },
        { patientIdx: 6, docIdx: 0, date: '2026-08-20', time: '09:30:00', status: 'COMPLETED', reason: 'Cholesterol management plan', notes: 'Prescription renewed, advised low sodium diet.' },
        { patientIdx: 7, docIdx: 1, date: '2026-08-22', time: '15:00:00', status: 'COMPLETED', reason: 'Sleep disorder follow up', notes: 'Sleep study completed.' },
        { patientIdx: 8, docIdx: 2, date: '2026-08-24', time: '11:00:00', status: 'CANCELLED', reason: 'Patient emergency travel' }
      ];

      for (const appt of sampleAppointments) {
        const patientId = createdPatientIds[appt.patientIdx];
        const doctorId = createdDoctorIds[appt.docIdx];
        const apptRes = await client.query(`
          INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [patientId, doctorId, appt.date, appt.time, appt.status, appt.reason, appt.notes || '']);

        // Insert notification for patient
        await client.query(`
          INSERT INTO notifications (user_id, appointment_id, title, message)
          VALUES ($1, $2, 'Appointment Status', $3)
        `, [patientId, apptRes.rows[0].id, `Your appointment on ${appt.date} at ${appt.time.substring(0, 5)} is ${appt.status.toLowerCase()}.`]);
      }

      console.log('✅ Seed data successfully inserted:');
      console.log('   - 1 Admin (admin@healthsync.com / admin123)');
      console.log('   - 5 Doctors (dr.sharma@healthsync.com, etc. / doctor123)');
      console.log('   - 20 Patients (patient1@healthsync.com to patient20@healthsync.com / patient123)');
      console.log('   - 6 Specializations with schedules & sample bookings.');
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDatabase;
