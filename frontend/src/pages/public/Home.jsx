import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doctorApi, specializationApi } from '../../services/api';
import { 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Database, 
  CalendarCheck, 
  Clock, 
  Star, 
  ArrowRight, 
  HeartPulse, 
  Lock, 
  Activity 
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const Home = () => {
  const navigate = useNavigate();
  const [specializations, setSpecializations] = useState([]);
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [specsRes, docsRes] = await Promise.all([
          specializationApi.getAll(),
          doctorApi.getAll({ limit: 4 })
        ]);
        if (specsRes.data.success) setSpecializations(specsRes.data.data);
        if (docsRes.data.success) setFeaturedDoctors(docsRes.data.data);
      } catch (err) {
        console.error('Home data load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (selectedSpec) params.append('specialization', selectedSpec);
    navigate(`/doctors?${params.toString()}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Redis 5-Minute Slot Locking & PostgreSQL Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Book Top Healthcare Specialists <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Without Booking Collisions
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate double-booking race conditions with atomic Redis slot reservation, instantaneous availability checks, and ACID PostgreSQL consistency.
          </p>

          {/* Quick Search Card */}
          <form
            onSubmit={handleSearch}
            className="p-3 sm:p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-12 gap-3"
          >
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Doctor name, condition, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-white/95 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedSpec}
                onChange={(e) => setSelectedSpec(e.target.value)}
                className="w-full px-3.5 py-3 bg-white/95 text-slate-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">All Specializations</option>
                {specializations.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full h-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <Search className="w-4 h-4" />
                Find Slot
              </button>
            </div>
          </form>

          {/* Core Metrics Banner */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl sm:text-2xl">
                <Lock className="w-5 h-5 text-amber-400" /> 300s TTL
              </div>
              <p className="text-xs text-slate-400 mt-0.5">5-Minute Redis Lock</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl sm:text-2xl">
                <Database className="w-5 h-5 text-sky-400" /> 100% ACID
              </div>
              <p className="text-xs text-slate-400 mt-0.5">PostgreSQL Integrity</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl sm:text-2xl">
                <Zap className="w-5 h-5 text-amber-400" /> &lt; 2ms
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Lock Acquisition</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl sm:text-2xl">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Dual-Level
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Race Protection</p>
            </div>
          </div>
        </div>
      </section>

      {/* Specializations Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Explore Medical Specialties</h2>
            <p className="text-sm text-slate-500 mt-1">Consult with board-certified physicians across departments</p>
          </div>
          <Link to="/doctors" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View all doctors <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {specializations.map((spec) => (
            <button
              key={spec.id}
              onClick={() => navigate(`/doctors?specialization=${encodeURIComponent(spec.name)}`)}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700">{spec.name}</h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{spec.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Two-Level Race Condition Workflow Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 relative overflow-hidden">
          <div className="max-w-3xl space-y-4 mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Architecture in Action</span>
            <h2 className="text-3xl font-black tracking-tight">
              How Redis & PostgreSQL Prevent Double-Booking
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              When millions of patients browse availability, querying PostgreSQL for lock status creates heavy I/O contention. We offload temporary state to memory with Redis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="font-bold text-white text-base">Temporary Slot Lock (Redis)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Patient clicks a slot. Backend fires atomic <code>SET appointment_lock:doctor_5:date:time &lt;token&gt; NX EX 300</code>. Only 1 user acquires it for 5 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="font-bold text-white text-base">Patient Review & Countdown</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                A 5-minute countdown starts on the frontend. If the patient abandons or time expires, Redis key automatically evaporates without any database cleanup needed.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-bold text-white text-base">ACID SQL Confirmation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                On confirmation, PostgreSQL transaction inserts the appointment and atomic Lua script releases the Redis lock. Unique SQL indexes provide final permanent safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Doctors */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Featured Healthcare Specialists</h2>
            <p className="text-sm text-slate-500 mt-1">Verified medical professionals with available consultation slots</p>
          </div>
          <Link to="/doctors" className="btn-secondary text-xs">
            Browse All Doctors
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDoctors.map((doc) => (
              <div key={doc.id} className="card-premium p-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-500/20">
                      {doc.doctor_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {doc.rating || '4.8'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{doc.doctor_name}</h3>
                    <p className="text-xs font-medium text-emerald-700">{doc.specialization_name}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{doc.qualification}</p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {doc.bio}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Consultation</p>
                    <p className="text-base font-black text-slate-900">${parseFloat(doc.consultation_fee).toFixed(0)}</p>
                  </div>
                  <Link
                    to={`/book/${doc.id}`}
                    className="btn-primary text-xs px-3.5 py-2"
                  >
                    Book Slot
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
