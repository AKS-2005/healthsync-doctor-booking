import React, { useState, useEffect } from 'react';
import { appointmentApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Search,
  Filter
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorAppointments = () => {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Status Action Modal State
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [newStatus, setNewStatus] = useState('COMPLETED');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.getMy({ limit: 100 });
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load doctor appointments queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const openStatusModal = (appt, status) => {
    setSelectedAppt(appt);
    setNewStatus(status);
    setClinicalNotes(appt.notes || '');
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAppt) return;

    setUpdating(true);
    try {
      const res = await appointmentApi.updateStatus(
        selectedAppt.id,
        newStatus,
        clinicalNotes
      );
      if (res.data.success) {
        toast.success(`Appointment marked as ${newStatus}`);
        setSelectedAppt(null);
        fetchAppointments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = appointments.filter((a) => {
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchSearch =
      !search ||
      a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.reason && a.reason.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Appointments Queue Management</h1>
        <p className="text-xs text-slate-500 mt-1">Review scheduled patient visits and log clinical evaluations</p>
      </div>

      {/* Filter Bar */}
      <div className="card-premium p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient name or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-xs"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED (Active)</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="NO_SHOW">NO_SHOW</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No appointments matching filters</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Reason for Visit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Clinical Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{appt.patient_name}</p>
                      <p className="text-[11px] text-slate-400">{appt.patient_phone || appt.patient_email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      {appt.appointment_date.split('T')[0]} at {appt.appointment_time.substring(0, 5)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                      {appt.reason || 'General Consultation'}
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {appt.notes || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {appt.status === 'CONFIRMED' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openStatusModal(appt, 'COMPLETED')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 transition-colors"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => openStatusModal(appt, 'NO_SHOW')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg border border-amber-200 transition-colors"
                          >
                            No-Show
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openStatusModal(appt, appt.status)}
                          className="text-[11px] text-slate-500 hover:underline"
                        >
                          Edit Notes
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action / Clinical Notes Modal */}
      <Modal
        isOpen={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
        title={`Update Appointment #${selectedAppt?.id}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
            <p><strong>Patient:</strong> {selectedAppt?.patient_name}</p>
            <p><strong>Date & Time:</strong> {selectedAppt?.appointment_date?.split('T')[0]} at {selectedAppt?.appointment_time?.substring(0, 5)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="input-field text-xs font-semibold"
            >
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED (Consultation Finished)</option>
              <option value="NO_SHOW">NO_SHOW (Patient did not arrive)</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Notes & Diagnosis</label>
            <textarea
              rows="3"
              placeholder="Enter prescription, treatment details, advice, or follow-up notes..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedAppt(null)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="btn-primary text-xs font-bold"
            >
              {updating ? 'Saving...' : 'Save & Update'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
