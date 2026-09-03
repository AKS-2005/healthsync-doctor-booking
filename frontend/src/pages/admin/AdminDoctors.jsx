import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Stethoscope, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Star } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminDoctors = () => {
  const toast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDoctors();
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load doctors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleToggleApproval = async (docId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const res = await adminApi.toggleDoctorApproval(docId, newStatus);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchDoctors();
      }
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Physicians & Practitioners Oversight</h1>
        <p className="text-xs text-slate-500 mt-1">Approve credentials, manage medical directory status, and audit consultation fees</p>
      </div>

      <div className="card-premium overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Qualifications</th>
                  <th className="py-3.5 px-4">Experience</th>
                  <th className="py-3.5 px-4">Fee</th>
                  <th className="py-3.5 px-4">Approval Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{doc.doctor_name}</p>
                      <p className="text-[11px] text-slate-400">{doc.email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">
                      {doc.specialization_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {doc.qualification}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {doc.experience_years} yrs
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ${parseFloat(doc.consultation_fee).toFixed(0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={doc.is_approved ? 'success' : 'danger'}>
                        {doc.is_approved ? 'Approved & Active' : 'Blocked / Pending'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleApproval(doc.id, doc.is_approved)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          doc.is_approved
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {doc.is_approved ? 'Block Access' : 'Approve Doctor'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
