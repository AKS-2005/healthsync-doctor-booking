import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { demoApi } from '../../services/api';
import { Zap, ShieldCheck, CheckCircle2, XCircle, ArrowRight, RefreshCw, Layers } from 'lucide-react';

export const ConcurrencySimulatorModal = ({ isOpen, onClose }) => {
  const [doctorId, setDoctorId] = useState(1);
  const [date, setDate] = useState('2026-08-27');
  const [time, setTime] = useState('10:30');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await demoApi.simulateRaceCondition({
        doctorId: parseInt(doctorId, 10),
        date,
        time,
        userAId: 101,
        userBId: 102
      });
      if (res.data.success) {
        setResult(res.data);
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Live Redis Concurrency Race Simulator" maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Architectural Explainer */}
        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-2 border border-slate-800 font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Zap className="w-4 h-4" /> LEVEL 1 RACE-CONDITION DEMONSTRATION
          </div>
          <p className="text-slate-300">
            When Patient A and Patient B click "Lock Slot" at the <strong>exact same millisecond</strong>, the backend executes atomic Redis command:
          </p>
          <div className="p-2 bg-slate-950 rounded border border-slate-800 text-emerald-400">
            <code>SET appointment_lock:doctor_{doctorId}:{date}:{time} &lt;uuid&gt; NX EX 300</code>
          </div>
          <p className="text-slate-400 text-[11px]">
            <code>NX</code> guarantees only ONE write succeeds. The loser immediately receives <code>409 Conflict</code> without hitting PostgreSQL.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor ID</label>
            <input
              type="number"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="input-field"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-field"
            >
              <option value="09:00">09:00 AM</option>
              <option value="09:30">09:30 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="10:30">10:30 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="14:00">02:00 PM</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md text-sm font-bold"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Firing Concurrent Requests to Redis...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Simulate Simultaneous Dual Lock Attempt
            </>
          )}
        </button>

        {/* Simulation Output Side-by-Side */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Winner: {result.summary.winner}
              </span>
              <span className="font-mono text-[11px] text-emerald-700">
                Duration: {result.summary.durationMs}ms
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient A Card */}
              <div
                className={`p-4 rounded-xl border ${
                  result.patientA.success
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-rose-50/70 border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-800">Patient A (User 101)</span>
                  {result.patientA.success ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" /> 200 OK Lock Won
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">
                      <XCircle className="w-3 h-3 text-rose-700" /> 409 Conflict
                    </span>
                  )}
                </div>
                <div className="text-xs space-y-1 font-mono text-slate-600">
                  <p><strong>Status:</strong> {result.patientA.status}</p>
                  <p><strong>Message:</strong> {result.patientA.message}</p>
                  {result.patientA.lockToken && (
                    <p className="truncate"><strong>Token:</strong> {result.patientA.lockToken}</p>
                  )}
                  {result.patientA.expiresIn && (
                    <p><strong>TTL:</strong> {result.patientA.expiresIn}s (5 min)</p>
                  )}
                </div>
              </div>

              {/* Patient B Card */}
              <div
                className={`p-4 rounded-xl border ${
                  result.patientB.success
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-rose-50/70 border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-800">Patient B (User 102)</span>
                  {result.patientB.success ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" /> 200 OK Lock Won
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">
                      <XCircle className="w-3 h-3 text-rose-700" /> 409 Conflict
                    </span>
                  )}
                </div>
                <div className="text-xs space-y-1 font-mono text-slate-600">
                  <p><strong>Status:</strong> {result.patientB.status}</p>
                  <p><strong>Message:</strong> {result.patientB.message}</p>
                  {result.patientB.lockToken && (
                    <p className="truncate"><strong>Token:</strong> {result.patientB.lockToken}</p>
                  )}
                  {result.patientB.expiresIn && (
                    <p><strong>TTL:</strong> {result.patientB.expiresIn}s (5 min)</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
