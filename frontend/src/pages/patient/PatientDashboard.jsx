import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentApi, doctorApi } from '../../services/api';
import { 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Search, 
  Plus, 
  Star,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentApi.getMy({ limit: 5 })
      .then((res) => {
        if (res.data.success) {
          setAppointments(res.data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcomingCount = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Patient Health Portal</span>
          <h1 className="text-2xl sm:text-3xl font-black">Welcome, {user?.name}!</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Manage your doctor consultations, track upcoming appointments, and book new slots with zero double-booking collisions.
          </p>
        </div>

        <Link
          to="/doctors"
          className="btn-primary bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Book New Appointment
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Upcoming Consultations</p>
            <p className="text-2xl font-black text-slate-900">{upcomingCount}</p>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Completed Visits</p>
            <p className="text-2xl font-black text-slate-900">{completedCount}</p>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Cancelled</p>
            <p className="text-2xl font-black text-slate-900">{cancelledCount}</p>
          </div>
        </div>
      </div>

      {/* Recent Appointments List */}
      <div className="card-premium p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Appointments</h2>
            <p className="text-xs text-slate-500">Your scheduled and past consultations</p>
          </div>
          <Link to="/appointments" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No appointments scheduled yet</p>
            <Link to="/doctors" className="btn-primary text-xs px-4 py-2">
              Browse Doctors & Book Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {appt.doctor_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {appt.specialization_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {appt.appointment_date.split('T')[0]} at {appt.appointment_time.substring(0, 5)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          appt.status === 'CONFIRMED'
                            ? 'primary'
                            : appt.status === 'COMPLETED'
                            ? 'success'
                            : appt.status === 'CANCELLED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {appt.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to="/appointments"
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
