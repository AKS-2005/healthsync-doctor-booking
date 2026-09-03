import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doctorApi, specializationApi } from '../../services/api';
import { Search, Filter, Star, Clock, HeartPulse, User, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialSpec = searchParams.get('specialization') || '';

  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [selectedSpec, setSelectedSpec] = useState(initialSpec);
  const [sortBy, setSortBy] = useState('rating');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    specializationApi.getAll()
      .then((res) => {
        if (res.data.success) setSpecializations(res.data.data);
      })
      .catch(console.error);
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await doctorApi.getAll({
        search: search || undefined,
        specialization: selectedSpec || undefined,
        limit: 30
      });
      if (res.data.success) {
        let docs = res.data.data;
        if (sortBy === 'rating') {
          docs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy === 'fee_low') {
          docs.sort((a, b) => parseFloat(a.consultation_fee) - parseFloat(b.consultation_fee));
        } else if (sortBy === 'experience') {
          docs.sort((a, b) => b.experience_years - a.experience_years);
        }
        setDoctors(docs);
      }
    } catch (err) {
      console.error('Fetch doctors error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpec, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ search, specialization: selectedSpec });
    fetchDoctors();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Find & Book Specialist Doctors</h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse verified physicians, check real-time Redis slot locks, and book instantaneous consultations.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="card-premium p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor name or qualification..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </form>

        <div className="sm:col-span-3">
          <select
            value={selectedSpec}
            onChange={(e) => setSelectedSpec(e.target.value)}
            className="input-field"
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field"
          >
            <option value="rating">Highest Rated</option>
            <option value="experience">Most Experienced</option>
            <option value="fee_low">Consultation Fee (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : doctors.length === 0 ? (
        <div className="card-premium p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Doctors Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or selecting a different medical specialization.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div key={doc.id} className="card-premium p-6 flex flex-col justify-between hover:border-emerald-500 transition-all">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-500/20">
                    {doc.doctor_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {doc.rating || '4.8'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">{doc.experience_years} yrs exp.</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    <Link to={`/doctors/${doc.id}`} className="hover:text-emerald-600">
                      {doc.doctor_name}
                    </Link>
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">{doc.specialization_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.qualification}</p>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {doc.bio}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Consultation Fee</p>
                  <p className="text-lg font-black text-slate-900">${parseFloat(doc.consultation_fee).toFixed(0)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/doctors/${doc.id}`}
                    className="btn-secondary text-xs px-3 py-2"
                  >
                    Profile
                  </Link>
                  <Link
                    to={`/book/${doc.id}`}
                    className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1"
                  >
                    Book Slot <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
