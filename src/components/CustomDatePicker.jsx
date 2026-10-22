'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getTodayString, getTomorrowString } from '../constants/defaultData';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDatePicker({
  value,
  onChange,
  min = getTodayString(),
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current value or fallback to min/today
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date();
  };

  const selectedDate = parseDate(value);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Keep view in sync when value changes externally
  useEffect(() => {
    const d = parseDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const isoString = `${viewYear}-${mm}-${dd}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  // Generate calendar days
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  // Format display text
  const formatDisplay = (dateStr) => {
    if (!dateStr) return 'Select Date';
    try {
      const d = parseDate(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 360 && rect.top > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Entire box is clickable */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="w-full neu-inset rounded-xl sm:rounded-2xl px-3 sm:px-3.5 py-2.5 text-left text-sm text-cafe-100 font-medium cursor-pointer flex items-center justify-between gap-1.5 sm:gap-2 hover:border-orange-500/50 transition-colors select-none"
      >
        <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap truncate select-none">
          {formatDisplay(value)}
        </span>
        <CalendarIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
      </button>

      {/* Custom Neumorphic Calendar Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-0 z-50 w-72 sm:w-80 max-w-[calc(100vw-32px)] neu-raised rounded-2xl sm:rounded-3xl p-4 border border-orange-500/30 shadow-2xl animate-scale-up`}
        >
          {/* Calendar Header with Month/Year Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-cafe-700/60">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg neu-btn-secondary text-cafe-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-display text-sm font-bold text-white tracking-wide">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg neu-btn-secondary text-cafe-300 hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Shortcuts: Today & Tomorrow */}
          <div className="flex items-center gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setIsOpen(false);
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                value === todayStr
                  ? 'neu-gold-btn text-white'
                  : 'neu-btn-secondary text-cafe-300 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(tomorrowStr);
                setIsOpen(false);
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                value === tomorrowStr
                  ? 'neu-gold-btn text-white'
                  : 'neu-btn-secondary text-cafe-300 hover:text-white'
              }`}
            >
              Tomorrow
            </button>
          </div>

          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAY_LABELS.map((d) => (
              <span key={d} className="text-[11px] font-semibold text-cafe-400">
                {d}
              </span>
            ))}
          </div>

          {/* Day Tiles Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank leading tiles */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dayIso = `${viewYear}-${mm}-${dd}`;
              const isPast = min && dayIso < min;
              const isSelected = value === dayIso;
              const isToday = dayIso === todayStr;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'neu-gold-btn text-white font-bold scale-105'
                      : isPast
                      ? 'text-cafe-600 opacity-30 cursor-not-allowed'
                      : 'text-cafe-200 hover:bg-orange-500/20 hover:text-orange-300'
                  } ${isToday && !isSelected ? 'border border-orange-500/40 text-orange-300 font-semibold' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
