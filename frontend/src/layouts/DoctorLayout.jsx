import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  HeartPulse, 
  LayoutDashboard, 
  CalendarClock, 
  Clock, 
  UserCircle, 
  LogOut, 
  Zap, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { ConcurrencySimulatorModal } from '../components/concurrency/ConcurrencySimulatorModal';

export const DoctorLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.info('Logged out from Doctor Portal');
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
    { label: 'Appointments Queue', path: '/doctor/appointments', icon: CalendarClock },
    { label: 'Working Schedules', path: '/doctor/schedule', icon: Clock },
    { label: 'Doctor Profile', path: '/doctor/profile', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800">
        {/* Brand */}
        <div className="p-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black text-white">HealthSync</span>
              <span className="text-[10px] block font-bold text-emerald-400 uppercase tracking-widest">
                Doctor Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Doctor Info Card */}
        <div className="p-4 mx-4 my-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm font-bold text-white truncate">{user?.name}</p>
          <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            {user?.doctorProfile?.specialization_name || 'Practitioner'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <button
              onClick={() => setSimulatorOpen(true)}
              className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-400 hover:bg-amber-950/40 border border-amber-500/30 transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Redis Race Simulator</span>
            </button>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Doctor Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-800 capitalize">
              {location.pathname.split('/').pop().replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-emerald-600 font-semibold hover:underline">
              ← Return to Main Site
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>

      <ConcurrencySimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </div>
  );
};
