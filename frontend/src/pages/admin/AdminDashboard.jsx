import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { 
  Users, 
  Stethoscope, 
  CalendarCheck, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  TrendingUp, 
  ShieldAlert,
  Activity,
  Zap
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then((res) => {
        if (res.data.success) setStats(res.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <div className="p-8 text-center text-slate-500">Failed to load statistics</div>;

  const { metrics, statusBreakdown, specializationBreakdown, recentAppointments } = stats;

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 p-8 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-purple-900/40">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">System Oversight</span>
          <h1 className="text-2xl sm:text-3xl font-black">Platform Command Center</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitoring PostgreSQL relational data integrity & Redis high-concurrency slot lock performance.
          </p>
        </div>

        <div className="p-3 bg-purple-900/50 border border-purple-500/30 rounded-2xl flex items-center gap-3">
          <Zap className="w-6 h-6 text-amber-400" />
          <div className="text-xs">
            <p className="font-bold text-white">Redis Slot Lock Engine</p>
            <p className="text-emerald-400 font-mono text-[11px]">ACTIVE (5-min TTL)</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-premium p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patients</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalPatients}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Doctors</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalDoctors}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalAppointments}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.todayAppointments}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
          <p className="text-2xl font-black text-teal-600 mt-1">{metrics.completedAppointments}</p>
        </div>
        <div className="card-premium p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cancelled</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{metrics.cancelledAppointments}</p>
        </div>
      </div>

      {/* Analytics Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appointments by Status */}
        <div className="card-premium p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Appointments by Status Distribution</h2>
          <div className="space-y-3">
            {statusBreakdown.map((item) => {
              const count = parseInt(item.count, 10);
              const percent = metrics.totalAppointments > 0 ? Math.round((count / metrics.totalAppointments) * 100) : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.status}</span>
                    <span className="text-slate-500 font-mono">{count} ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-500'
                          : item.status === 'COMPLETED'
                          ? 'bg-teal-500'
                          : item.status === 'CANCELLED'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Specializations */}
        <div className="card-premium p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Top Specializations by Demand</h2>
          <div className="space-y-3">
            {specializationBreakdown.map((item) => {
              const count = parseInt(item.count, 10);
              return (
                <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                  <span className="font-bold text-slate-800">{item.name}</span>
                  <span className="font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                    {count} bookings
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent System Activity Table */}
      <div className="card-premium p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Recent Platform Appointments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Specialization</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAppointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-400">#{appt.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{appt.patient_name}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{appt.doctor_name}</td>
                  <td className="py-3 px-4 text-slate-600">{appt.specialization_name}</td>
                  <td className="py-3 px-4 font-mono">
                    {appt.appointment_date.split('T')[0]} at {appt.appointment_time.substring(0, 5)}
                  </td>
                  <td className="py-3 px-4">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
