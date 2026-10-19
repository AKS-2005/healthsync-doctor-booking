const { query } = require('../config/database');
const appointmentService = require('./appointmentService');

// Static Grounding / RAG Knowledge Base
const KNOWLEDGE_BASE = {
  clinicName: 'HealthSync Medical Center',
  tagline: 'High-Concurrency Healthcare Scheduling Platform',
  workingHours: 'Monday - Friday: 09:00 AM - 05:00 PM | Saturday: 09:00 AM - 01:00 PM | Sunday: Closed',
  emergencyDisclaimer: '⚠️ Emergency Notice: HealthSync AI is an informational and scheduling assistant. If you are experiencing acute emergencies such as severe chest pain, stroke symptoms, severe shortness of breath, or trauma, please dial 112 (or your local emergency number) or proceed to the nearest emergency room immediately.',
  slotLockingPolicy: 'When selecting an available appointment slot, HealthSync atomically reserves it for you for 5 minutes (300 seconds) using distributed Redis locks (SET NX EX 300). This guarantees that no other patient can double-book your chosen slot while you enter consultation details.',
  cancellationPolicy: 'Appointments can be cancelled free of charge up to 2 hours prior to the scheduled consultation time from your Patient Dashboard.',
  specialties: [
    { name: 'Cardiology', symptoms: 'chest pain, high blood pressure, palpitations, shortness of breath, heart murmur' },
    { name: 'Dermatology', symptoms: 'skin rash, acne, moles, eczema, skin allergy, psoriasis, hair loss' },
    { name: 'Neurology', symptoms: 'severe headache, migraine, dizziness, numbness, seizure, nerve pain' },
    { name: 'Pediatrics', symptoms: 'child fever, infant nutrition, developmental checkup, pediatric vaccination, cough in child' },
    { name: 'Orthopedics', symptoms: 'joint pain, back pain, bone fracture, knee pain, arthritis, sports injury' },
    { name: 'General Medicine', symptoms: 'general fever, fatigue, cold, flu, digestive issue, routine health checkup' }
  ]
};

class AiService {
  /**
   * Fetch user's appointments from PostgreSQL
   */
  async getUserAppointments(userId) {
    if (!userId) return [];
    try {
      const sql = `
        SELECT 
          a.id, a.appointment_date, a.appointment_time, a.status, a.reason, a.notes,
          a.doctor_id,
          doc_user.name as doctor_name,
          s.name as specialization,
          d.qualification, d.consultation_fee
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users doc_user ON d.user_id = doc_user.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        WHERE a.patient_id = $1
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
        LIMIT 6;
      `;
      const res = await query(sql, [userId]);
      return res.rows;
    } catch (err) {
      console.error('Error fetching user appointments for AI:', err.message);
      return [];
    }
  }

  /**
   * Fetch doctors matching criteria or all top doctors
   */
  async getDoctors(searchTerm = null) {
    try {
      let sql = `
        SELECT 
          d.id, d.qualification, d.experience_years, d.consultation_fee, d.rating, d.bio,
          u.name as doctor_name,
          s.name as specialization
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN specializations s ON d.specialization_id = s.id
        WHERE d.is_approved = TRUE
      `;
      const params = [];
      if (searchTerm) {
        sql += ` AND (u.name ILIKE $1 OR s.name ILIKE $1 OR d.bio ILIKE $1)`;
        params.push(`%${searchTerm}%`);
      }
      sql += ` ORDER BY d.rating DESC, d.experience_years DESC LIMIT 6;`;
      const res = await query(sql, params);
      return res.rows;
    } catch (err) {
      console.error('Error fetching doctors for AI:', err.message);
      return [];
    }
  }

  /**
   * Get dynamic suggestions depending on user authentication status
   */
  getSuggestedQuestions(isLoggedIn, userName = null) {
    if (isLoggedIn) {
      return [
        `📅 When is my next appointment?`,
        `📋 Show my recent consultations`,
        `🩺 Recommend a doctor for my symptoms`,
        `🔒 How does 5-minute slot lock work?`,
        `❌ How do I cancel an appointment?`
      ];
    }
    return [
      `🩺 Which doctor should I consult for migraine?`,
      `⭐ Show top cardiologists and fees`,
      `🔒 How does 5-minute slot reservation work?`,
      `🕒 What are clinic hours and policies?`,
      `🔑 How can I check my booked appointments?`
    ];
  }

