import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { HeartPulse, Mail, Lock, ArrowRight, User, Stethoscope, ShieldAlert } from 'lucide-react';

export const Login = () => {
  const { login, loginAsDemo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'DOCTOR') navigate('/doctor/dashboard');
      else if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else navigate(from);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    try {
      const user = await loginAsDemo(role);
      toast.success(`Logged in as ${role}`);
      if (role === 'DOCTOR') navigate('/doctor/dashboard');
      else if (role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Sign in to HealthSync</h1>
          <p className="text-xs text-slate-500">Access your appointment booking dashboard and locked slots</p>
        </div>

        {/* Quick Demo Switchers */}
        <div className="card-premium p-4 space-y-2.5 bg-slate-900 text-white border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Instant Demo Login</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDemo('PATIENT')}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white text-xs font-semibold flex flex-col items-center gap-1 transition-colors"
            >
              <User className="w-4 h-4 text-emerald-400" />
              Patient
            </button>
            <button
              onClick={() => handleQuickDemo('DOCTOR')}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-white text-xs font-semibold flex flex-col items-center gap-1 transition-colors"
            >
              <Stethoscope className="w-4 h-4 text-blue-400" />
              Doctor
            </button>
            <button
              onClick={() => handleQuickDemo('ADMIN')}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-purple-600 text-white text-xs font-semibold flex flex-col items-center gap-1 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Admin
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card-premium p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@healthsync.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-sm font-bold shadow-md shadow-emerald-500/20 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-emerald-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
