'use client';

import React from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Radio,
} from 'lucide-react';
import { useCafe, formatTime12h, timeToMinutes, minutesToTime } from '../context/CafeContext';
import { getTodayString, getTomorrowString } from '../constants/defaultData';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import ClockTimePicker from './ClockTimePicker';

export default function LiveTableMap() {
  const {
    cafeSettings,
    activeDate,
    setActiveDate,
    activeStartTime,
    setActiveStartTime,
    activeDuration,
    setActiveDuration,
    activeGuestCount,
    setActiveGuestCount,
    currentTableAvailability,
    openBookingForTable,
  } = useCafe();

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  const startMin = timeToMinutes(activeStartTime);
  const endMin = startMin + activeDuration;
  const activeEndTime = minutesToTime(endMin);

  // Availability stats
  const totalTables = currentTableAvailability.length;
  const availableCount = currentTableAvailability.filter((item) => item.isAvailable).length;
  const reservedCount = currentTableAvailability.filter((item) => item.isReserved).length;
  const maintenanceCount = currentTableAvailability.filter((item) => item.isMaintenance).length;

  // Prioritize available tables first so customers immediately see matching options without hunting
  const displayTables = React.useMemo(() => {
    return [...currentTableAvailability].sort((a, b) => {
      // 1. Available tables come first
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      // 2. Active before maintenance
      if (!a.isMaintenance && b.isMaintenance) return -1;
      if (a.isMaintenance && !b.isMaintenance) return 1;
      // 3. By table id order
      return a.table.id.localeCompare(b.table.id);
    });
  }, [currentTableAvailability]);

  return (
    <section id="availability-map" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      {/* Section Header - Clean Typography without Pill Badge */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <h2 className="font-display text-2xl xs:text-3xl sm:text-5xl font-bold text-[#faf6f0] tracking-tight">
          Table Availability & Seating
        </h2>
        <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-cafe-200 font-normal leading-relaxed">
          Select your date, time, and party size to find an available table.
        </p>
      </div>

      {/* Control Filter Bar */}
      <div className="neu-raised p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-cafe-700/60 shadow-neu-raised mb-8 sm:mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Date with Quick Toggle */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-cafe-200 flex items-center justify-between mb-2">
              <span>Select Date</span>
              <div className="flex gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveDate(todayStr)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeDate === todayStr ? 'neu-gold-btn' : 'neu-btn-secondary text-cafe-300 hover:text-white'}`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDate(tomorrowStr)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeDate === tomorrowStr ? 'neu-gold-btn' : 'neu-btn-secondary text-cafe-300 hover:text-white'}`}
                >
                  Tomorrow
                </button>
              </div>
            </label>
            <CustomDatePicker
              value={activeDate}
              onChange={setActiveDate}
              min={todayStr}
            />
          </div>

          {/* 2. Start Time */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-cafe-200 block mb-2">
              Start Time
            </label>
            <ClockTimePicker
              id="live-filter-start-time"
              value={activeStartTime}
              onChange={setActiveStartTime}
            />
          </div>

          {/* 3. Duration */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-cafe-200 block mb-2">
              Duration
            </label>
            <CustomSelect
              value={activeDuration}
              onChange={(val) => setActiveDuration(Number(val))}
              options={[
                { value: 60, label: '1 Hour (60 mins)' },
                { value: 90, label: '1.5 Hours (90 mins - Default)' },
                { value: 120, label: '2.0 Hours (120 mins)' },
                { value: 180, label: '3.0 Hours (180 mins)' },
              ]}
            />
          </div>

          {/* 4. Guests count */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-cafe-200 block mb-2">
              Party Size
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 4, 6, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setActiveGuestCount(num)}
                  aria-label={`${num} Guests`}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all min-h-[38px] flex items-center justify-center cursor-pointer ${
                    activeGuestCount === num
                      ? 'neu-gold-btn shadow-neu-gold font-bold'
                      : 'neu-btn-secondary text-cafe-300 hover:text-white'
                  }`}
                >
                  {num}P
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Query Summary Strip */}
        <div className="mt-5 pt-4 border-t border-cafe-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm gap-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-cafe-200">
            <span className="font-semibold text-gold-accent text-xs">Window:</span>
            <span className="font-mono bg-cafe-900/90 px-2 py-0.5 rounded border border-cafe-700/60 text-[11px] sm:text-xs text-cafe-200">
              {activeDate === todayStr ? 'Today' : activeDate} • {formatTime12h(activeStartTime)} to {formatTime12h(activeEndTime)}
            </span>
            <span className="text-cafe-400 text-[11px] sm:text-xs">({activeDuration}m • {activeGuestCount} Guests)</span>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const target = document.querySelector('[data-available="true"]') || document.getElementById('tables-grid');
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  target.classList.add('table-focus-highlight');
                  setTimeout(() => target.classList.remove('table-focus-highlight'), 2500);
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-semibold text-xs cursor-pointer hover:bg-emerald-900/60 transition-all hover:scale-105 active:scale-95"
              title="Click to jump directly to first available table"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {availableCount} Available
            </button>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-950/60 text-orange-400 border border-orange-500/30 font-semibold text-xs">
              <Clock className="w-3.5 h-3.5" />
              {reservedCount} Reserved
            </span>
            {maintenanceCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/60 text-red-400 border border-red-500/30 font-semibold text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                {maintenanceCount} Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Production Live Seating Notice */}
      <div className="mb-8 p-3 rounded-xl bg-cafe-900/50 border border-gold-accent/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-cafe-300">
        <div className="flex items-start sm:items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-accent flex-shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Instant Floor Allocation:</strong> Seating inventory updates live. Select any available table below to initiate instant booking confirmation.
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center text-emerald-400 font-mono text-[11px] gap-1 flex-shrink-0">
          <Radio className="w-3 h-3 animate-pulse" /> Live Availability Engine
        </span>
      </div>

      {/* Tables Grid */}
      <div id="tables-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 scroll-mt-24">
        {displayTables.map(({ table, isAvailable, isReserved, isMaintenance, isCapacityFit, remainingSeats, occupiedSeats, reason, activeBooking }) => {
          return (
            <div
              key={table.id}
              id={`table-card-${table.id}`}
              data-available={isAvailable ? "true" : "false"}
              data-table-id={table.id}
              className={`glass-card p-5 rounded-2xl relative flex flex-col justify-between overflow-hidden border transition-all scroll-mt-28 ${
                isAvailable
                  ? 'border-emerald-500/30 hover:border-emerald-400/60 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                  : isReserved
                  ? 'border-rose-500/30 bg-rose-950/10'
                  : isMaintenance
                  ? 'border-neutral-700 bg-neutral-900/40 opacity-70'
                  : 'border-cafe-700/40 opacity-80'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#faf6f0] flex items-center gap-2">
                      {table.name}
                      {isAvailable && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </h3>
                    <p className="text-xs text-cafe-400 font-mono mt-0.5">
                      ID: {table.id}
                    </p>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                      isAvailable
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isReserved
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isMaintenance
                        ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        : 'bg-cafe-800 text-cafe-300 border border-cafe-600/30'
                    }`}
                  >
                    {isAvailable ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Available
                      </>
                    ) : isReserved ? (
                      <>
                        <XCircle className="w-3 h-3" /> Reserved
                      </>
                    ) : isMaintenance ? (
                      <>
                        <AlertTriangle className="w-3 h-3" /> Inactive
                      </>
                    ) : (
                      <>
                        <Info className="w-3 h-3" /> Unavailable
                      </>
                    )}
                  </span>
                </div>

                {/* Chair Graphic & Capacity Indicator */}
                <div className="my-4 p-3.5 rounded-2xl neu-tray border border-cafe-700/60">
                  <div className="flex items-center justify-between text-xs text-cafe-300 mb-2">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-gold-accent" />
                      Capacity: <strong>{table.capacity} Chairs</strong>
                    </span>
                    <span className="font-mono text-[11px] text-cafe-400">
                      {isAvailable
                        ? `${table.capacity} / ${table.capacity} Available`
                        : isReserved
                        ? 'Reserved (0 Available)'
                        : '0 Available'}
                    </span>
                  </div>

                  {/* Visual Chairs Representation with wrapping */}
                  <div className="flex flex-wrap items-center gap-1.5 justify-center py-2 max-w-full">
                    {Array.from({ length: table.capacity }).map((_, idx) => {
                      const isSeatOccupied = idx < (occupiedSeats || 0);
                      return (
                        <div
                          key={idx}
                          title={`Chair ${idx + 1} (${isSeatOccupied ? 'Occupied' : 'Free'})`}
                          className={`w-4 h-4 rounded-full border transition-all ${
                            isMaintenance
                              ? 'bg-neutral-700 border-neutral-600'
                              : isSeatOccupied
                              ? 'bg-orange-500/70 border-orange-400'
                              : 'bg-emerald-500/60 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Table Description */}
                  <p className="text-[11px] text-cafe-300 mt-2 text-center line-clamp-1 font-normal">
                    {table.description}
                  </p>
                </div>

                {/* Contextual Note / Overlap Details */}
                <div className="text-xs mb-4 min-h-[38px] flex items-center">
                  {isAvailable && (
                    <p className="text-emerald-400 text-[11px] font-medium">
                      Table is completely available for your selected time window.
                    </p>
                  )}
                  {isReserved && (
                    <div className="text-rose-300 text-[11px] bg-rose-950/40 p-2 rounded-lg border border-rose-500/20 w-full">
                      <strong>Reserved:</strong> {formatTime12h(activeBooking?.start_time)} to {formatTime12h(activeBooking?.end_time)}
                    </div>
                  )}
                  {isMaintenance && (
                    <p className="text-neutral-400 text-[11px]">
                      Table is temporarily paused for routine sanitation and maintenance.
                    </p>
                  )}
                  {!isAvailable && !isReserved && !isMaintenance && !isCapacityFit && (
                    <div className="text-rose-300 text-[11px] bg-rose-950/30 p-2 rounded-lg border border-rose-500/20 w-full">
                      Maximum table capacity is {table.capacity} chairs ({activeGuestCount} guests requested).
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => openBookingForTable(table.id)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isAvailable
                    ? 'neu-gold-btn shadow-neu-gold'
                    : 'neu-btn-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                {isAvailable ? (
                  <>
                    <span>Book {table.name}</span>
                  </>
                ) : isReserved ? (
                  <span>Slot Occupied</span>
                ) : isMaintenance ? (
                  <span>Under Maintenance</span>
                ) : (
                  <span>Capacity Exceeded</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
