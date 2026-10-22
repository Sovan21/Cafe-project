'use client';

import React from 'react';
import { Sparkles, Radio, Mail, Clock, Phone, MapPin } from 'lucide-react';
import { useCafe, formatTime12h } from '../context/CafeContext';

export default function DemoBanner() {
  const { cafeSettings, setIsEmailCenterOpen, emailLogs } = useCafe();

  const cleanPhone = cafeSettings.phone ? cafeSettings.phone.replace(/[\s-]/g, '') : '';

  return (
    <aside aria-label="Cafe Announcement & Hours" className="bg-gradient-to-r from-[#170f0c] via-[#231713] to-[#170f0c] border-b border-gold-accent/20 px-3 sm:px-4 py-2 text-xs text-cafe-200 relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] border border-emerald-500/30">
            <Radio className="w-3 h-3 mr-1 animate-pulse text-emerald-400" />
            LIVE RESERVATIONS
          </span>
          <span className="text-cafe-300 hidden md:inline">
            Guaranteed real-time table allocation & automated confirmation.
          </span>
          <span className="inline-flex items-center text-gold-accent font-medium text-[11px] sm:text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Open Today: {formatTime12h(cafeSettings.opening_time)} – {formatTime12h(cafeSettings.closing_time)}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] sm:text-xs">
          <a
            href={`tel:${cleanPhone}`}
            className="text-cafe-300 hover:text-gold-accent flex items-center gap-1 transition-colors py-0.5"
            aria-label={`Call ${cafeSettings.name} directly`}
          >
            <Phone className="w-3 h-3 text-gold-accent" />
            <span className="hidden xs:inline">{cafeSettings.phone}</span>
          </a>
          <span className="text-cafe-700">|</span>
          <button
            type="button"
            onClick={() => setIsEmailCenterOpen(true)}
            className="text-gold-accent hover:underline flex items-center gap-1 font-medium cursor-pointer py-0.5"
            aria-label={`View ${emailLogs.length} Transactional Booking Notifications`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Dispatched Alerts ({emailLogs.length})</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

