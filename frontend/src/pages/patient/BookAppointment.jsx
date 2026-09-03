import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorApi, appointmentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Calendar, 
  Clock, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Star, 
  ShieldCheck, 
  X,
  FileText,
  User
} from 'lucide-react';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const BookAppointment = () => {
  const { doctorId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Format YYYY-MM-DD
    return today.toISOString().split('T')[0];
  });
  const [availability, setAvailability] = useState(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [lockingSlot, setLockingSlot] = useState(null);

  // Active Lock State for Modal
  const [activeLock, setActiveLock] = useState(null); // { time, lockToken, expiresIn, date }
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reason, setReason] = useState('Routine Checkup');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Fetch Doctor info
  useEffect(() => {
    doctorApi.getById(doctorId)
      .then((res) => {
        if (res.data.success) setDoctor(res.data.data);
      })
      .catch((err) => toast.error('Failed to load doctor profile'))
      .finally(() => setLoadingDoctor(false));
  }, [doctorId]);

  // Fetch Availability for selected date
  const fetchAvailability = async (date) => {
    setLoadingSlots(true);
    try {
      const res = await doctorApi.getAvailability(doctorId, date);
      if (res.data.success) {
        setAvailability(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load doctor slot availability');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (doctorId && selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [doctorId, selectedDate]);

  // Handle Slot Selection -> Attempt Redis Lock
  const handleSelectSlot = async (slot) => {
    if (!isAuthenticated) {
      toast.warning('Please log in as a patient to reserve an appointment slot.');
      navigate('/login', { state: { from: { pathname: `/book/${doctorId}` } } });
      return;
    }

    if (slot.status === 'BOOKED') {
      toast.error('This slot is already booked and confirmed.');
      return;
    }

    if (slot.status === 'LOCKED' && !slot.isMine) {
      toast.warning('This slot is currently being held by another patient.');
      return;
    }

    setLockingSlot(slot.time);

    try {
      const res = await appointmentApi.lockSlot(doctorId, selectedDate, slot.time);
      if (res.data.success) {
        toast.success(`Slot ${slot.time} reserved for 5 minutes!`);
        setActiveLock({
          time: slot.time,
          lockToken: res.data.lockToken,
          expiresIn: res.data.expiresIn || 300,
          date: selectedDate
        });
        setBookingModalOpen(true);
        // Refresh availability to reflect lock
        fetchAvailability(selectedDate);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not acquire lock on this slot.';
      toast.error(msg);
      fetchAvailability(selectedDate);
    } finally {
      setLockingSlot(null);
    }
  };

  // Release Lock (User cancels)
  const handleCancelReservation = async () => {
    if (!activeLock) return;

    try {
      await appointmentApi.releaseLock(
        doctorId,
        activeLock.date,
        activeLock.time,
        activeLock.lockToken
      );
      toast.info('Slot reservation released.');
    } catch (err) {
      console.warn('Release error:', err);
    } finally {
      setActiveLock(null);
      setBookingModalOpen(false);
      fetchAvailability(selectedDate);
    }
  };

  // Confirm Permanent Booking (PostgreSQL Transaction)
  const handleConfirmBooking = async () => {
    if (!activeLock) return;

    setConfirming(true);
    try {
      const res = await appointmentApi.confirmBooking({
        doctorId: parseInt(doctorId, 10),
        date: activeLock.date,
        time: activeLock.time,
        lockToken: activeLock.lockToken,
        reason,
        notes
      });

      if (res.data.success) {
        toast.success('Appointment Confirmed & Saved to PostgreSQL Database!');
        setActiveLock(null);
        setBookingModalOpen(false);
        navigate('/appointments');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking confirmation failed.';
      toast.error(msg);
      fetchAvailability(selectedDate);
    } finally {
      setConfirming(false);
    }
  };

  if (loadingDoctor) return <LoadingSpinner />;
  if (!doctor) return <div className="p-8 text-center text-slate-500">Doctor not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to doctors
      </button>

      {/* Doctor Summary Header */}
      <div className="card-premium p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-emerald-500/20 flex-shrink-0">
            {doctor.doctor_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-700">{doctor.specialization_name}</span>
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {doctor.rating}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{doctor.doctor_name}</h1>
            <p className="text-xs text-slate-500">{doctor.qualification}</p>
          </div>
        </div>

        <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Consultation Fee</p>
          <p className="text-2xl font-black text-slate-900">${parseFloat(doctor.consultation_fee).toFixed(0)}</p>
        </div>
      </div>

      {/* Main Booking Interface */}
      <div className="card-premium p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Select Date & Time Slot</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Available slots are locked in Redis for 5 minutes upon selection
            </p>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field py-2 text-xs font-semibold"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-300" />
            <span className="text-slate-600 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300" />
            <span className="text-slate-600 font-medium">Temporarily Locked (Redis 5m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300" />
            <span className="text-slate-400 line-through">Booked (PostgreSQL)</span>
          </div>
        </div>

        {/* Slots Grid */}
        {loadingSlots ? (
          <LoadingSpinner text="Querying slot availability..." />
        ) : availability?.isBlocked ? (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-rose-900">Doctor Unavailable</h3>
            <p className="text-xs text-rose-700">{availability.blockReason}</p>
          </div>
        ) : availability?.isOffDay ? (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
            <Clock className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-amber-900">Non-Working Day</h3>
            <p className="text-xs text-amber-700">{availability.message}</p>
          </div>
        ) : availability?.slots?.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No slots configured for this day</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {availability.slots.map((slot) => {
              const isLockedByOther = slot.status === 'LOCKED' && !slot.isMine;
              const isBooked = slot.status === 'BOOKED';
              const isMine = slot.status === 'LOCKED' && slot.isMine;
              const isAvailable = slot.status === 'AVAILABLE';

              return (
                <button
                  key={slot.time}
                  disabled={isBooked || isLockedByOther || lockingSlot === slot.time}
                  onClick={() => handleSelectSlot(slot)}
                  className={`p-3 rounded-xl text-center text-xs font-bold transition-all relative ${
                    isBooked
                      ? 'badge-slot-booked'
                      : isLockedByOther
                      ? 'badge-slot-locked'
                      : isMine
                      ? 'badge-slot-mine'
                      : 'badge-slot-available active:scale-95'
                  }`}
                >
                  <span className="block font-mono text-sm">{slot.time}</span>

                  <span className="text-[10px] block mt-1 uppercase tracking-wider font-semibold">
                    {isBooked ? (
                      'Booked'
                    ) : isLockedByOther ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-800">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    ) : isMine ? (
                      'Your Lock'
                    ) : (
                      'Available'
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal with Countdown */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={handleCancelReservation}
        title="Confirm Appointment Reservation"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          {/* Active 5-Minute Countdown Timer */}
          {activeLock && (
            <CountdownTimer
              initialSeconds={activeLock.expiresIn || 300}
              onExpire={() => {
                toast.error('Your 5-minute slot reservation has expired. Please pick a slot again.');
                setActiveLock(null);
                setBookingModalOpen(false);
                fetchAvailability(selectedDate);
              }}
            />
          )}

          {/* Appointment Summary Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Doctor:</span>
              <strong className="text-slate-900">{doctor.doctor_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Specialization:</span>
              <span className="font-semibold text-emerald-700">{doctor.specialization_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <strong className="text-slate-900 font-mono">
                {activeLock?.date} at {activeLock?.time}
              </strong>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
              <span className="text-slate-800">Total Consultation:</span>
              <span className="text-emerald-700">${parseFloat(doctor.consultation_fee).toFixed(0)}</span>
            </div>
          </div>

          {/* Patient Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Visit</label>
              <input
                type="text"
                placeholder="e.g. Annual health checkup, Chest discomfort, Skin allergy"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Symptoms or Notes (Optional)</label>
              <textarea
                rows="2"
                placeholder="Any relevant medical history or notes for the doctor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelReservation}
              disabled={confirming}
              className="btn-secondary text-xs font-semibold"
            >
              Cancel Reservation
            </button>
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={confirming}
              className="btn-primary text-xs font-bold"
            >
              {confirming ? 'Recording in PostgreSQL...' : 'Confirm Appointment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
