'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useCafe, formatTime12h } from '../context/CafeContext';
import { getTodayString, getTomorrowString } from '../constants/defaultData';

import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import ClockTimePicker from './ClockTimePicker';

export default function Hero() {
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
    setIsBookingModalOpen,
  } = useCafe();

  const handleQuickSearch = (e) => {
    e.preventDefault();

    // Small timeout ensures that if the user just picked date/time/guests, React has re-rendered the availability state
    setTimeout(() => {
      // 1. Find the first available table card matching user's requirements
      const availableTableCard = document.querySelector('[data-available="true"]');

      if (availableTableCard) {
        // Scroll directly to the available table, perfectly centering it in the user's viewport
        availableTableCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add a vibrant, eye-catching glow animation so user's attention is immediately drawn to the table
        availableTableCard.classList.add('table-focus-highlight');
        setTimeout(() => {
          availableTableCard.classList.remove('table-focus-highlight');
        }, 2500);
      } else {
        // If all tables are reserved or none match, scroll directly to the tables grid
        const tablesGrid = document.getElementById('tables-grid') || document.getElementById('availability-map');
        if (tablesGrid) {
          tablesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 60);
  };


  const durationOptions = [
    { value: 60, label: '1 Hour' },
    { value: 90, label: '1.5 Hours (Standard)' },
    { value: 120, label: '2 Hours (Dining)' },
    { value: 180, label: '3 Hours (Leisure)' },
  ];

  const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8].map((num) => ({
    value: num,
    label: `${num} ${num === 1 ? 'Guest' : 'Guests'}`,
  }));

  return (
    <section id="top" className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center pt-8 pb-16 sm:pb-24 z-20">
      {/* Background Hero Image */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/images/hero.jpg"
          alt="L'Aura Cafe Luxury Interior"
          fetchPriority="high"
          width="1920"
          height="1080"
          className="w-full h-full object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#140e0a] via-[#140e0a]/85 to-[#140e0a]/50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-6">
        {/* Main Title - Clean, Solid Typography */}
        <h1 className="font-display text-3xl xs:text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#faf6f0] max-w-4xl mx-auto leading-[1.2] sm:leading-[1.15] drop-shadow-md">
          Artisanal Coffee & <br className="hidden xs:inline" />
          <span className="text-orange-500">Table Reservations</span>
        </h1>

        {/* Subtitle - Authentic, Clear, No Em-Dashes or Buzzwords */}
        <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-cafe-200 max-w-2xl mx-auto font-normal leading-relaxed px-2">
          Select your date, time, and party size to check real-time availability and reserve your table.
        </p>

        {/* Availability Search Console */}
        <div className="mt-8 sm:mt-10 max-w-5xl mx-auto relative z-30">
          <form
            onSubmit={handleQuickSearch}
            className="neu-raised p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-cafe-700/60 flex flex-col md:flex-row items-stretch md:items-end gap-3 sm:gap-4 relative z-30"
          >
            {/* Date Selector */}
            <div className="flex-1 text-left min-w-0">
              <label className="block text-xs uppercase tracking-wider font-semibold text-cafe-200 mb-1.5">
                Date
              </label>
              <CustomDatePicker
                value={activeDate}
                onChange={setActiveDate}
                min={getTodayString()}
              />
            </div>

            {/* Time Selector */}
            <div className="flex-1 text-left min-w-0">
              <label className="block text-xs uppercase tracking-wider font-semibold text-cafe-200 mb-1.5">
                Start Time
              </label>
              <ClockTimePicker
                id="hero-quick-start-time"
                value={activeStartTime}
                onChange={setActiveStartTime}
              />
            </div>

            {/* Duration Selector */}
            <div className="flex-1 text-left min-w-0">
              <label className="block text-xs uppercase tracking-wider font-semibold text-cafe-200 mb-1.5">
                Duration
              </label>
              <CustomSelect
                value={activeDuration}
                onChange={(val) => setActiveDuration(Number(val))}
                options={durationOptions}
              />
            </div>

            {/* Guests Selector */}
            <div className="flex-1 text-left min-w-0">
              <label className="block text-xs uppercase tracking-wider font-semibold text-cafe-200 mb-1.5">
                Guests
              </label>
              <CustomSelect
                value={activeGuestCount}
                onChange={(val) => setActiveGuestCount(Number(val))}
                options={guestOptions}
              />
            </div>

            {/* CTA Button */}
            <div className="w-full md:w-auto mt-2 md:mt-0 flex-shrink-0">
              <button
                type="submit"
                className="neu-gold-btn w-full md:w-auto h-[46px] px-7 rounded-xl sm:rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Check Tables</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Location Notice */}
        <p className="mt-8 text-xs sm:text-sm text-cafe-300 font-medium">
          {cafeSettings.address}
        </p>
      </div>
    </section>
  );
}
