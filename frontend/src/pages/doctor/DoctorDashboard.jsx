import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentApi, doctorApi } from '../../services/api';
import { 
  CalendarClock, 
  Users, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ArrowRight,
  Stethoscope,
  Activity,
  DollarSign
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentApi.getMy({ limit: 20 })
      .then((res) => {
        if (res.data.success) setAppointments(res.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.appointment_date.split('T')[0] === todayStr);
  const upcomingAppointments = appointments.filter((a) => a.status === 'CONFIRMED');
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Practitioner Workspace</span>
          <h1 className="text-2xl sm:text-3xl font-black">Dr. {user?.name}</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {user?.doctorProfile?.specialization_name || 'Specialist'} | Fee: ${user?.doctorProfile?.consultation_fee || 100} / consultation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/doctor/schedule"
            className="btn-secondary text-xs px-4 py-2.5 font-bold"
          >
            Manage Schedule
          </Link>
          <Link
            to="/doctor/appointments"
            className="btn-primary text-xs px-4 py-2.5 font-bold"
          >
            View Full Queue
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Today's Queue</p>
            <p className="text-2xl font-black text-slate-900">{todayAppointments.length}</p>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Upcoming Active</p>
            <p className="text-2xl font-black text-slate-900">{upcomingAppointments.length}</p>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Completed</p>
            <p className="text-2xl font-black text-slate-900">{completedAppointments.length}</p>
          </div>
        </div>

        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Consultations</p>
            <p className="text-2xl font-black text-slate-900">{appointments.length}</p>
          </div>
        </div>
      </div>

      {/* Today's / Upcoming Appointments Table */}
      <div className="card-premium p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upcoming Patient Consultations</h2>
            <p className="text-xs text-slate-500">Live patient appointments queue</p>
          </div>
          <Link to="/doctor/appointments" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
            Manage Queue <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : appointments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No appointments scheduled</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.slice(0, 8).map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {appt.patient_name}
                      <span className="block text-[11px] font-normal text-slate-400">{appt.patient_email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      {appt.appointment_date.split('T')[0]} at {appt.appointment_time.substring(0, 5)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {appt.reason || 'General Consultation'}
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
                        to="/doctor/appointments"
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        Manage →
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
