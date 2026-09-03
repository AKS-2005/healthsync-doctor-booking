import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doctorApi } from '../../services/api';
import { 
  Star, 
  Calendar, 
  Clock, 
  Award, 
  DollarSign, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  MapPin,
  HeartPulse
} from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorDetail = () => {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorApi.getById(id)
      .then((res) => {
        if (res.data.success) setDoctor(res.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!doctor) return <div className="p-8 text-center text-slate-500">Doctor not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner Card */}
      <div className="card-premium p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-3 flex justify-center">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-emerald-500/20">
            {doctor.doctor_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
        </div>

        <div className="md:col-span-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              {doctor.specialization_name}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {doctor.rating} Rating
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{doctor.doctor_name}</h1>
          <p className="text-xs text-slate-500 font-medium">{doctor.qualification}</p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>{doctor.experience_years} Years Clinical Experience</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Medical License</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-3">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Consultation Fee</p>
            <p className="text-2xl font-black text-slate-900">${parseFloat(doctor.consultation_fee).toFixed(0)}</p>
          </div>
          <Link
            to={`/book/${doctor.id}`}
            className="w-full btn-primary py-2.5 text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
          >
            Book Appointment <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Two Columns: Bio & Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Bio & Specialization Description */}
        <div className="md:col-span-2 space-y-6">
          <div className="card-premium p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900">About the Physician</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {doctor.bio}
            </p>
          </div>

          <div className="card-premium p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Department: {doctor.specialization_name}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {doctor.specialization_description || 'Specialized clinical healthcare services and evaluations.'}
            </p>
          </div>
        </div>

        {/* Right: Working Hours Schedule */}
        <div className="space-y-6">
          <div className="card-premium p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Working Hours
            </h2>

            <div className="space-y-2 text-xs">
              {doctor.schedules && doctor.schedules.length > 0 ? (
                doctor.schedules.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-700 capitalize">{s.day_of_week.toLowerCase()}</span>
                    <span className="font-mono text-slate-500">
                      {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 py-2">Monday to Friday 09:00 - 17:00</p>
              )}
            </div>

            <Link
              to={`/book/${doctor.id}`}
              className="w-full btn-primary py-2.5 text-xs font-bold mt-4 flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" /> Select Date & Slot
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
