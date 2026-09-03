import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { doctorApi } from '../../services/api';
import { Clock, Calendar, Plus, Trash2, ShieldCheck, Check } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const DoctorSchedule = () => {
  const { user } = useAuth();
  const toast = useToast();
  const doctorId = user?.doctorProfile?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  // New blocked date state
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  const fetchScheduleData = async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const [schedRes, docRes] = await Promise.all([
        doctorApi.getSchedules(doctorId),
        doctorApi.getById(doctorId)
      ]);

      if (schedRes.data.success) {
        // Initialize day schedules
        const existingMap = new Map(schedRes.data.data.map((s) => [s.day_of_week, s]));
        const fullSchedules = DAYS.map((day) => {
          if (existingMap.has(day)) {
            const item = existingMap.get(day);
            return {
              day_of_week: day,
              start_time: item.start_time.substring(0, 5),
              end_time: item.end_time.substring(0, 5),
              slot_duration: item.slot_duration || 30,
              is_active: item.is_active !== false,
            };
          }
          return {
            day_of_week: day,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration: 30,
            is_active: ['SATURDAY', 'SUNDAY'].includes(day) ? false : true,
          };
        });
        setSchedules(fullSchedules);
      }

      if (docRes.data.success && docRes.data.data.blockedDates) {
        setBlockedDates(docRes.data.data.blockedDates);
      }
    } catch (err) {
      toast.error('Failed to load schedule information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [doctorId]);

  const handleToggleDay = (index) => {
    setSchedules((prev) => {
      const updated = [...prev];
      updated[index].is_active = !updated[index].is_active;
      return updated;
    });
  };

  const handleFieldChange = (index, field, value) => {
    setSchedules((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleSaveSchedules = async () => {
    setSaving(true);
    try {
      const activeOnly = schedules.filter((s) => s.is_active);
      const res = await doctorApi.setSchedules(doctorId, activeOnly);
      if (res.data.success) {
        toast.success('Working schedules saved successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update schedules');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlockedDate = async (e) => {
    e.preventDefault();
    if (!newBlockDate) return;

    try {
      const res = await doctorApi.addBlockedDate(doctorId, {
        date: newBlockDate,
        reason: newBlockReason || 'Doctor vacation / personal emergency'
      });
      if (res.data.success) {
        toast.success(`Date ${newBlockDate} blocked from booking.`);
        setNewBlockDate('');
        setNewBlockReason('');
        fetchScheduleData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block date');
    }
  };

  const handleRemoveBlockedDate = async (dateStr) => {
    try {
      const formattedDate = dateStr.split('T')[0];
      const res = await doctorApi.removeBlockedDate(doctorId, formattedDate);
      if (res.data.success) {
        toast.info(`Date ${formattedDate} is now available.`);
        fetchScheduleData();
      }
    } catch (err) {
      toast.error('Failed to unblock date');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Working Hours & Schedule Setup</h1>
        <p className="text-xs text-slate-500 mt-1">Configure consultation hours and block out vacations</p>
      </div>

      {/* Weekly Schedule Setup */}
      <div className="card-premium p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Weekly Working Days</h2>
            <p className="text-xs text-slate-500">Toggle active days and configure custom time slots</p>
          </div>
          <button
            onClick={handleSaveSchedules}
            disabled={saving}
            className="btn-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Schedule Changes'}
          </button>
        </div>

        <div className="space-y-3">
          {schedules.map((item, idx) => (
            <div
              key={item.day_of_week}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.is_active ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`day-${item.day_of_week}`}
                  checked={item.is_active}
                  onChange={() => handleToggleDay(idx)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label
                  htmlFor={`day-${item.day_of_week}`}
                  className="text-xs font-bold text-slate-800 capitalize cursor-pointer w-28"
                >
                  {item.day_of_week.toLowerCase()}
                </label>
              </div>

              {item.is_active ? (
                <div className="grid grid-cols-3 gap-3 flex-1 max-w-md">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Start Time</label>
                    <input
                      type="time"
                      value={item.start_time}
                      onChange={(e) => handleFieldChange(idx, 'start_time', e.target.value)}
                      className="input-field text-xs font-mono py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">End Time</label>
                    <input
                      type="time"
                      value={item.end_time}
                      onChange={(e) => handleFieldChange(idx, 'end_time', e.target.value)}
                      className="input-field text-xs font-mono py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Duration</label>
                    <select
                      value={item.slot_duration}
                      onChange={(e) => handleFieldChange(idx, 'slot_duration', parseInt(e.target.value, 10))}
                      className="input-field text-xs py-1.5"
                    >
                      <option value={15}>15 mins</option>
                      <option value={20}>20 mins</option>
                      <option value={30}>30 mins</option>
                      <option value={45}>45 mins</option>
                      <option value={60}>60 mins</option>
                    </select>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Day Off (No Appointments)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Block Specific Calendar Dates */}
      <div className="card-premium p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Block Specific Vacation / Unavailable Dates</h2>
          <p className="text-xs text-slate-500 mt-0.5">Prevent patients from reserving any slots on specific days</p>
        </div>

        <form onSubmit={handleAddBlockedDate} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
              className="input-field text-xs py-2"
            />
          </div>
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Reason (e.g. Annual Medical Conference, Vacation)"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
              className="input-field text-xs py-2"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full btn-secondary text-xs py-2 font-bold flex items-center justify-center gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <Plus className="w-3.5 h-3.5" /> Block Date
            </button>
          </div>
        </form>

        {/* Existing Blocked Dates */}
        <div className="space-y-2 pt-2">
          {blockedDates.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No blocked dates scheduled.</p>
          ) : (
            blockedDates.map((b, i) => (
              <div
                key={i}
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <strong className="text-rose-900 font-mono">{String(b.blocked_date).split('T')[0]}</strong>
                  <span className="text-rose-700 ml-2">({b.reason})</span>
                </div>
                <button
                  onClick={() => handleRemoveBlockedDate(b.blocked_date)}
                  className="text-rose-600 hover:text-rose-800 p-1"
                  title="Unblock date"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
