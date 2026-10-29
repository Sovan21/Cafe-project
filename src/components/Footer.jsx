'use client';

import React from 'react';
import Link from 'next/link';
import { Coffee, MapPin, Phone, Mail, Clock, ShieldCheck, Calendar, Utensils, Sparkles, ChevronRight } from 'lucide-react';
import { useCafe, formatTime12h } from '../context/CafeContext';

export default function Footer() {
  const { cafeSettings, setIsAdminOpen, setIsBookingModalOpen } = useCafe();

  const cleanPhone = cafeSettings.phone ? cafeSettings.phone.replace(/[\s-]/g, '') : '';

  return (
    <footer id="about-section" className="bg-[#120c08] border-t border-cafe-800 text-cafe-300 text-xs relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-12">
          {/* Brand Info & Clickable Logo */}
          <div className="space-y-4">
            <a
              href="#top"
              className="inline-flex items-center space-x-3 group cursor-pointer focus-visible:outline-gold-accent rounded-xl"
              aria-label={`${cafeSettings.name} - Back to top`}
            >
              <div className="w-10 h-10 rounded-2xl neu-raised flex items-center justify-center border border-gold-accent/30 text-gold-accent group-hover:scale-105 transition-transform shadow-neu-card">
                <Coffee className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <span className="font-display text-xl font-bold text-white tracking-tight group-hover:text-gold-accent transition-colors">
                {cafeSettings.name}
              </span>
            </a>
            <p className="text-cafe-300/80 leading-relaxed">
              {cafeSettings.tagline}. Handcrafted specialty brews, artisanal sourdough bakery, and seamless live table reservations.
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-xs">Navigation</h4>
            <ul className="space-y-2 text-cafe-300">
              <li>
                <a href="#availability-map" className="hover:text-gold-accent transition-colors flex items-center gap-1.5 py-0.5">
                  <ChevronRight className="w-3 h-3 text-gold-accent/60" />
                  <span>Live Table Floor Map</span>
                </a>
              </li>
              <li>
                <a href="#menu-section" className="hover:text-gold-accent transition-colors flex items-center gap-1.5 py-0.5">
                  <ChevronRight className="w-3 h-3 text-gold-accent/60" />
                  <span>Artisanal Menu</span>
                </a>
              </li>
              <li>
                <a href="#ambiance-section" className="hover:text-gold-accent transition-colors flex items-center gap-1.5 py-0.5">
                  <ChevronRight className="w-3 h-3 text-gold-accent/60" />
                  <span>Atmosphere & Seating</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(true)}
                  className="hover:text-gold-accent transition-colors flex items-center gap-1.5 py-0.5 text-left text-cafe-300 cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3 text-gold-accent/60" />
                  <span>Book a Table Online</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Location & Clickable Contacts */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-xs">Contact & Location</h4>
            <div className="flex items-start space-x-2 text-cafe-300">
              <MapPin className="w-4 h-4 text-gold-accent flex-shrink-0 mt-0.5" />
              <div>
                <p>{cafeSettings.address}</p>
                <p className="text-cafe-400 text-[11px] mt-0.5">{cafeSettings.landmark}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-cafe-300 pt-1">
              <Phone className="w-4 h-4 text-gold-accent flex-shrink-0" />
              <a
                href={`tel:${cleanPhone}`}
                className="hover:text-gold-accent transition-colors hover:underline"
                aria-label={`Call us at ${cafeSettings.phone}`}
              >
                {cafeSettings.phone}
              </a>
            </div>
            {cafeSettings.owner_email && (
              <div className="flex items-center space-x-2 text-cafe-300">
                <Mail className="w-4 h-4 text-gold-accent flex-shrink-0" />
                <a
                  href={`mailto:${cafeSettings.owner_email}`}
                  className="hover:text-gold-accent transition-colors hover:underline break-all"
                  aria-label={`Email management at ${cafeSettings.owner_email}`}
                >
                  {cafeSettings.owner_email}
                </a>
              </div>
            )}
          </div>

          {/* Operating Hours */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-xs">Opening Hours</h4>
            <div className="flex items-start space-x-2 text-cafe-300">
              <Clock className="w-4 h-4 text-gold-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Monday to Sunday</p>
                <p className="text-cafe-300 text-xs mt-0.5">
                  {formatTime12h(cafeSettings.opening_time)} to {formatTime12h(cafeSettings.closing_time)}
                </p>
                <p className="text-emerald-400 text-[10px] mt-1">Kitchen closes 45 mins before closing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-cafe-900 flex flex-col sm:flex-row items-center justify-between text-cafe-400 text-[11px] gap-3">
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} {cafeSettings.name}. All rights reserved.
            <span className="mx-2 text-cafe-700">•</span>
            <Link href="/admin" className="text-cafe-500 hover:text-cafe-300 transition-colors">
              Staff Portal
            </Link>
          </p>
          <p className="flex items-center gap-1 text-cafe-400">
            Freshly roasted single-origin coffees and seasonal bakery.
          </p>
        </div>
      </div>
    </footer>
  );
}
