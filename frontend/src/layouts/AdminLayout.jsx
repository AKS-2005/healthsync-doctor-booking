import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  HeartPulse, 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  BookmarkCheck, 
  Layers, 
  LogOut, 
  Zap, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { ConcurrencySimulatorModal } from '../components/concurrency/ConcurrencySimulatorModal';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.info('Logged out from Admin Portal');
    navigate('/');
  };

  const navItems = [
    { label: 'System Analytics', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Manage Doctors', path: '/admin/doctors', icon: Stethoscope },
    { label: 'Manage Users', path: '/admin/users', icon: Users },
    { label: 'Specializations', path: '/admin/specializations', icon: Layers },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black text-white">HealthSync</span>
              <span className="text-[10px] block font-bold text-purple-400 uppercase tracking-widest">
                Admin Panel
              </span>
            </div>
          </Link>
        </div>

        <div className="p-4 mx-4 my-4 rounded-xl bg-slate-900 border border-purple-900/40">
          <p className="text-xs text-purple-300 font-semibold">Administrator</p>
          <p className="text-sm font-bold text-white truncate">{user?.name || 'System Admin'}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user?.email}</p>
        </div>

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
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Administration</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-800 capitalize">
              {location.pathname.split('/').pop().replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-purple-600 font-semibold hover:underline">
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