  /**
   * Execute Gemini API request via REST
   */
  async callGeminiApi(systemPrompt, userPrompt, apiKey) {
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nUser Question:\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800,
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error('No content returned from Gemini model');
    }
    return replyText;
  }

  /**
   * Rule-based grounded conversational fallback engine
   * Executes when GEMINI_API_KEY is omitted or unreachable, guaranteeing 100% uptime
   */
  async generateFallbackReply(message, user, appointments, doctors) {
    const lower = message.toLowerCase().trim();
    let reply = '';
    const cards = [];
    const suggestions = [];

    // 1. Check User Bookings
    if (
      lower.includes('my appointment') ||
      lower.includes('my booking') ||
      lower.includes('next appointment') ||
      lower.includes('check booking') ||
      lower.includes('my consultation') ||
      lower.includes('booking status')
    ) {
      if (!user) {
        reply = `To check your active or past appointments, please **log in** to your HealthSync account. Once logged in, I will retrieve your real-time booking records from our database!`;
        suggestions.push('Log In to Patient Account', 'Browse Doctors', 'How does slot locking work?');
        return { reply, cards, suggestions, requiresAuth: true };
      }

      if (!appointments || appointments.length === 0) {
        reply = `Hello **${user.name}**, you currently do not have any appointments recorded in your account. Would you like me to help you find an available doctor?`;
        suggestions.push('Show top doctors', 'Book an appointment');
        return { reply, cards, suggestions };
      }

      const upcoming = appointments.filter(a => a.status === 'CONFIRMED');
      const past = appointments.filter(a => a.status !== 'CONFIRMED');

      reply = `Hello **${user.name}**! Here is the latest booking information from your records:\n\n`;

      if (upcoming.length > 0) {
        reply += `### 📅 Upcoming Consultation:\n`;
        const next = upcoming[0];
        const dateStr = new Date(next.appointment_date).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        reply += `- **Doctor**: ${next.doctor_name} (${next.specialization})\n`;
        reply += `- **Date & Time**: ${dateStr} at ${next.appointment_time.slice(0, 5)}\n`;
        reply += `- **Status**: \`${next.status}\`\n`;
        if (next.reason) reply += `- **Reason**: ${next.reason}\n`;
        reply += `\nYou can manage or cancel this from your Patient Dashboard.`;

        cards.push({
          type: 'appointment',
          id: next.id,
          doctorId: next.doctor_id,
          doctorName: next.doctor_name,
          specialization: next.specialization,
          date: next.appointment_date,
          time: next.appointment_time,
          status: next.status,
          consultationFee: next.consultation_fee
        });
      } else {
        reply += `You have no active upcoming appointments. Your last consultation was on ${new Date(past[0].appointment_date).toLocaleDateString()}.\n`;
      }

      suggestions.push('Book new appointment', 'Can I cancel an appointment?', 'Recommend a specialist');
      return { reply, cards, suggestions };
    }

    // 2. Cancellation query
    if (lower.includes('cancel') && (lower.includes('appointment') || lower.includes('booking') || lower.includes('how to'))) {
      reply = `### ❌ Appointment Cancellation Policy\n\n`;
      reply += `- **Free Cancellation**: You can cancel any scheduled appointment up to **2 hours before** the appointment time without fee.\n`;
      reply += `- **How to cancel**: Visit your **My Appointments** page, click the **Cancel Appointment** button next to your slot, and state your cancellation reason.\n`;
      reply += `- Once cancelled, our system atomically frees the slot for other patients.`;

      if (user && appointments && appointments.some(a => a.status === 'CONFIRMED')) {
        const activeApt = appointments.find(a => a.status === 'CONFIRMED');
        cards.push({
          type: 'appointment',
          id: activeApt.id,
          doctorId: activeApt.doctor_id,
          doctorName: activeApt.doctor_name,
          specialization: activeApt.specialization,
          date: activeApt.appointment_date,
          time: activeApt.appointment_time,
          status: activeApt.status
        });
      }
      suggestions.push('Go to My Appointments', 'When is my next appointment?');
      return { reply, cards, suggestions };
    }

    // 3. Slot Locking & Concurrency question
    if (lower.includes('lock') || lower.includes('5 min') || lower.includes('double book') || lower.includes('redis') || lower.includes('concurrency')) {
      reply = `### 🔒 Distributed Slot Locking in HealthSync\n\n`;
      reply += `HealthSync uses a **Two-Phase Distributed Locking Protocol** using **Upstash Redis** and **PostgreSQL** to prevent race conditions:\n\n`;
      reply += `1. **Phase 1 (Redis Temporary Lock)**: When you click a slot, an atomic \`SET NX EX 300\` lock reserves that slot exclusively for **5 minutes**.\n`;
      reply += `2. **Phase 2 (PostgreSQL ACID Commit)**: When you confirm your symptoms, a PostgreSQL transaction permanently records the booking.\n`;
      reply += `3. **Safe Release**: An atomic Redis Lua script deletes the lock token. If a patient leaves without completing, the lock automatically expires after 300 seconds so no slots are permanently blocked!`;
      suggestions.push('Browse available doctors', 'Check my bookings');
      return { reply, cards, suggestions };
    }

    // 4. Symptom / Specialist Recommendation
    let matchedSpec = null;
    for (const spec of KNOWLEDGE_BASE.specialties) {
      const keywords = spec.symptoms.split(', ');
      if (keywords.some(k => lower.includes(k)) || lower.includes(spec.name.toLowerCase())) {
        matchedSpec = spec;
        break;
      }
    }

    if (matchedSpec || lower.includes('symptom') || lower.includes('doctor') || lower.includes('cardiologist') || lower.includes('dermatologist') || lower.includes('neurologist')) {
      const specName = matchedSpec ? matchedSpec.name : null;
      const matchedDocs = specName
        ? doctors.filter(d => d.specialization?.toLowerCase() === specName.toLowerCase())
        : doctors;

      reply = matchedSpec 
        ? `Based on your query regarding symptoms, we recommend consulting our **${matchedSpec.name}** specialists.\n\n`
        : `Here are our top certified healthcare specialists available for consultation:\n\n`;

      if (matchedDocs.length > 0) {
        matchedDocs.slice(0, 3).forEach(doc => {
          reply += `- **${doc.doctor_name}** — ${doc.specialization} (${doc.qualification}, ${doc.experience_years} yrs exp) • Fee: ₹${doc.consultation_fee} • Rating: ⭐ ${doc.rating}\n`;
          cards.push({
            type: 'doctor',
            id: doc.id,
            name: doc.doctor_name,
            specialization: doc.specialization,
            qualification: doc.qualification,
            experience: doc.experience_years,
            fee: doc.consultation_fee,
            rating: doc.rating
          });
        });
        reply += `\nClick on any doctor card below to view their schedule and lock your preferred slot!`;
      } else {
        reply += `Please visit our Doctors directory to explore available practitioners.`;
      }

      if (lower.includes('chest pain') || lower.includes('heart attack') || lower.includes('breath') || lower.includes('emergency')) {
        reply += `\n\n${KNOWLEDGE_BASE.emergencyDisclaimer}`;
      }

      suggestions.push('Book a slot', 'How does slot locking work?');
      return { reply, cards, suggestions };
    }

    // 5. Default General Healthcare & Assistance
    reply = `Hello! I am **HealthSync AI Assistant**, your personal medical & scheduling coordinator.\n\n`;
    reply += `I can assist you with:\n`;
    reply += `- 📅 **Checking your personal bookings** and consultation history\n`;
    reply += `- 🩺 **Finding the right doctor** based on your symptoms or specialty\n`;
    reply += `- 🔒 **Explaining our 5-minute atomic slot reservation** guarantee\n`;
    reply += `- ⏰ **Clinic operating hours**: ${KNOWLEDGE_BASE.workingHours}\n\n`;
    reply += `How can I assist your health journey today?`;

    suggestions.push(
      user ? '📅 When is my next appointment?' : '🔑 Log In to check appointments',
      '🩺 Recommend a doctor',
      '⭐ Show top specialists'
    );

    return { reply, cards, suggestions };
  }

  /**
   * Main entrypoint to process an AI chat message
   */
  async processMessage({ message, history = [], user = null }) {
    const isLoggedIn = !!user;
    const userId = user ? user.userId : null;

    // Fetch live context from database
    const [userAppointments, allDoctors] = await Promise.all([
      this.getUserAppointments(userId),
      this.getDoctors()
    ]);

    const apiKey = process.env.GEMINI_API_KEY;

    // If Gemini API Key is configured, use Gemini with grounded RAG + personal user context
    if (apiKey && apiKey.trim() !== '') {
      try {
        const userInfoContext = isLoggedIn
          ? `Authenticated User: ${user.name} (Patient ID: ${user.userId}, Email: ${user.email}).
Active Appointments in Database:
${JSON.stringify(userAppointments, null, 2)}`
          : `User is NOT logged in (Guest). If they ask about their personal bookings or history, kindly instruct them that they must log in to view their appointments.`;

        const doctorListContext = allDoctors.slice(0, 6).map(d => 
          `- ID ${d.id}: ${d.doctor_name} (${d.specialization}), ${d.qualification}, ${d.experience_years} yrs exp, Fee: ₹${d.consultation_fee}, Rating: ${d.rating}`
        ).join('\n');

        const systemPrompt = `You are HealthSync AI, a helpful, empathetic, and knowledgeable clinical and appointment scheduling assistant for the HealthSync platform.
Hospital Info:
- Working Hours: ${KNOWLEDGE_BASE.workingHours}
- Distributed Slot Locking: Uses Redis (SET NX EX 300) to hold slots for 5 minutes during booking to eliminate double-booking.
- Cancellation Policy: ${KNOWLEDGE_BASE.cancellationPolicy}
- Specializations: Cardiology, Dermatology, Neurology, Pediatrics, Orthopedics, General Medicine.
- Emergency Notice: ${KNOWLEDGE_BASE.emergencyDisclaimer}

Available Doctors in HealthSync:
${doctorListContext}

User State:
${userInfoContext}

Instructions:
1. Always be polite, professional, and concise. Format responses with clear Markdown (bullet points, bold text).
2. If the user asks about their appointments/bookings, refer directly to their real-time DB data provided above.
3. If guest asks about their bookings, explain that they should log in first.
4. When recommending doctors, recommend from the Available Doctors list and mention their fee and specialization.
5. If emergency symptoms (e.g., severe chest pain, stroke, unconsciousness) are mentioned, include the Emergency Notice.
6. Provide short, clear answers without excessive fluff.`;

        const geminiReply = await this.callGeminiApi(systemPrompt, message, apiKey);

        // Extract any relevant cards
        const cards = [];
        if (isLoggedIn && (message.toLowerCase().includes('booking') || message.toLowerCase().includes('appointment'))) {
          userAppointments.slice(0, 2).forEach(a => {
            cards.push({
              type: 'appointment',
              id: a.id,
              doctorId: a.doctor_id,
              doctorName: a.doctor_name,
              specialization: a.specialization,
              date: a.appointment_date,
              time: a.appointment_time,
              status: a.status
            });
          });
        }

        const suggestions = this.getSuggestedQuestions(isLoggedIn, user?.name);

        return {
          reply: geminiReply,
          cards,
          suggestions: suggestions.slice(0, 3),
          modelUsed: 'gemini-1.5-flash',
          isLoggedIn
        };
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to grounded engine:', geminiError.message);
        // Fall back seamlessly to grounded rule engine
      }
    }

    // Grounded fallback response
    const fallbackResult = await this.generateFallbackReply(message, user, userAppointments, allDoctors);
    return {
      reply: fallbackResult.reply,
      cards: fallbackResult.cards || [],
      suggestions: fallbackResult.suggestions || this.getSuggestedQuestions(isLoggedIn, user?.name),
      modelUsed: 'healthsync-grounded-agent',
      isLoggedIn
    };
  }
}

module.exports = new AiService();
