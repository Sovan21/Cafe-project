'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Mail,
  Phone,
  User,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Coffee,
} from 'lucide-react';
import { useCafe, formatTime12h, timeToMinutes, minutesToTime } from '../context/CafeContext';
import { getTodayString, getTomorrowString } from '../constants/defaultData';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import ClockTimePicker from './ClockTimePicker';
import {
  validateCustomerName,
  validateCustomerEmail,
  validateIndianPhone,
  validateGuestCount,
  validateBookingSchedule,
} from '../utils/validation';

export default function BookingModal() {
  const {
    cafeSettings,
    tables,
    isBookingModalOpen,
    setIsBookingModalOpen,
    preselectedTableId,
    setPreselectedTableId,
    activeDate,
    activeStartTime,
    activeDuration,
    activeGuestCount,
    calculateTableAvailability,
    findOptimalTable,
    fetchPublicBookedSlots,
    createBooking,
    setIsEmailCenterOpen,
  } = useCafe();

  // Wizard Step (1 to 5)
  const [step, setStep] = useState(1);

  // Form State
  const [date, setDate] = useState(activeDate);
  const [startTime, setStartTime] = useState(activeStartTime);
  const [duration, setDuration] = useState(activeDuration);
  const [guests, setGuests] = useState(activeGuestCount);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // Processing & Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Fetch live public booked slots immediately whenever customer changes the reservation date
  useEffect(() => {
    if (date && fetchPublicBookedSlots) {
      fetchPublicBookedSlots(date);
    }
  }, [date, fetchPublicBookedSlots]);

  // Sync when modal opens
  useEffect(() => {
    if (isBookingModalOpen) {
      setDate(activeDate);
      setStartTime(activeStartTime);
      setDuration(activeDuration);
      setGuests(activeGuestCount);
      setConfirmedBooking(null);
      setErrorMessage('');

      if (preselectedTableId) {
        setSelectedTableId(preselectedTableId);
        setStep(3); // Jump straight to table/guest review if user clicked a specific table
      } else {
        setStep(1);
      }
    }
  }, [isBookingModalOpen, preselectedTableId, activeDate, activeStartTime, activeDuration, activeGuestCount]);

  if (!isBookingModalOpen) return null;

  // Calculate live availability for currently configured date/time/duration/guests
  const computedAvailability = calculateTableAvailability(date, startTime, duration, guests);
  const eligibleTables = computedAvailability.filter((item) => item.isAvailable);

  const startMin = timeToMinutes(startTime);
  const endMin = startMin + duration;
  const calculatedEndTime = minutesToTime(endMin);

  const selectedTableObj = tables.find((t) => t.id === selectedTableId);

  const handleNext = () => {
    setErrorMessage('');
    if (step === 1) {
      const sched = validateBookingSchedule({
        bookingDate: date,
        startTime,
        durationMinutes: duration,
        openingTime: cafeSettings?.opening_time || '08:00',
        closingTime: cafeSettings?.closing_time || '23:00',
        cutoffBufferMinutes: 70,
      });
      if (!sched.valid) {
        setErrorMessage(sched.error);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const gCheck = validateGuestCount(guests);
      if (!gCheck.valid) {
        setErrorMessage(gCheck.error);
        return;
      }
      // Find a default table if not chosen
      if (!selectedTableId || !eligibleTables.some((t) => t.table.id === selectedTableId)) {
        if (eligibleTables.length > 0) {
          const optimal = findOptimalTable ? findOptimalTable(guests, date, startTime, duration) : eligibleTables[0]?.table;
          if (optimal) setSelectedTableId(optimal.id);
        }
      }
      setStep(3);
    } else if (step === 3) {
      if (!selectedTableId) {
        setErrorMessage('Please select a table to continue.');
        return;
      }
      const tableObj = tables.find((t) => t.id === selectedTableId);
      const capCheck = validateGuestCount(guests, tableObj?.capacity);
      if (!capCheck.valid) {
        setErrorMessage(capCheck.error);
        return;
      }
      setStep(4);
    } else if (step === 4) {
      const nameCheck = validateCustomerName(customerName);
      if (!nameCheck.valid) {
        setErrorMessage(nameCheck.error);
        return;
      }
      const emailCheck = validateCustomerEmail(customerEmail);
      if (!emailCheck.valid) {
        setErrorMessage(emailCheck.error);
        return;
      }
      const phoneCheck = validateIndianPhone(customerPhone);
      if (!phoneCheck.valid) {
        setErrorMessage(phoneCheck.error);
        return;
      }
      setStep(5);
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (step > 1) setStep(step - 1);
  };

  const handleConfirmBooking = async () => {
    if (isSubmitting) return;

    setErrorMessage('');

    // Pre-submission client-side re-validation
    const nameCheck = validateCustomerName(customerName);
    if (!nameCheck.valid) {
      setErrorMessage(nameCheck.error);
      return;
    }
    const emailCheck = validateCustomerEmail(customerEmail);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.error);
      return;
    }
    const phoneCheck = validateIndianPhone(customerPhone);
    if (!phoneCheck.valid) {
      setErrorMessage(phoneCheck.error);
      return;
    }
    const sched = validateBookingSchedule({
      bookingDate: date,
      startTime,
      durationMinutes: duration,
      openingTime: cafeSettings?.opening_time || '08:00',
      closingTime: cafeSettings?.closing_time || '23:00',
      cutoffBufferMinutes: 70,
    });
    if (!sched.valid) {
      setErrorMessage(sched.error);
      return;
    }

    setIsSubmitting(true);

    const res = await createBooking({
      table_id: selectedTableId,
      customer_name: nameCheck.value,
      customer_email: emailCheck.value,
      customer_phone: phoneCheck.value || '',
      booking_date: date,
      start_time: startTime,
      duration_minutes: duration,
      guest_count: guests,
      special_notes: specialNotes?.trim() || '',
    });

    setIsSubmitting(false);

    if (res.success) {
      setConfirmedBooking(res.booking);
    } else {
      setErrorMessage(res.error || 'Failed to complete booking.');
    }
  };

  const handleClose = () => {
    setIsBookingModalOpen(false);
    setPreselectedTableId(null);
    setConfirmedBooking(null);
    setStep(1);
  };

  const handleAutoSelectTable = () => {
    const optimal = findOptimalTable ? findOptimalTable(guests, date, startTime, duration) : eligibleTables[0]?.table;
    if (optimal) {
      setSelectedTableId(optimal.id);
      setErrorMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 overflow-y-auto">
      <div className="neu-raised w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-cafe-700/60 shadow-neu-raised overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh] animate-scale-up">
        {/* Modal Top Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-cafe-700/60 flex items-center justify-between bg-[#1a120c] flex-shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center border border-orange-500/30 text-orange-400 shadow-neu-card">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#faf6f0]">
                {confirmedBooking ? 'Reservation Confirmed' : 'Table Reservation'}
              </h3>
              <p className="text-[11px] sm:text-xs text-cafe-300">
                {confirmedBooking ? 'Your booking details and confirmation' : `Step ${step} of 5: Reservation Details`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close Reservation Wizard"
            className="p-2 rounded-xl neu-btn-secondary text-cafe-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        {!confirmedBooking && (
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 neu-tray border-b border-cafe-700/60">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-cafe-300 mb-2">
              <span className={step >= 1 ? 'text-orange-400 font-bold' : ''}><span className="hidden xs:inline">1. </span>Schedule</span>
              <span className={step >= 2 ? 'text-orange-400 font-bold' : ''}><span className="hidden xs:inline">2. </span>Guests</span>
              <span className={step >= 3 ? 'text-orange-400 font-bold' : ''}><span className="hidden xs:inline">3. </span>Table</span>
              <span className={step >= 4 ? 'text-orange-400 font-bold' : ''}><span className="hidden xs:inline">4. </span>Details</span>
              <span className={step >= 5 ? 'text-orange-400 font-bold' : ''}><span className="hidden xs:inline">5. </span>Confirm</span>
            </div>
            <div className="h-2 w-full neu-inset rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: DATE, TIME & DURATION ================= */}
          {step === 1 && !confirmedBooking && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-sm text-cafe-200">
                When would you like to dine with us?
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold-accent" /> Booking Date
                </label>
                <CustomDatePicker
                  value={date}
                  onChange={setDate}
                  min={getTodayString()}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold-accent" /> Start Time
                  </label>
                  <ClockTimePicker
                    id="booking-start-time"
                    value={startTime}
                    onChange={setStartTime}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold-accent" /> Stay Duration
                  </label>
                  <CustomSelect
                    value={duration}
                    onChange={(val) => setDuration(Number(val))}
                    options={[
                      { value: 60, label: '1 Hour (Quick catchup)' },
                      { value: 90, label: '1.5 Hours (Standard dining)' },
                      { value: 120, label: '2.0 Hours (Relaxed experience)' },
                      { value: 180, label: '3.0 Hours (Long feast)' },
                    ]}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cafe-900/60 border border-cafe-700/40 text-xs text-cafe-300 flex items-center justify-between">
                <span>Calculated Window:</span>
                <span className="font-mono text-gold-accent font-bold">
                  {formatTime12h(startTime)} – {formatTime12h(calculatedEndTime)} ({duration} mins)
                </span>
              </div>
            </div>
          )}

          {/* ================= STEP 2: GUEST COUNT ================= */}
          {step === 2 && !confirmedBooking && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-sm text-cafe-200">
                How many guests will be in your dining party?
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuests(num)}
                    className={`py-3.5 rounded-2xl text-center font-bold text-base transition-all cursor-pointer ${
                      guests === num
                        ? 'neu-gold-btn shadow-neu-gold scale-105'
                        : 'neu-btn-secondary text-cafe-200 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[#1a120c] border border-gold-accent/20">
                <div className="flex items-center gap-2 text-xs text-gold-accent font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Dedicated Table Policy</span>
                </div>
                <p className="text-xs text-cafe-300 leading-relaxed">
                  Your selected table is reserved exclusively for your party with guaranteed seating and complete dining privacy.
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 3: AVAILABLE TABLES SELECTION ================= */}
          {step === 3 && !confirmedBooking && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-cafe-300">
                    {eligibleTables.length} Tables Available for {guests} Guests
                  </span>
                  <div className="text-[11px] text-cafe-400 font-mono">
                    {date} @ {formatTime12h(startTime)}
                  </div>
                </div>

                {eligibleTables.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoSelectTable}
                    className="text-xs text-gold-accent hover:text-orange-300 flex items-center gap-1.5 font-semibold cursor-pointer bg-cafe-900/80 px-3 py-1.5 rounded-lg border border-gold-accent/30 hover:border-gold-accent transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Select Best Table</span>
                  </button>
                )}
              </div>

              {eligibleTables.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-cafe-900/60 border border-cafe-700/50">
                  <AlertCircle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-cafe-100">
                    No eligible tables available for this time slot
                  </p>
                  <p className="text-xs text-cafe-400 mt-1">
                    All matching tables are either fully reserved or exceed capacity limits. Please select an alternative time, date, or party size.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {eligibleTables.map(({ table }) => {
                    const isSelected = selectedTableId === table.id;
                    return (
                      <div
                        key={table.id}
                        onClick={() => setSelectedTableId(table.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-gold-accent/15 border-gold-accent shadow-glow'
                            : 'bg-cafe-900/60 border-cafe-700/40 hover:border-cafe-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-sm text-[#faf6f0] flex items-center gap-1.5">
                              {table.name}
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-gold-accent" />}
                            </div>
                            <span className="text-[11px] text-cafe-400 font-mono">ID: {table.id}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cafe-800 text-gold-accent border border-gold-accent/20">
                            {table.capacity} Chairs
                          </span>
                        </div>
                        <p className="text-[11px] text-cafe-300 mt-2 line-clamp-1 font-normal">
                          {table.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 4: CUSTOMER DETAILS ================= */}
          {step === 4 && !confirmedBooking && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-sm text-cafe-200">
                Please enter your contact information:
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gold-accent" /> Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arjun Sen"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-cafe-100"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gold-accent" /> Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-cafe-100"
                    required
                  />
                  <p className="text-[10px] text-cafe-400 mt-1">
                    Booking confirmation and calendar details will be sent to this address.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gold-accent" /> Indian Mobile Number (10 Digits)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-cafe-100 font-mono"
                  />
                  <p className="text-[10px] text-cafe-400 mt-1">
                    10 digits starting with 6, 7, 8, or 9 (e.g. 9876543210).
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-cafe-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-gold-accent" /> Special Requests or Occasion
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Birthday celebration, quiet table request, child seat needed..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2 text-sm text-cafe-100 resize-none"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 5: REVIEW & ATOMIC SUBMIT ================= */}
          {step === 5 && !confirmedBooking && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-sm font-semibold text-gold-accent">
                Please review your reservation details before confirming:
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-cafe-700/50 space-y-2.5 text-xs text-cafe-200">
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Assigned Table:</span>
                  <span className="font-bold text-white">{selectedTableObj?.name} (Capacity: {selectedTableObj?.capacity} Chairs)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Date:</span>
                  <span className="font-bold text-white">{date}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Time Window:</span>
                  <span className="font-mono text-gold-accent font-bold">
                    {formatTime12h(startTime)} - {formatTime12h(calculatedEndTime)} ({duration} mins)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Party Size:</span>
                  <span className="font-bold text-white">{guests} Guests</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Guest Name:</span>
                  <span className="font-bold text-white">{customerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Customer Email:</span>
                  <span className="font-bold text-white">{customerEmail}</span>
                </div>
                {customerPhone && (
                  <div className="flex justify-between py-1 border-b border-cafe-800">
                    <span className="text-cafe-400">Phone:</span>
                    <span className="font-bold text-white">{customerPhone}</span>
                  </div>
                )}
                {specialNotes && (
                  <div className="flex justify-between py-1">
                    <span className="text-cafe-400">Notes:</span>
                    <span className="italic text-cafe-300">"{specialNotes}"</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-cafe-900/60 border border-gold-accent/20 text-xs text-cafe-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-accent flex-shrink-0" />
                <span>
                  Confirming will validate table availability in real time and trigger automatic email notifications for both customer and cafe management.
                </span>
              </div>
            </div>
          )}

          {/* ================= CONFIRMATION SUCCESS VIEW ================= */}
          {confirmedBooking && (
            <div className="text-center py-6 animate-scale-up space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                  RESERVATION CONFIRMED
                </span>
                <h4 className="font-display text-2xl font-bold text-[#faf6f0] mt-1">
                  Thank you, {confirmedBooking.customer_name}!
                </h4>
                <p className="text-xs text-cafe-300 mt-1">
                  Your table reservation has been successfully confirmed and recorded.
                </p>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-gold-accent/30 text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Booking Reference:</span>
                  <span className="font-mono text-gold-accent font-bold text-sm">#{confirmedBooking.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Assigned Table:</span>
                  <span className="font-bold text-white">{confirmedBooking.table_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-cafe-800">
                  <span className="text-cafe-400">Date & Time:</span>
                  <span className="font-mono text-white">
                    {confirmedBooking.booking_date} • {formatTime12h(confirmedBooking.start_time)} - {formatTime12h(confirmedBooking.end_time)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-cafe-400">Party Size:</span>
                  <span className="font-bold text-white">{confirmedBooking.guest_count} Guests</span>
                </div>
              </div>

              {/* Email dispatch actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    setIsEmailCenterOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cafe-800 hover:bg-cafe-700 text-gold-accent border border-gold-accent/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>Inspect Dispatched Emails</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl neu-gold-btn text-xs font-bold transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Controls */}
        {!confirmedBooking && (
          <div className="px-6 py-4 border-t border-cafe-700/60 neu-tray flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="neu-btn-secondary px-4 py-2 rounded-xl text-xs font-semibold text-cafe-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 3 && eligibleTables.length === 0}
                className="neu-gold-btn px-5 py-2.5 rounded-xl text-xs font-bold shadow-neu-gold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="neu-gold-btn px-6 py-2.5 rounded-xl text-xs font-bold shadow-neu-gold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>Verifying & Confirming...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Reservation</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
