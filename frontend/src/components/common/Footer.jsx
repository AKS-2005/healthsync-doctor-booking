import React from 'react';
import { HeartPulse, ShieldCheck, Database, Zap, Cpu } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Health<span className="text-emerald-400">Sync</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              High-concurrency doctor appointment scheduling engine demonstrating real-time temporary slot locking with Redis and ACID transactional reliability with PostgreSQL.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Redis Slot Lock
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                <Database className="w-3.5 h-3.5 text-sky-400" /> PostgreSQL ACID
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Level 1: Redis SET NX
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-emerald-400" /> Level 2: PG Unique Index
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Atomic Lua Release
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Sliding Rate Limiting
              </li>
            </ul>
          </div>

          {/* Demo Credentials */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Demo Credentials</h4>
            <div className="text-xs space-y-1.5 text-slate-400 font-mono">
              <p><strong className="text-slate-200">Patient:</strong> patient1@healthsync.com / patient123</p>
              <p><strong className="text-slate-200">Doctor:</strong> dr.sharma@healthsync.com / doctor123</p>
              <p><strong className="text-slate-200">Admin:</strong> admin@healthsync.com / admin123</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 HealthSync System. Built with React, Vite, Node, Express, Redis & PostgreSQL.</p>
          <p className="mt-2 sm:mt-0">5-Minute Redis TTL Slot Lock Enabled</p>
        </div>
      </div>
    </footer>
  );
};
