import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { doctorApi, specializationApi } from '../../services/api';
import { User, Award, DollarSign, FileText, Check } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorProfile = () => {
  const { user } = useAuth();
  const toast = useToast();
  const doctorId = user?.doctorProfile?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [specializations, setSpecializations] = useState([]);

  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState(5);
  const [consultationFee, setConsultationFee] = useState(100);
  const [bio, setBio] = useState('');
  const [specializationId, setSpecializationId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!doctorId) return;
      try {
        const [specRes, docRes] = await Promise.all([
          specializationApi.getAll(),
          doctorApi.getById(doctorId)
        ]);

        if (specRes.data.success) setSpecializations(specRes.data.data);
        if (docRes.data.success) {
          const d = docRes.data.data;
          setQualification(d.qualification || '');
          setExperienceYears(d.experience_years || 5);
          setConsultationFee(parseFloat(d.consultation_fee) || 100);
          setBio(d.bio || '');
          setSpecializationId(d.specialization_id || '');
        }
      } catch (err) {
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [doctorId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await doctorApi.updateProfile(doctorId, {
        qualification,
        experienceYears: parseInt(experienceYears, 10),
        consultationFee: parseFloat(consultationFee),
        bio,
        specializationId: parseInt(specializationId, 10)
      });
      if (res.data.success) {
        toast.success('Doctor profile updated and Redis cache refreshed!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Physician Profile Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Update qualifications, fees, and public biography
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-premium p-6 sm:p-8 space-y-6">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
          <p className="font-semibold">Note on Redis Caching:</p>
          <p className="text-emerald-800 text-[11px] mt-0.5">
            Updating your profile details automatically invalidates the corresponding Redis cache key (<code>cache:doctor:{doctorId}</code>) ensuring instant consistency for all patients.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Specialization</label>
            <select
              value={specializationId}
              onChange={(e) => setSpecializationId(e.target.value)}
              className="input-field text-xs"
            >
              {specializations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Medical Qualifications</label>
            <input
              type="text"
              required
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              className="input-field text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Years of Experience</label>
            <input
              type="number"
              min="0"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Consultation Fee ($)</label>
            <input
              type="number"
              min="1"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              className="input-field text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Professional Biography</label>
          <textarea
            rows="5"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input-field text-xs leading-relaxed"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs font-bold px-6 py-2.5 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Updating...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
