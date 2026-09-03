import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { notificationApi } from '../../services/api';
import { 
  HeartPulse, 
  Calendar, 
  User, 
  LogOut, 
  ShieldAlert, 
  Stethoscope, 
  Bell, 
  Zap, 
  Menu, 
  X,
  ChevronDown
} from 'lucide-react';

export const Navbar = ({ onOpenSimulator }) => {
  const { user, isAuthenticated, logout, loginAsDemo, isPatient, isDoctor, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);

  // Fetch unread notifications if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      notificationApi.getAll()
        .then((res) => {
          if (res.data.success) {
            setNotifications(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  const handleDemoLogin = async (role) => {
    try {
      await loginAsDemo(role);
      toast.success(`Logged in as Demo ${role}`);
      setShowDemoDropdown(false);
      if (role === 'DOCTOR') navigate('/doctor/dashboard');
      else if (role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Demo login failed');
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('Logged out successfully');
    navigate('/');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1">
                Health<span className="text-emerald-600">Sync</span>
              </span>
              <span className="text-[10px] block font-semibold text-slate-400 uppercase tracking-widest -mt-1">
                Redis + SQL System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              to="/doctors"
              className={`transition-colors hover:text-emerald-600 ${
                location.pathname.startsWith('/doctors') ? 'text-emerald-600 font-semibold' : 'text-slate-600'
              }`}
            >
              Find Doctors
            </Link>

            {/* Interactive Redis Concurrency Simulator Modal Button */}
            <button
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors text-xs font-bold"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
              Redis Race Sim
            </button>

            {isAuthenticated && isPatient && (
              <>
                <Link
                  to="/dashboard"
                  className={`transition-colors hover:text-emerald-600 ${
                    location.pathname === '/dashboard' ? 'text-emerald-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/appointments"
                  className={`transition-colors hover:text-emerald-600 ${
                    location.pathname === '/appointments' ? 'text-emerald-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  My Appointments
                </Link>
              </>
            )}

            {isAuthenticated && isDoctor && (
              <>
                <Link
                  to="/doctor/dashboard"
                  className={`transition-colors hover:text-emerald-600 ${
                    location.pathname === '/doctor/dashboard' ? 'text-emerald-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  Doctor Portal
                </Link>
                <Link
                  to="/doctor/schedule"
                  className={`transition-colors hover:text-emerald-600 ${
                    location.pathname === '/doctor/schedule' ? 'text-emerald-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  Manage Schedule
                </Link>
              </>
            )}

            {isAuthenticated && isAdmin && (
              <Link
                to="/admin/dashboard"
                className={`transition-colors hover:text-emerald-600 ${
                  location.pathname.startsWith('/admin') ? 'text-emerald-600 font-semibold' : 'text-slate-600'
                }`}
              >
                Admin Control
              </Link>
            )}
          </nav>

          {/* Right Header Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDemoDropdown(!showDemoDropdown)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
              >
                <span>Demo Switcher</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showDemoDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in text-xs font-medium">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Test Account
                  </div>
                  <button
                    onClick={() => handleDemoLogin('PATIENT')}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Patient (Jane Smith)
                  </button>
                  <button
                    onClick={() => handleDemoLogin('DOCTOR')}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 flex items-center gap-2"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                    Doctor (Dr. Sharma)
                  </button>
                  <button
                    onClick={() => handleDemoLogin('ADMIN')}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 flex items-center gap-2"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                    System Admin
                  </button>
                </div>
              )}
            </div>

            {/* Notifications Dropdown if Authenticated */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800">Notifications</span>
                      <span className="text-[10px] text-slate-400">{notifications.length} total</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto py-2 space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No notifications yet</p>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div key={n.id} className="p-2 rounded-lg bg-slate-50 text-xs border border-slate-100">
                            <p className="font-semibold text-slate-800">{n.title}</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</p>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-xs px-3.5 py-2">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary text-xs px-3.5 py-2">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/doctors"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700"
          >
            Find Doctors
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenSimulator();
            }}
            className="w-full text-left py-2 text-sm font-semibold text-amber-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Redis Concurrency Simulator
          </button>
          {isAuthenticated ? (
            <>
              {isPatient && (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">
                    Dashboard
                  </Link>
                  <Link to="/appointments" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">
                    My Appointments
                  </Link>
                </>
              )}
              {isDoctor && (
                <Link to="/doctor/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">
                  Doctor Portal
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-700">
                  Admin Control
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left py-2 text-sm font-medium text-rose-600"
              >
                Log Out ({user?.name})
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary text-xs text-center py-2">
                Log In
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-xs text-center py-2">
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
