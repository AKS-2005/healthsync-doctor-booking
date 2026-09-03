import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { appointmentApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Calendar, 
  Clock, 
  User, 
  X, 
  AlertCircle, 
  FileText, 
  DollarSign, 
  CheckCircle2,
  Plus
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const MyAppointments = () => {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Cancel modal state
  const [selectedToCancel, setSelectedToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.getMy({ limit: 50 });
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedToCancel) return;

    setCancelling(true);
    try {
      const res = await appointmentApi.cancel(selectedToCancel.id, cancelReason);
      if (res.data.success) {
        toast.success('Appointment cancelled successfully');
        setSelectedToCancel(null);
        setCancelReason('');
        fetchAppointments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  const filtered = appointments.filter((a) => {
    if (activeTab === 'ALL') return true;
    return a.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Consultations</h1>
          <p className="text-sm text-slate-500 mt-1">Review scheduled visits, clinical notes, and booking receipts</p>
        </div>

        <Link to="/doctors" className="btn-primary text-xs flex items-center gap-1.5 self-start">
          <Plus className="w-4 h-4" /> Book New Slot
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
        {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === tab
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL' ? 'All Appointments' : tab}
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <div className="card-premium p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No {activeTab.toLowerCase()} appointments</h3>
          <p className="text-xs text-slate-500">You don't have any appointments matching this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((appt) => (
            <div key={appt.id} className="card-premium p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{appt.doctor_name}</h3>
                    <p className="text-xs font-semibold text-emerald-700">{appt.specialization_name}</p>
                    <p className="text-xs text-slate-500">{appt.qualification}</p>
                  </div>
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
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">{appt.appointment_date.split('T')[0]}</span>
                    <span className="text-slate-400">|</span>
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono font-semibold">{appt.appointment_time.substring(0, 5)}</span>
                  </div>
                  <p className="text-slate-600 pt-1">
                    <strong className="text-slate-800">Reason:</strong> {appt.reason || 'General Consultation'}
                  </p>
                  {appt.notes && (
                    <p className="text-slate-600">
                      <strong className="text-slate-800">Clinical Notes:</strong> {appt.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs font-mono font-bold text-slate-700">
                  Fee: ${parseFloat(appt.consultation_fee || 75).toFixed(0)}
                </span>

                {appt.status === 'CONFIRMED' && (
                  <button
                    onClick={() => setSelectedToCancel(appt)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!selectedToCancel}
        onClose={() => setSelectedToCancel(null)}
        title="Cancel Appointment"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to cancel your consultation with{' '}
            <strong>{selectedToCancel?.doctor_name}</strong> on{' '}
            <strong>{selectedToCancel?.appointment_date?.split('T')[0]}</strong> at{' '}
            <strong>{selectedToCancel?.appointment_time?.substring(0, 5)}</strong>?
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for cancellation</label>
            <textarea
              required
              rows="3"
              placeholder="e.g. Schedule conflict, feeling better, rescheduling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedToCancel(null)}
              className="btn-secondary text-xs"
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="btn-danger text-xs font-bold"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
