'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  UserCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Calendar,
  Users,
  ExternalLink,
  Send,
  Coffee,
} from 'lucide-react';
import { useCafe, formatTime12h } from '../context/CafeContext';

export default function EmailCenterDrawer() {
  const {
    isEmailCenterOpen,
    setIsEmailCenterOpen,
    emailLogs,
    cafeSettings,
    bookings,
  } = useCafe();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'customer', 'owner'
  const [selectedLogId, setSelectedLogId] = useState(() => emailLogs[0]?.id || null);

  if (!isEmailCenterOpen) return null;

  const filteredLogs = emailLogs.filter((log) => {
    if (activeTab === 'all') return true;
    return log.recipient_type === activeTab;
  });

  const selectedLog = emailLogs.find((l) => l.id === selectedLogId) || filteredLogs[0] || emailLogs[0];
  const relatedBooking = selectedLog?.full_booking || bookings.find((b) => b.id === selectedLog?.booking_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80">
      <div className="w-full sm:max-w-2xl h-full bg-[#201711] border-l border-cafe-700/60 flex flex-col shadow-2xl overflow-hidden animate-slide-left">
        {/* Drawer Header */}
        <div className="p-5 border-b border-cafe-800 flex items-center justify-between bg-cafe-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#faf6f0]">
                Email Notifications
              </h3>
              <p className="text-[11px] sm:text-xs text-cafe-300">
                Booking confirmations and status alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEmailCenterOpen(false)}
            aria-label="Close Email Center Drawer"
            className="p-2 rounded-xl text-cafe-400 hover:text-white hover:bg-cafe-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Filter Strip */}
        <div className="px-4 sm:px-5 py-3 border-b border-cafe-800/80 bg-[#251a13] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-gold-accent text-espresso font-bold'
                  : 'text-cafe-300 hover:text-white bg-cafe-900/60'
              }`}
            >
              All Logs ({emailLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'customer'
                  ? 'bg-gold-accent text-espresso font-bold'
                  : 'text-cafe-300 hover:text-white bg-cafe-900/60'
              }`}
            >
              Customer Copies
            </button>
            <button
              onClick={() => setActiveTab('owner')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'owner'
                  ? 'bg-gold-accent text-espresso font-bold'
                  : 'text-cafe-300 hover:text-white bg-cafe-900/60'
              }`}
            >
              Owner Alerts
            </button>
          </div>

          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Engine Active
          </span>
        </div>

        {/* Two-Pane Layout: List on Top/Left, Preview Below */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Email Item Selector Pills */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-cafe-400 mb-2">
              Recent Dispatches (Click to inspect email template)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredLogs.map((log, idx) => {
                const isSelected = selectedLog?.id === log.id;
                const isCust = log.recipient_type === 'customer';
                return (
                  <div
                    key={`${log.id || 'log'}-${idx}`}
                    onClick={() => setSelectedLogId(log.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-gold-accent/15 border-gold-accent shadow-glow'
                        : 'bg-cafe-900/50 border-cafe-800 hover:border-cafe-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-full ${
                        isCust
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-orange-950 text-orange-300 border border-orange-800'
                      }`}>
                        {isCust ? <UserCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {isCust ? 'Customer Copy' : 'Owner Alert'}
                      </span>
                      <span className="text-[10px] text-cafe-400 font-mono">
                        {log.submitted_at
                          ? new Date(log.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : log.status === 'queued'
                          ? 'Queued'
                          : log.status === 'unconfigured'
                          ? 'Demo Mode'
                          : 'Just now'}
                      </span>
                    </div>
                    <div className="font-medium text-cafe-100 truncate">
                      {log.subject}
                    </div>
                    <div className="text-[11px] text-cafe-400 truncate mt-0.5">
                      To: {log.recipient_email}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Email Detailed Realistic Preview */}
          {selectedLog ? (
            <div className="border border-cafe-700/60 rounded-2xl bg-[#251a13] overflow-hidden shadow-glass">
              {/* Email Client Header bar */}
              <div className="bg-[#2c2018] p-4 border-b border-cafe-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-cafe-400 font-semibold">From:</span>
                    <span className="text-gold-accent font-medium">
                      {cafeSettings.name} &lt;{cafeSettings.owner_email}&gt;
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${
                      selectedLog.status === 'failed'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : selectedLog.status === 'queued'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : selectedLog.status === 'unconfigured'
                        ? 'bg-cafe-800 text-cafe-300 border-cafe-700'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {selectedLog.status === 'submitted'
                      ? 'SMTP Submitted'
                      : selectedLog.status === 'queued'
                      ? 'Dispatch Queued'
                      : selectedLog.status === 'unconfigured'
                      ? 'SMTP Unconfigured (Demo)'
                      : selectedLog.status === 'failed'
                      ? 'Dispatch Failed'
                      : selectedLog.status || 'Active'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-cafe-400 font-semibold">To:</span>
                  <span className="text-cafe-100 font-mono">
                    {selectedLog.recipient_email}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-cafe-400 font-semibold">Subject:</span>
                  <span className="text-white font-bold">
                    {selectedLog.subject}
                  </span>
                </div>
              </div>

              {/* Email Body Content */}
              <div className="p-6 text-sm text-cafe-100 space-y-5">
                <div className="text-center pb-4 border-b border-cafe-800">
                  <div className="w-10 h-10 rounded-full bg-cafe-800 mx-auto mb-2 flex items-center justify-center text-gold-accent border border-gold-accent/30">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <h4 className="font-display text-xl font-bold text-gold-accent">
                    {cafeSettings.name}
                  </h4>
                  <p className="text-xs text-cafe-300">
                    {selectedLog.recipient_type === 'customer'
                      ? 'Official Table Booking Confirmation'
                      : '🔔 New Guest Booking Alert'}
                  </p>
                </div>

                {selectedLog.recipient_type === 'customer' ? (
                  <div className="space-y-4 text-xs">
                    <p>
                      Dear <strong>{relatedBooking?.customer_name || 'Valued Guest'}</strong>,
                    </p>
                    <p className="text-cafe-300 leading-relaxed">
                      Thank you for reserving a table at {cafeSettings.name}. Your booking has been confirmed with our real-time table inventory.
                    </p>

                    {/* Booking Card Box */}
                    <div className="p-4 rounded-xl bg-cafe-900/80 border border-gold-accent/30 space-y-2">
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Booking Reference:</span>
                        <span className="font-mono text-gold-accent font-bold">#{relatedBooking?.id}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Assigned Table:</span>
                        <span className="font-bold text-white">{relatedBooking?.table_name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Date:</span>
                        <span className="text-white font-medium">{relatedBooking?.booking_date}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Time Window:</span>
                        <span className="text-gold-accent font-mono font-bold">
                          {formatTime12h(relatedBooking?.start_time)} – {formatTime12h(relatedBooking?.end_time)} ({relatedBooking?.duration_minutes} mins)
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-cafe-400">Reserved Party:</span>
                        <span className="text-white font-medium">{relatedBooking?.guest_count} Guests</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-cafe-950/70 border border-cafe-800 text-[11px] text-cafe-300">
                      <strong>Location:</strong> {cafeSettings.address} ({cafeSettings.landmark})<br />
                      <strong>Phone:</strong> {cafeSettings.phone}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <p className="text-gold-accent font-semibold">
                      Attention: Cafe Manager / Reservation Host
                    </p>
                    <p className="text-cafe-300">
                      A new table booking has just been submitted and assigned in real-time.
                    </p>

                    <div className="p-4 rounded-xl bg-cafe-900/80 border border-orange-500/30 space-y-2">
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Guest Name:</span>
                        <span className="font-bold text-white">{relatedBooking?.customer_name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Guest Contact:</span>
                        <span className="text-white font-mono">{relatedBooking?.customer_email} {relatedBooking?.customer_phone && `• ${relatedBooking.customer_phone}`}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Table Assigned:</span>
                        <span className="font-bold text-gold-accent">{relatedBooking?.table_name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-cafe-800">
                        <span className="text-cafe-400">Slot:</span>
                        <span className="font-mono text-white">
                          {relatedBooking?.booking_date} @ {formatTime12h(relatedBooking?.start_time)} - {formatTime12h(relatedBooking?.end_time)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-cafe-400">Party Size:</span>
                        <span className="font-bold text-white">{relatedBooking?.guest_count} Guests</span>
                      </div>
                    </div>

                    {relatedBooking?.special_notes && (
                      <div className="p-3 rounded-lg bg-orange-950/30 border border-orange-500/20 text-[11px] text-orange-200">
                        <strong>Guest Special Note:</strong> "{relatedBooking.special_notes}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-cafe-400 text-xs">
              No email logs found yet. Book a table to generate notifications!
            </div>
          )}
        </div>

        {/* Drawer Bottom Bar */}
        <div className="p-4 border-t border-cafe-800 bg-cafe-950 flex items-center justify-between text-xs text-cafe-400">
          <span>SMTP Engine: <code className="text-gold-accent font-mono text-[11px]">Gmail SMTP (Nodemailer)</code></span>
          <button
            type="button"
            onClick={() => setIsEmailCenterOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-cafe-800 text-cafe-200 hover:text-white cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
