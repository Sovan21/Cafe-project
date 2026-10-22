'use client';

import React from 'react';
import { Armchair, Coffee, Music, Wifi, Compass } from 'lucide-react';
import { useCafe } from '../context/CafeContext';

export default function AmbianceSection() {
  const { cafeSettings, setIsBookingModalOpen } = useCafe();

  return (
    <section id="ambiance-section" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-[#faf6f0] tracking-tight">
          Our Space & Atmosphere
        </h2>
        <p className="mt-4 text-base sm:text-lg text-cafe-200 font-normal">
          Warm lighting, comfortable seating, and an artisanal coffee bar designed for lingering.
        </p>
      </div>

      {/* Visual Showcase Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="relative rounded-3xl overflow-hidden neu-card border border-cafe-700/40 h-80 group">
          <img
            src="/images/hero.jpg"
            alt="Espresso Bar & Main Lounge"
            loading="lazy"
            width="600"
            height="400"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#160f0a] via-[#160f0a]/50 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-gold-accent">Main Lounge & Roastery</span>
            <h4 className="font-display text-xl font-bold text-white mt-1">La Marzocco Espresso Station</h4>
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden neu-card border border-cafe-700/40 h-80 group">
          <img
            src="/images/seating.jpg"
            alt="Cozy Dining Booths"
            loading="lazy"
            width="600"
            height="400"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#160f0a] via-[#160f0a]/50 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-gold-accent">Numbered Dining Tables</span>
            <h4 className="font-display text-xl font-bold text-white mt-1">Artisanal Dining Table Seating</h4>
          </div>
        </div>

        <div className="relative rounded-3xl overflow-hidden neu-card border border-cafe-700/40 h-80 group">
          <img
            src="/images/brunch.jpg"
            alt="Gourmet Brunch Table"
            loading="lazy"
            width="600"
            height="400"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#160f0a] via-[#160f0a]/50 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-gold-accent">Culinary Experience</span>
            <h4 className="font-display text-xl font-bold text-white mt-1">Artisan Sourdough & Specialty Brews</h4>
          </div>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl neu-card border border-cafe-700/40 text-center">
          <Armchair className="w-6 h-6 text-gold-accent mx-auto mb-3" />
          <h4 className="font-semibold text-sm text-white">Comfortable Seating</h4>
          <p className="text-xs text-cafe-300 mt-1">Handcrafted dining chairs and solid oak tables.</p>
        </div>

        <div className="p-5 rounded-2xl neu-card border border-cafe-700/40 text-center">
          <Music className="w-6 h-6 text-gold-accent mx-auto mb-3" />
          <h4 className="font-semibold text-sm text-white">Curated Music</h4>
          <p className="text-xs text-cafe-300 mt-1">Warm ambient acoustics for comfortable conversation.</p>
        </div>

        <div className="p-5 rounded-2xl neu-card border border-cafe-700/40 text-center">
          <Wifi className="w-6 h-6 text-gold-accent mx-auto mb-3" />
          <h4 className="font-semibold text-sm text-white">High-Speed WiFi</h4>
          <p className="text-xs text-cafe-300 mt-1">Power outlets and complimentary WiFi for casual work.</p>
        </div>

        <div className="p-5 rounded-2xl neu-card border border-cafe-700/40 text-center">
          <Compass className="w-6 h-6 text-gold-accent mx-auto mb-3" />
          <h4 className="font-semibold text-sm text-white">Parking Available</h4>
          <p className="text-xs text-cafe-300 mt-1">Convenient guest parking nearby.</p>
        </div>
      </div>
    </section>
  );
}
