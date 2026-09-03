import axios from 'axios';

// In production (Vercel), use relative '/api'. In local dev, use VITE_API_BASE_URL or '/api'
const API_BASE_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('healthsync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on 401 unauthorized if not on login/register
      const isAuthRoute = window.location.pathname.includes('/login') || window.location.pathname.includes('/register');
      if (!isAuthRoute) {
        localStorage.removeItem('healthsync_token');
        localStorage.removeItem('healthsync_user');
        // Let component / context handle redirection cleanly
      }
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIS ====================
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// ==================== DOCTORS APIS ====================
export const doctorApi = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  getAvailability: (doctorId, date) => api.get(`/doctors/${doctorId}/availability`, { params: { date } }),
  updateProfile: (id, data) => api.put(`/doctors/${id}`, data),
  getSchedules: (id) => api.get(`/doctors/${id}/schedules`),
  setSchedules: (id, schedules) => api.post(`/doctors/${id}/schedules`, { schedules }),
  addBlockedDate: (id, data) => api.post(`/doctors/${id}/blocked-dates`, data),
  removeBlockedDate: (id, date) => api.delete(`/doctors/${id}/blocked-dates/${date}`),
};

// ==================== APPOINTMENTS APIS ====================
export const appointmentApi = {
  // Core Redis Slot Lock (5 min TTL)
  lockSlot: (doctorId, date, time) => api.post('/appointments/lock', { doctorId, date, time }),
  
  // Release Lock
  releaseLock: (doctorId, date, time, lockToken) => 
    api.delete('/appointments/lock', { data: { doctorId, date, time, lockToken } }),
  
  // Permanent Booking Confirmation (PostgreSQL Transaction)
  confirmBooking: (bookingData) => api.post('/appointments', bookingData),
  
  // User appointments list
  getMy: (params) => api.get('/appointments/my', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  cancel: (id, reason) => api.patch(`/appointments/${id}/cancel`, { reason }),
  updateStatus: (id, status, notes) => api.patch(`/appointments/${id}/status`, { status, notes }),
};

// ==================== SPECIALIZATIONS APIS ====================
export const specializationApi = {
  getAll: () => api.get('/specializations'),
  create: (data) => api.post('/specializations', data),
  update: (id, data) => api.put(`/specializations/${id}`, data),
  delete: (id) => api.delete(`/specializations/${id}`),
};

// ==================== ADMIN APIS ====================
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getDoctors: () => api.get('/admin/doctors'),
  toggleDoctorApproval: (id, isApproved) => api.patch(`/admin/doctors/${id}/approve`, { isApproved }),
};

// ==================== NOTIFICATIONS APIS ====================
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ==================== DEMO / SIMULATION APIS ====================
export const demoApi = {
  simulateRaceCondition: (data) => api.post('/demo/simulate-race-condition', data),
};

export default api;
