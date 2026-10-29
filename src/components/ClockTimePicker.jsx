'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, X, Check, Keyboard, SlidersHorizontal } from 'lucide-react';
import { formatTime12h } from '../context/CafeContext';

/**
 * ClockTimePicker Component
 * A Material-style interactive clock dial time picker for selecting hours and minutes.
 * Features:
 *  - Digital display with Hours, Minutes, and AM/PM toggles.
 *  - Interactive circular clock face dial with animated selector hand.
 *  - Hours mode (1–12) with auto-switch to minutes mode on selection.
 *  - Minutes mode (00–55 in 5-minute intervals + continuous selection).
 *  - Direct manual input fallback mode.
 *  - Coffee & roastery luxury design theme with accessible touch/click handlers.
 */
export default function ClockTimePicker({
  value = '12:00',
  onChange,
  className = '',
  id,
  label = 'Start Time',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dialRef = useRef(null);

  // Parse 24h "HH:mm" into 12h parts
  const parse24h = (val) => {
    if (!val || typeof val !== 'string' || !val.includes(':')) {
      return { hour12: 12, minutes: 0, period: 'PM' };
    }
    const [hStr, mStr] = val.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    if (isNaN(h)) h = 12;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12, minutes: m, period };
  };

  const initial = parse24h(value);
  const [tempHour, setTempHour] = useState(initial.hour12);
  const [tempMinute, setTempMinute] = useState(initial.minutes);
  const [tempPeriod, setTempPeriod] = useState(initial.period);
  const [mode, setMode] = useState('hours'); // 'hours' | 'minutes'
  const [isManualMode, setIsManualMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Sync temp state whenever external value changes or picker opens
  useEffect(() => {
    const parsed = parse24h(value);
    setTempHour(parsed.hour12);
    setTempMinute(parsed.minutes);
    setTempPeriod(parsed.period);
    setMode('hours');
  }, [value, isOpen]);

  // Convert temporary 12h parts back to "HH:mm" 24h
  const to24hString = (h12, min, period) => {
    let h24 = h12 % 12;
    if (period === 'PM') h24 += 12;
    const hh = String(h24).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Close on outside click or Escape
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

  // Calculate angle and value from pointer position on clock dial
  const handlePointerEvent = useCallback((e, isFinal = false) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees: 0 deg at top (12 o'clock), clockwise
    let angle = (Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360;

    if (mode === 'hours') {
      let selectedHour = Math.round(angle / 30) % 12;
      if (selectedHour === 0) selectedHour = 12;
      setTempHour(selectedHour);

      if (isFinal) {
        // Smoothly auto-switch to minutes mode after picking hour
        setTimeout(() => setMode('minutes'), 250);
      }
    } else {
      // Minutes mode: snap to nearest minute (or 5-minute interval for clean restaurant slots)
      let selectedMin = Math.round(angle / 6) % 60;
      // Round to 5-minute precision for natural table bookings
      selectedMin = Math.round(selectedMin / 5) * 5 % 60;
      setTempMinute(selectedMin);
    }
  }, [mode]);

  const onPointerDown = (e) => {
    setIsDragging(true);
    handlePointerEvent(e, false);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    handlePointerEvent(e, false);
  };

  const onPointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      handlePointerEvent(e, true);
    }
  };

  const handleConfirm = () => {
    const final24 = to24hString(tempHour, tempMinute, tempPeriod);
    if (onChange) onChange(final24);
    setIsOpen(false);
  };

  const handleCancel = () => {
    const parsed = parse24h(value);
    setTempHour(parsed.hour12);
    setTempMinute(parsed.minutes);
    setTempPeriod(parsed.period);
    setIsOpen(false);
  };

  // Dial geometry constants (Dial radius: 105px inside 230px container)
  const DIAL_RADIUS = 84;
  const CENTER = 115;

  // Hand angle calculation
  const handAngle = mode === 'hours'
    ? (tempHour % 12) * 30
    : (tempMinute % 60) * 6;

  const handRad = (handAngle - 90) * (Math.PI / 180);
  const handEndX = CENTER + DIAL_RADIUS * Math.cos(handRad);
  const handEndY = CENTER + DIAL_RADIUS * Math.sin(handRad);

  // Hours list (1 to 12)
  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Minutes list (00 to 55 in 5m steps)
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Clickable Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="w-full neu-inset rounded-xl sm:rounded-2xl px-3 sm:px-3.5 py-2.5 text-left text-sm text-cafe-100 font-medium cursor-pointer flex items-center justify-between gap-2 hover:border-gold-accent/50 border border-transparent transition-all select-none group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-gold-accent flex-shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-white text-xs sm:text-sm font-semibold truncate font-mono">
            {formatTime12h(value)}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-cafe-400 bg-cafe-800/80 px-2 py-0.5 rounded border border-cafe-700/60 flex-shrink-0">
          Pick
        </span>
      </button>

      {/* Clock Dial Popover Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={label}
          className="fixed inset-0 z-50 sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:left-0 sm:right-auto flex items-center justify-center sm:block p-4 sm:p-0 bg-black/60 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none animate-scale-up"
        >
          <div
            className="w-full max-w-[310px] sm:w-[310px] rounded-3xl neu-raised border border-cafe-700/80 bg-[#1a120c] shadow-2xl overflow-hidden p-5 text-white select-none relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Title */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-cafe-800">
              <span className="text-[11px] font-bold uppercase tracking-widest text-cafe-300">
                SELECT TIME
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="text-cafe-400 hover:text-white p-1 rounded-lg hover:bg-cafe-800/60 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Digital Display (Hours : Minutes + AM/PM) */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {/* Hour Box */}
              <button
                type="button"
                onClick={() => {
                  setMode('hours');
                  setIsManualMode(false);
                }}
                className={`w-20 h-16 rounded-2xl flex items-center justify-center font-mono text-3xl font-extrabold transition-all cursor-pointer ${
                  mode === 'hours' && !isManualMode
                    ? 'bg-gold-accent/20 text-gold-accent border-2 border-gold-accent shadow-inner'
                    : 'bg-cafe-900/80 text-cafe-200 border border-cafe-700/60 hover:bg-cafe-800'
                }`}
              >
                {String(tempHour).padStart(2, '0')}
              </button>

              <span className="font-mono text-2xl font-bold text-cafe-400">:</span>

              {/* Minute Box */}
              <button
                type="button"
                onClick={() => {
                  setMode('minutes');
                  setIsManualMode(false);
                }}
                className={`w-20 h-16 rounded-2xl flex items-center justify-center font-mono text-3xl font-extrabold transition-all cursor-pointer ${
                  mode === 'minutes' && !isManualMode
                    ? 'bg-gold-accent/20 text-gold-accent border-2 border-gold-accent shadow-inner'
                    : 'bg-cafe-900/80 text-cafe-200 border border-cafe-700/60 hover:bg-cafe-800'
                }`}
              >
                {String(tempMinute).padStart(2, '0')}
              </button>

              {/* AM / PM Toggle Stack */}
              <div className="flex flex-col rounded-xl overflow-hidden border border-cafe-700/60 bg-cafe-900 ml-1">
                <button
                  type="button"
                  onClick={() => setTempPeriod('AM')}
                  className={`px-3 py-1.5 text-xs font-bold font-mono transition-colors cursor-pointer ${
                    tempPeriod === 'AM'
                      ? 'bg-gold-accent text-cafe-950 font-black'
                      : 'text-cafe-300 hover:text-white hover:bg-cafe-800'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setTempPeriod('PM')}
                  className={`px-3 py-1.5 text-xs font-bold font-mono transition-colors cursor-pointer border-t border-cafe-800 ${
                    tempPeriod === 'PM'
                      ? 'bg-gold-accent text-cafe-950 font-black'
                      : 'text-cafe-300 hover:text-white hover:bg-cafe-800'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Circular Clock Face Dial */}
            {!isManualMode ? (
              <div className="flex justify-center mb-4">
                <div
                  ref={dialRef}
                  onMouseDown={onPointerDown}
                  onMouseMove={onPointerMove}
                  onMouseUp={onPointerUp}
                  onTouchStart={onPointerDown}
                  onTouchMove={onPointerMove}
                  onTouchEnd={onPointerUp}
                  className="w-[230px] h-[230px] rounded-full bg-[#201610] border border-cafe-700/50 relative shadow-inner cursor-pointer touch-none select-none flex items-center justify-center"
                >
                  {/* SVG Clock Hand & Center Pin */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {/* Clock Hand Line */}
                    <line
                      x1={CENTER}
                      y1={CENTER}
                      x2={handEndX}
                      y2={handEndY}
                      stroke="var(--color-gold-accent, #d4af37)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Center Pivot Point */}
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r="4.5"
                      fill="var(--color-gold-accent, #d4af37)"
                    />
                  </svg>

                  {/* Highlight Disc over Selected Number */}
                  <div
                    className="absolute w-8 h-8 rounded-full bg-gold-accent z-10 flex items-center justify-center font-bold text-cafe-950 text-xs shadow-md pointer-events-none transition-transform duration-75"
                    style={{
                      left: `${handEndX - 16}px`,
                      top: `${handEndY - 16}px`,
                    }}
                  >
                    {mode === 'hours'
                      ? tempHour
                      : String(tempMinute).padStart(2, '0')}
                  </div>

                  {/* Clock Face Numbers */}
                  {mode === 'hours' ? (
                    hoursList.map((h) => {
                      const angle = (h % 12) * 30;
                      const rad = (angle - 90) * (Math.PI / 180);
                      const x = CENTER + DIAL_RADIUS * Math.cos(rad);
                      const y = CENTER + DIAL_RADIUS * Math.sin(rad);
                      const isSelected = tempHour === h;

                      return (
                        <div
                          key={`hour-${h}`}
                          className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-xs font-semibold font-mono pointer-events-none transition-colors ${
                            isSelected ? 'text-transparent' : 'text-cafe-200'
                          }`}
                          style={{ left: `${x}px`, top: `${y}px` }}
                        >
                          {h}
                        </div>
                      );
                    })
                  ) : (
                    minutesList.map((m) => {
                      const angle = (m % 60) * 6;
                      const rad = (angle - 90) * (Math.PI / 180);
                      const x = CENTER + DIAL_RADIUS * Math.cos(rad);
                      const y = CENTER + DIAL_RADIUS * Math.sin(rad);
                      const isSelected = tempMinute === m;

                      return (
                        <div
                          key={`min-${m}`}
                          className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-xs font-semibold font-mono pointer-events-none transition-colors ${
                            isSelected ? 'text-transparent' : 'text-cafe-200'
                          }`}
                          style={{ left: `${x}px`, top: `${y}px` }}
                        >
                          {String(m).padStart(2, '0')}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Manual Quick-Pill Fallback Mode */
              <div className="py-4 px-2 mb-4 bg-cafe-900/60 rounded-2xl border border-cafe-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cafe-400 block mb-2 text-center">
                  Quick Select Slot
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '16:00', '18:00', '19:00', '20:00', '21:00'].map((slot) => {
                    const parsedSlot = parse24h(slot);
                    const isCur =
                      tempHour === parsedSlot.hour12 &&
                      tempMinute === parsedSlot.minutes &&
                      tempPeriod === parsedSlot.period;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setTempHour(parsedSlot.hour12);
                          setTempMinute(parsedSlot.minutes);
                          setTempPeriod(parsedSlot.period);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer text-center ${
                          isCur
                            ? 'bg-gold-accent text-cafe-950'
                            : 'bg-cafe-800/80 text-cafe-200 hover:bg-cafe-700'
                        }`}
                      >
                        {formatTime12h(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Controls (Keyboard Toggle, Cancel, OK) */}
            <div className="flex items-center justify-between pt-2 border-t border-cafe-800">
              <button
                type="button"
                onClick={() => setIsManualMode(!isManualMode)}
                className="text-cafe-400 hover:text-gold-accent p-2 rounded-xl hover:bg-cafe-800/60 transition-colors cursor-pointer"
                title={isManualMode ? 'Switch to Clock Dial' : 'Switch to Quick Presets'}
              >
                {isManualMode ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <SlidersHorizontal className="w-4 h-4" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-cafe-300 hover:text-white hover:bg-cafe-800 transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gold-accent hover:bg-gold-accent/90 text-cafe-950 shadow-md transition-all cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>OK</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
