'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { supabase, isSupabaseConfigured } from '../supabase';
import {
  DEFAULT_CAFE_SETTINGS,
  DEFAULT_TABLES,
  DEFAULT_MENU_CATEGORIES,
  DEFAULT_MENU_ITEMS,
  INITIAL_SAMPLE_BOOKINGS,
  getTodayString,
  getDefaultStartTime,
} from '../constants/defaultData';
import {
  validateCustomerName,
  validateCustomerEmail,
  validateIndianPhone,
  validateGuestCount,
  validateBookingSchedule,
} from '../utils/validation';

const CafeContext = createContext(null);

const BROADCAST_CHANNEL_NAME = 'laura_cafe_realtime_channel';

// Helper: Convert "HH:mm" to total minutes from midnight
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

// Helper: Convert total minutes to "HH:mm"
export const minutesToTime = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper: Format "HH:mm" to "6:00 PM"
export const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
};

// Helper: Checks if a booking's scheduled time has passed its 15-minute turnover/grace period
export const isBookingPastGracePeriod = (
  bookingDate,
  endTime,
  startTime,
  durationMinutes = 90,
  graceMinutes = 15
) => {
  if (!bookingDate) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

  // Past dates are automatically expired
  if (bookingDate < todayStr) return true;
  // Future dates are not expired
  if (bookingDate > todayStr) return false;

  // For today, calculate end time in minutes
  let endMin = 0;
  if (endTime) {
    endMin = timeToMinutes(endTime);
  } else if (startTime) {
    endMin = timeToMinutes(startTime) + (Number(durationMinutes) || 90);
  } else {
    return false;
  }

  const currentMin = now.getHours() * 60 + now.getMinutes();
  // If current clock has reached or exceeded (end_time + 15m grace), booking has completed!
  return currentMin >= (endMin + graceMinutes);
};

// Helper: Checks if a booking is actively occupying a table right now
export const isBookingCurrentlyActive = (
  bookingDate,
  startTime,
  endTime,
  durationMinutes = 90,
  status = 'confirmed'
) => {
  if (status !== 'confirmed' || !bookingDate || !startTime) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

  if (bookingDate !== todayStr) return false;

  const startMin = timeToMinutes(startTime);
  const endMin = endTime
    ? timeToMinutes(endTime)
    : startMin + (Number(durationMinutes) || 90);

  const currentMin = now.getHours() * 60 + now.getMinutes();
  // Seated from start_time up until end_time + 15 min turnover window
  return currentMin >= startMin && currentMin < (endMin + 15);
};

export const CafeProvider = ({ children }) => {
  // 1. Core State with SSR-safe initial values
  const [cafeSettings, setCafeSettings] = useState(DEFAULT_CAFE_SETTINGS);
  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [bookings, setBookings] = useState(INITIAL_SAMPLE_BOOKINGS);
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);
  const [emailLogs, setEmailLogs] = useState([]);
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState({});
  const [publicBookedDate, setPublicBookedDate] = useState('');

  // UI Interactive States (declared before memoized slot getters)
  const [activeDate, setActiveDate] = useState(getTodayString());
  const [activeStartTime, setActiveStartTime] = useState(getDefaultStartTime());
  const [activeDuration, setActiveDuration] = useState(90); // minutes
  const [activeGuestCount, setActiveGuestCount] = useState(2);

  // Backward-compatible getter for activeDate slots
  const publicBookedSlots = useMemo(() => {
    return bookedSlotsByDate[activeDate] || [];
  }, [bookedSlotsByDate, activeDate]);

  const setPublicBookedSlots = useCallback((slots) => {
    setBookedSlotsByDate((prev) => ({
      ...prev,
      [activeDate]: slots,
    }));
  }, [activeDate]);

  // Load from LocalStorage once on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sSettings = localStorage.getItem('laura_cafe_settings');
      if (sSettings) setCafeSettings(JSON.parse(sSettings));
      const sTables = localStorage.getItem('laura_cafe_tables');
      if (sTables) setTables(JSON.parse(sTables));
      if (!isSupabaseConfigured) {
        const sBookings = localStorage.getItem('laura_cafe_bookings');
        if (sBookings) {
          const parsedBookings = JSON.parse(sBookings);
          if (Array.isArray(parsedBookings)) {
            const seenB = new Set();
            const dedupedB = parsedBookings.filter((b) => {
              if (!b?.id || seenB.has(b.id)) return false;
              seenB.add(b.id);
              return true;
            });
            setBookings(dedupedB);
          }
        }
      } else {
        // Live cloud mode: strictly purge any previously cached customer reservations from public browser storage
        localStorage.removeItem('laura_cafe_bookings');
        localStorage.removeItem('laura_cafe_email_logs');
      }
      const sMenu = localStorage.getItem('laura_cafe_menu_items');
      if (sMenu) {
        const parsedMenu = JSON.parse(sMenu);
        if (Array.isArray(parsedMenu) && parsedMenu.length > 0) {
          setMenuItems(parsedMenu);
        }
      }
      if (!isSupabaseConfigured) {
        const sEmails = localStorage.getItem('laura_cafe_email_logs');
        if (sEmails) {
          const parsed = JSON.parse(sEmails);
          if (Array.isArray(parsed)) {
            const seenE = new Set();
            const dedupedE = parsed.filter((item) => {
              if (!item?.id || seenE.has(item.id)) return false;
              seenE.add(item.id);
              return true;
            });
            setEmailLogs(dedupedE);
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
  }, []);


  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [preselectedTableId, setPreselectedTableId] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isEmailCenterOpen, setIsEmailCenterOpen] = useState(false);
  const [latestEmailPayload, setLatestEmailPayload] = useState(null);
  const [newNotificationPulse, setNewNotificationPulse] = useState(false);

  // Sync to LocalStorage (client side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('laura_cafe_settings', JSON.stringify(cafeSettings));
    }
  }, [cafeSettings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('laura_cafe_tables', JSON.stringify(tables));
    }
  }, [tables]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isSupabaseConfigured) {
        localStorage.setItem('laura_cafe_bookings', JSON.stringify(bookings));
      } else {
        localStorage.removeItem('laura_cafe_bookings');
      }
    }
  }, [bookings, isSupabaseConfigured]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!isSupabaseConfigured) {
        localStorage.setItem('laura_cafe_email_logs', JSON.stringify(emailLogs));
      } else {
        localStorage.removeItem('laura_cafe_email_logs');
      }
    }
  }, [emailLogs, isSupabaseConfigured]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('laura_cafe_menu_items', JSON.stringify(menuItems));
    }
  }, [menuItems]);

  // Broadcast event helper for local tabs
  const broadcastEvent = (type, payload) => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type, payload });
      channel.close();
    } catch {
      // Ignored
    }
  };

  // Dual Realtime Broadcast: Multi-Tab + Supabase Cloud Realtime Broadcast
  const broadcastRealtimeActivity = useCallback(async (type, payload) => {
    // 1. Same-device / same-origin tabs via local BroadcastChannel
    broadcastEvent(type, payload);

    // 2. Global cross-client / cross-device broadcast via Supabase Realtime
    if (isSupabaseConfigured && supabase) {
      try {
        const rtChannel = supabase.channel('cafe-cloud-realtime');
        await rtChannel.send({
          type: 'broadcast',
          event: 'cafe_activity',
          payload: { type, ...payload },
        });
      } catch (err) {
        console.warn('Supabase Realtime broadcast send error:', err);
      }
    }
  }, []);

  // 2. Multi-Tab Real-time Broadcast Synchronization (Local BroadcastChannel listener)
  useEffect(() => {
    let broadcastChannel;
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'NEW_BOOKING') {
          const slot = payload?.slot || (payload?.booking ? {
            table_id: payload.booking.table_id,
            booking_date: payload.booking.booking_date,
            start_time: payload.booking.start_time,
            end_time: payload.booking.end_time,
            guest_count: payload.booking.guest_count,
            status: 'confirmed',
          } : null);

          if (slot?.booking_date) {
            setBookedSlotsByDate((prev) => ({
              ...prev,
              [slot.booking_date]: [
                ...(prev[slot.booking_date] || []),
                slot,
              ],
            }));
          }

          // In offline demo mode (no Supabase), keep in-memory sync for demo admin
          if (!isSupabaseConfigured && payload?.booking) {
            setBookings((prev) => {
              if (prev.some((b) => b.id === payload.booking.id)) return prev;
              return [payload.booking, ...prev];
            });
            if (payload?.emailLogs && Array.isArray(payload.emailLogs)) {
              setEmailLogs((prev) => {
                const seenIds = new Set(prev.map((e) => e.id));
                const uniqueLogs = payload.emailLogs.filter((e) => !seenIds.has(e.id));
                return [...uniqueLogs, ...prev];
              });
            }
          }
          setNewNotificationPulse(true);
        } else if (type === 'UPDATE_BOOKING_STATUS') {
          setBookings((prev) =>
            prev.map((b) => (b.id === payload.id ? { ...b, status: payload.status } : b))
          );
        } else if (type === 'UPDATE_TABLES') {
          setTables(payload.tables);
        } else if (type === 'UPDATE_SETTINGS') {
          setCafeSettings(payload.settings);
        } else if (type === 'UPDATE_MENU_ITEMS') {
          setMenuItems(payload.menuItems);
        }
      };
    } catch {
      // Fallback
    }

    return () => {
      if (broadcastChannel) broadcastChannel.close();
    };
  }, []);

  // Helper to fetch public booked slots for any specific date
  // (Zero PII leak: returns only table_id, start_time, end_time, guest_count)
  const fetchPublicBookedSlots = useCallback(async (dateStr) => {
    if (!isSupabaseConfigured || !supabase || !dateStr) return [];
    try {
      // 1. Try get_public_booked_slots RPC
      const { data: slots, error: rpcErr } = await supabase.rpc('get_public_booked_slots', {
        p_date: dateStr,
      });
      if (!rpcErr && Array.isArray(slots)) {
        setPublicBookedDate(dateStr);
        setBookedSlotsByDate((prev) => ({ ...prev, [dateStr]: slots }));
        return slots;
      }

      // 2. Fallback to public_booked_slots view
      const { data: viewSlots, error: viewErr } = await supabase
        .from('public_booked_slots')
        .select('table_id, start_time, end_time, guest_count, status')
        .eq('booking_date', dateStr);
      if (!viewErr && Array.isArray(viewSlots)) {
        setPublicBookedDate(dateStr);
        setBookedSlotsByDate((prev) => ({ ...prev, [dateStr]: viewSlots }));
        return viewSlots;
      }

    } catch (err) {
      console.warn('Supabase public availability fetch error:', err);
    }
    return [];
  }, []);

  // Stable refs for activeDate and bookings to prevent channel re-subscription and interval loops
  const activeDateRef = React.useRef(activeDate);
  useEffect(() => {
    activeDateRef.current = activeDate;
  }, [activeDate]);

  const bookingsRef = React.useRef(bookings);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  // Refresh public availability whenever activeDate changes
  useEffect(() => {
    fetchPublicBookedSlots(activeDate);
  }, [activeDate, fetchPublicBookedSlots]);

  // Authoritative admin bookings fetcher (strictly requires active authenticated admin session)
  const fetchAdminBookings = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) return [];

      const { data: dbBookings, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });
      if (!bErr && Array.isArray(dbBookings)) {
        setBookings(dbBookings);
        return dbBookings;
      }
    } catch (err) {
      console.warn('Admin bookings fetch error:', err);
    }
    return [];
  }, []);

  const clearAdminBookings = useCallback(() => {
    setBookings([]);
    setEmailLogs([]);
  }, []);

  // 3. Supabase Realtime Subscription & Live Cloud Hydration (Mount Once)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Fetch initial data from Supabase once on mount
    const fetchCloudData = async () => {
      try {
        // 1. Live Tables & Chairs inventory
        const { data: dbTables, error: tErr } = await supabase
          .from('cafe_tables')
          .select('*')
          .order('id', { ascending: true });
        if (!tErr && dbTables && dbTables.length > 0) {
          setTables(dbTables);
        }

        // 2. Live Artisanal Menu dishes
        const { data: dbMenu, error: mErr } = await supabase
          .from('menu_items')
          .select('*')
          .order('created_at', { ascending: true });
        if (!mErr && dbMenu && dbMenu.length > 0) {
          setMenuItems(dbMenu);
        }

        // 3. Public cafe parameters
        const { data: pubSettings } = await supabase.from('public_cafe_settings').select('*').single();
        if (pubSettings) {
          setCafeSettings((prev) => ({ ...prev, ...pubSettings }));
        }

        // 4. Public booked slots for initial active date (ZERO customer PII)
        await fetchPublicBookedSlots(activeDateRef.current);

        // 5. Check admin session if authenticated (Customer PII is ONLY fetched if an admin is logged in)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const { data: adminSettings } = await supabase.from('cafe_settings').select('*').single();
          if (adminSettings) {
            setCafeSettings({
              ...adminSettings,
              owner_email: adminSettings.owner_email ?? '',
            });
          }
          await fetchAdminBookings();
        }
      } catch (err) {
        console.warn('Supabase fetch error, using hybrid local cache:', err);
      }
    };

    fetchCloudData();

    // Subscribe to cloud changes across bookings, tables, and menu via postgres CDC + Broadcast
    const channel = supabase
      .channel('cafe-cloud-realtime', {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'cafe_activity' }, async (event) => {
        const { type, slot, id, status, date, tables: updatedTables, menuItems: updatedMenu } = event.payload || {};
        if (date) {
          fetchPublicBookedSlots(date);
        }
        if (activeDateRef.current) {
          fetchPublicBookedSlots(activeDateRef.current);
        }

        if (type === 'NEW_BOOKING' && slot) {
          if (slot.booking_date) {
            setBookedSlotsByDate((prev) => ({
              ...prev,
              [slot.booking_date]: [
                ...(prev[slot.booking_date] || []),
                slot,
              ],
            }));
          }
          // Only authenticated admin should hydrate full bookings
          const { data: sData } = await supabase.auth.getSession();
          if (sData?.session?.user) {
            fetchAdminBookings();
            setNewNotificationPulse(true);
          }
        } else if (type === 'UPDATE_BOOKING_STATUS' && id && status) {
          const { data: sData } = await supabase.auth.getSession();
          if (sData?.session?.user) {
            setBookings((prev) =>
              prev.map((b) => (b.id === id ? { ...b, status } : b))
            );
          }
        } else if (type === 'UPDATE_TABLES' && updatedTables) {
          setTables(updatedTables);
        } else if (type === 'UPDATE_MENU_ITEMS' && updatedMenu) {
          setMenuItems(updatedMenu);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
        // 1. Always refresh public availability slots (ZERO customer PII)
        if (activeDateRef.current) {
          fetchPublicBookedSlots(activeDateRef.current);
        }

        // 2. Only update administrative full bookings if an authenticated user session is active
        const { data: sData } = await supabase.auth.getSession();
        if (!sData?.session?.user) return;

        if (payload.eventType === 'INSERT') {
          setBookings((prev) => [payload.new, ...prev.filter((b) => b.id !== payload.new.id)]);
        } else if (payload.eventType === 'UPDATE') {
          setBookings((prev) => prev.map((b) => (b.id === payload.new.id ? payload.new : b)));
        } else if (payload.eventType === 'DELETE') {
          setBookings((prev) => prev.filter((b) => b.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_tables' }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          setTables((prev) => {
            const exists = prev.find((t) => t.id === payload.new.id);
            if (exists) return prev.map((t) => (t.id === payload.new.id ? payload.new : t));
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'DELETE') {
          setTables((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMenuItems((prev) => [payload.new, ...prev.filter((m) => m.id !== payload.new.id)]);
        } else if (payload.eventType === 'UPDATE') {
          setMenuItems((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
        } else if (payload.eventType === 'DELETE') {
          setMenuItems((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPublicBookedSlots]);

  // 4. Availability Engine: Calculates table availability for given date, time, duration & guests
  const calculateTableAvailability = useCallback(
    (targetDate, targetStartTime, targetDurationMinutes, targetGuests = null) => {
      const startMin = timeToMinutes(targetStartTime);
      const endMin = startMin + targetDurationMinutes;
      const buffer = cafeSettings.cleaning_buffer || 15;

      // Check operating hours
      const openMin = timeToMinutes(cafeSettings.opening_time || '08:00');
      const closeMin = timeToMinutes(cafeSettings.closing_time || '23:00');
      let isWithinHours = false;
      if (closeMin > openMin) {
        isWithinHours = startMin >= openMin && endMin <= closeMin;
      } else {
        const effectiveClose = closeMin + 1440;
        const effectiveStart = startMin < closeMin ? startMin + 1440 : startMin;
        const effectiveEnd = effectiveStart + targetDurationMinutes;
        isWithinHours = effectiveStart >= openMin && effectiveEnd <= effectiveClose;
      }

      return tables.map((table) => {
        // Maintenance check
        if (table.status === 'maintenance') {
          return {
            table,
            isAvailable: false,
            isReserved: false,
            isPartiallyAvailable: false,
            isMaintenance: true,
            isCapacityFit: false,
            remainingSeats: 0,
            occupiedSeats: 0,
            reason: 'Under Maintenance',
            activeBooking: null,
            overlappingBookings: [],
          };
        }

        if (!isWithinHours) {
          return {
            table,
            isAvailable: false,
            isReserved: false,
            isPartiallyAvailable: false,
            isMaintenance: false,
            isCapacityFit: false,
            remainingSeats: table.capacity,
            occupiedSeats: 0,
            reason: `Closed (Hours: ${formatTime12h(cafeSettings.opening_time)} - ${formatTime12h(cafeSettings.closing_time)})`,
            activeBooking: null,
            overlappingBookings: [],
          };
        }

        // Merge public slot RPC data and in-session confirmed bookings (Zero PII leak)
        const dateSlots = bookedSlotsByDate[targetDate] || [];
        const relevantSlots = [
          ...dateSlots.filter((s) => s.table_id === table.id && s.status === 'confirmed'),
          ...bookings
            .filter((b) => b.table_id === table.id && b.booking_date === targetDate && b.status === 'confirmed')
            .map((b) => ({
              table_id: b.table_id,
              start_time: b.start_time,
              end_time: b.end_time || minutesToTime(timeToMinutes(b.start_time) + (b.duration_minutes || 90)),
              guest_count: Number(b.guest_count) || 1,
              status: b.status,
            })),
        ];

        // Deduplicate slots by start_time and filter out past grace period bookings
        const seenSlots = new Set();
        const dedupedSlots = [];
        for (const slot of relevantSlots) {
          // AUTO-COMPLETE AVAILABILITY RULE:
          // If 15 minutes have passed since this booking's end time, it is complete and does NOT occupy the table!
          if (isBookingPastGracePeriod(targetDate, slot.end_time, slot.start_time, 90, 15)) {
            continue;
          }
          const key = `${slot.start_time}-${slot.end_time}`;
          if (!seenSlots.has(key)) {
            seenSlots.add(key);
            dedupedSlots.push(slot);
          }
        }

        // Find all overlapping confirmed bookings on this table
        const overlappingBookings = dedupedSlots.filter((b) => {
          const bStart = timeToMinutes(b.start_time);
          const bEnd = timeToMinutes(b.end_time);

          // Overlap check with cleaning buffer
          const bStartBuffered = bStart - buffer;
          const bEndBuffered = bEnd + buffer;

          return startMin < bEndBuffered && endMin > bStartBuffered;
        });

        const activeBooking = overlappingBookings[0] || null;

        // Dedicated Table Policy: Any active overlapping booking reserves the entire table

        // Exclusive Table Mode (Default): Any active overlapping booking reserves the entire table
        const isReserved = Boolean(activeBooking);
        const capacityFit = targetGuests ? table.capacity >= targetGuests : true;
        const isAvailable = !isReserved && capacityFit;
        const remainingSeats = isReserved ? 0 : table.capacity;
        const occupiedSeats = isReserved ? table.capacity : 0;

        let reason = 'Available';
        if (isReserved) {
          reason = `Reserved (${formatTime12h(activeBooking.start_time)} - ${formatTime12h(activeBooking.end_time)})`;
        } else if (!capacityFit) {
          reason = `Capacity Insufficient (Max ${table.capacity} guests)`;
        }

        return {
          table,
          isAvailable,
          isReserved,
          isPartiallyAvailable: false,
          isMaintenance: false,
          isCapacityFit: capacityFit,
          remainingSeats,
          occupiedSeats,
          reason,
          activeBooking,
          overlappingBookings,
        };
      });
    },
    [tables, bookings, bookedSlotsByDate, cafeSettings.cleaning_buffer, cafeSettings.opening_time, cafeSettings.closing_time]
  );

  // Live computed availability for current filter bar values
  const currentTableAvailability = useMemo(() => {
    return calculateTableAvailability(activeDate, activeStartTime, activeDuration, activeGuestCount);
  }, [calculateTableAvailability, activeDate, activeStartTime, activeDuration, activeGuestCount]);

  // Helper to find optimal table automatically (auto-select option from PRD FR-06)
  const findOptimalTable = useCallback(
    (targetGuests, targetDate, targetStartTime, targetDuration) => {
      const avail = calculateTableAvailability(targetDate, targetStartTime, targetDuration, targetGuests);
      const eligible = avail.filter((item) => item.isAvailable);
      if (eligible.length === 0) return null;
      // Sort to find the table that fits best without excessive wasted capacity
      const sorted = [...eligible].sort((a, b) => a.table.capacity - b.table.capacity);
      return sorted[0].table;
    },
    [calculateTableAvailability]
  );

  // 5. Booking Creation with Atomic Concurrency Check
  const createBooking = async (bookingDetails) => {
    const {
      table_id,
      customer_name,
      customer_email,
      customer_phone,
      booking_date,
      start_time,
      duration_minutes,
      guest_count,
      special_notes,
    } = bookingDetails;

    // 1. Rigorous Field Validation
    const nameCheck = validateCustomerName(customer_name);
    if (!nameCheck.valid) {
      return { success: false, error: nameCheck.error };
    }

    const emailCheck = validateCustomerEmail(customer_email);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.error };
    }

    const phoneCheck = validateIndianPhone(customer_phone);
    if (!phoneCheck.valid) {
      return { success: false, error: phoneCheck.error };
    }

    const schedCheck = validateBookingSchedule({
      bookingDate: booking_date,
      startTime: start_time,
      durationMinutes: duration_minutes,
      openingTime: cafeSettings.opening_time || '08:00',
      closingTime: cafeSettings.closing_time || '23:00',
      cutoffBufferMinutes: 70,
    });
    if (!schedCheck.valid) {
      return { success: false, error: schedCheck.error };
    }

    const targetTable = tables.find((t) => t.id === table_id);
    if (!targetTable) {
      return { success: false, error: 'The selected table could not be found.' };
    }

    if (targetTable.status === 'maintenance') {
      return { success: false, error: 'This table is currently undergoing maintenance and cannot be booked.' };
    }

    const guestCheck = validateGuestCount(guest_count, targetTable.capacity);
    if (!guestCheck.valid) {
      return { success: false, error: guestCheck.error };
    }

    const startMin = timeToMinutes(start_time);
    const endMin = startMin + duration_minutes;
    const end_time = schedCheck.endTime;
    const buffer = cafeSettings.cleaning_buffer || 15;

    // 1. Fresh pre-flight check from Supabase RPC get_public_booked_slots for zero race-window
    let candidateSlots = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: freshSlots } = await supabase.rpc('get_public_booked_slots', {
          p_date: booking_date,
        });
        if (Array.isArray(freshSlots)) {
          setBookedSlotsByDate((prev) => ({ ...prev, [booking_date]: freshSlots }));
          candidateSlots = freshSlots;
        }
      } catch {
        // Fallback to cache
      }
    }
    if (candidateSlots.length === 0) {
      candidateSlots = bookedSlotsByDate[booking_date] || [];
    }

    const combinedSlots = [
      ...candidateSlots.filter((s) => s.table_id === table_id && s.status === 'confirmed').map((s) => ({
        table_id: s.table_id,
        start_time: s.start_time,
        end_time: s.end_time || minutesToTime(timeToMinutes(s.start_time) + 90),
        duration_minutes: timeToMinutes(s.end_time) - timeToMinutes(s.start_time) || 90,
        guest_count: Number(s.guest_count) || 1,
        status: s.status,
      })),
      ...bookings.filter((b) => b.table_id === table_id && b.booking_date === booking_date && b.status === 'confirmed'),
    ];

    // Deduplicate slots by start_time & end_time
    const seenMap = new Set();
    const dedupedCandidates = [];
    for (const b of combinedSlots) {
      if (isBookingPastGracePeriod(booking_date, b.end_time, b.start_time, b.duration_minutes || 90, 15)) {
        continue;
      }
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time) || (bStart + (b.duration_minutes || 90));
      const key = `${bStart}-${bEnd}`;
      if (!seenMap.has(key)) {
        seenMap.add(key);
        dedupedCandidates.push({ ...b, bStart, bEnd });
      }
    }

    const overlapping = dedupedCandidates.filter(({ bStart, bEnd }) => {
      const bStartBuffered = bStart - buffer;
      const bEndBuffered = bEnd + buffer;
      return startMin < bEndBuffered && endMin > bStartBuffered;
    });

    if (overlapping.length > 0) {
      const activeConf = overlapping[0];
      return {
        success: false,
        error: `Simultaneous Booking Conflict! Table ${targetTable.name} is already reserved for this time slot (${formatTime12h(activeConf.start_time)} - ${formatTime12h(activeConf.end_time)}). Please choose another table or time.`,
      };
    }

    // Generate collision-resistant booking reference
    const bookingId = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newBooking = {
      id: bookingId,
      table_id,
      table_name: targetTable.name,
      customer_name: nameCheck.value,
      customer_email: emailCheck.value,
      customer_phone: phoneCheck.value || '',
      booking_date,
      start_time,
      end_time,
      duration_minutes,
      guest_count: guestCheck.value,
      status: 'confirmed',
      special_notes: special_notes || '',
      created_at: new Date().toISOString(),
      customer_email_sent: false,
      owner_email_sent: false,
    };

    // If Supabase is connected, call atomic function
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('book_table_atomic', {
          p_booking_id: bookingId,
          p_table_id: table_id,
          p_customer_name: nameCheck.value,
          p_customer_email: emailCheck.value,
          p_customer_phone: phoneCheck.value || '',
          p_booking_date: booking_date,
          p_start_time: start_time,
          p_end_time: end_time,
          p_duration_minutes: duration_minutes,
          p_guest_count: guestCheck.value,
          p_special_notes: special_notes || '',
        });

        if (error || (data && !data.success)) {
          return {
            success: false,
            error: data?.message || error?.message || 'Database validation failed.',
          };
        }
      } catch (err) {
        return {
          success: false,
          error: `Database connection error: ${err.message || 'Unable to store booking'}`,
        };
      }
    } else {
      // Local Demo Mode (isolated from production)
      newBooking.is_demo = true;
    }

    // Update Local State with confirmed booking
    setBookings((prev) => [newBooking, ...prev]);

    // Keep public booked slots in sync across dates for immediate availability calculation
    setBookedSlotsByDate((prev) => ({
      ...prev,
      [booking_date]: [
        ...(prev[booking_date] || []),
        {
          table_id: newBooking.table_id,
          start_time: newBooking.start_time,
          end_time: newBooking.end_time,
          guest_count: newBooking.guest_count,
          status: 'confirmed',
        },
      ],
    }));

    // Initial Email Logs (status: 'queued' or 'unconfigured' - NEVER false 'sent')
    const randSuffix = Math.random().toString(36).substring(2, 9);
    const customerLogId = `em-cust-${Date.now()}-${randSuffix}`;
    const ownerLogId = `em-owner-${Date.now()}-${randSuffix}`;

    const customerLog = {
      id: customerLogId,
      booking_id: bookingId,
      recipient_type: 'customer',
      recipient_email: emailCheck.value,
      subject: `Reservation Confirmed #${bookingId} - ${cafeSettings.name}`,
      status: isSupabaseConfigured ? 'queued' : 'unconfigured',
      submitted_at: null,
      preview_text: `Reservation for ${guestCheck.value} guests at ${targetTable.name} confirmed for ${booking_date} (${formatTime12h(start_time)} - ${formatTime12h(end_time)}).`,
      full_booking: newBooking,
    };

    const ownerLog = {
      id: ownerLogId,
      booking_id: bookingId,
      recipient_type: 'owner',
      recipient_email: cafeSettings.owner_email,
      subject: `🔔 New Booking Alert: ${targetTable.name} #${bookingId}`,
      status: isSupabaseConfigured ? 'queued' : 'unconfigured',
      submitted_at: null,
      preview_text: `New reservation: ${nameCheck.value} (${guestCheck.value} guests) at ${targetTable.name} on ${booking_date} at ${formatTime12h(start_time)}. Phone: ${phoneCheck.value || 'None'}`,
      full_booking: newBooking,
    };

    const newLogs = [customerLog, ownerLog];
    setEmailLogs((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const uniqueNew = newLogs.filter((e) => !seen.has(e.id));
      return [...uniqueNew, ...prev];
    });
    setLatestEmailPayload({ customerLog, ownerLog });
    setNewNotificationPulse(true);

    // Asynchronously dispatch transactional emails when Supabase is configured
    const dispatchNotifications = async () => {
      // In Demo Mode (Supabase unconfigured), never trigger real email dispatch (Issue 1)
      if (!isSupabaseConfigured) {
        return;
      }

      // Customer notification
      try {
        const custRes = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: newBooking.id,
            type: 'customer',
          }),
        });
        const custData = await custRes.json();
        if (custData?.success && custData?.status === 'submitted') {
          setEmailLogs((prev) =>
            prev.map((l) =>
              l.id === customerLogId
                ? {
                    ...l,
                    status: 'submitted',
                    submitted_at: custData.submittedAt,
                    persisted: custData.persisted,
                    persistenceError: custData.persistenceError,
                  }
                : l
            )
          );
          if (custData.persisted !== false) {
            setBookings((prev) =>
              prev.map((b) => (b.id === newBooking.id ? { ...b, customer_email_sent: true } : b))
            );
          }
        } else {
          setEmailLogs((prev) =>
            prev.map((l) =>
              l.id === customerLogId
                ? { ...l, status: custData?.status || 'failed', error: custData?.error }
                : l
            )
          );
        }
      } catch (custErr) {
        setEmailLogs((prev) =>
          prev.map((l) =>
            l.id === customerLogId ? { ...l, status: 'failed', error: custErr.message } : l
          )
        );
      }

      // Owner notification
      try {
        const ownerRes = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: newBooking.id,
            type: 'owner',
          }),
        });
        const ownerData = await ownerRes.json();
        if (ownerData?.success && ownerData?.status === 'submitted') {
          setEmailLogs((prev) =>
            prev.map((l) =>
              l.id === ownerLogId
                ? {
                    ...l,
                    status: 'submitted',
                    submitted_at: ownerData.submittedAt,
                    persisted: ownerData.persisted,
                    persistenceError: ownerData.persistenceError,
                  }
                : l
            )
          );
          if (ownerData.persisted !== false) {
            setBookings((prev) =>
              prev.map((b) => (b.id === newBooking.id ? { ...b, owner_email_sent: true } : b))
            );
          }
        } else {
          setEmailLogs((prev) =>
            prev.map((l) =>
              l.id === ownerLogId
                ? { ...l, status: ownerData?.status || 'failed', error: ownerData?.error }
                : l
            )
          );
        }
      } catch (ownerErr) {
        setEmailLogs((prev) =>
          prev.map((l) =>
            l.id === ownerLogId ? { ...l, status: 'failed', error: ownerErr.message } : l
          )
        );
      }
    };

    dispatchNotifications();

    // Broadcast availability update to all other open tabs and remote devices via Supabase Realtime
    // Customer PII is strictly stripped from public broadcast payloads
    broadcastRealtimeActivity('NEW_BOOKING', {
      slot: {
        table_id: newBooking.table_id,
        booking_date: newBooking.booking_date,
        start_time: newBooking.start_time,
        end_time: newBooking.end_time,
        guest_count: newBooking.guest_count,
        status: 'confirmed',
      },
      date: newBooking.booking_date,
    });

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#e6a147', '#f4ede1', '#bd8157', '#ffffff'],
      });
    } catch {
      // Confetti fallback
    }

    return {
      success: true,
      booking: newBooking,
      isDemo: !isSupabaseConfigured,
      message: isSupabaseConfigured
        ? 'Reservation confirmed! Notification dispatch queued.'
        : 'Reservation confirmed! Your table has been successfully reserved.',
    };
  };

  // 6. Admin Actions (Synchronized directly with Supabase Cloud & Local State)
  const updateBookingStatus = async (bookingId, newStatus) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );
    broadcastRealtimeActivity('UPDATE_BOOKING_STATUS', {
      id: bookingId,
      status: newStatus,
      date: targetBooking?.booking_date || activeDate,
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', bookingId);
        if (error) {
          console.warn('Supabase booking status update error:', error.message);
        }
        await fetchPublicBookedSlots(targetBooking?.booking_date || activeDate);
      } catch (err) {
        console.warn('Booking status update error:', err);
      }
    }
  };

  // Automatic Completion Engine:
  // If 15 minutes have elapsed past a table's scheduled end time, auto-mark the booking as 'completed'
  // so the table is automatically freed for upcoming customers without requiring manual admin intervention.
  const autoCompleteExpiredBookings = useCallback(async () => {
    const currentBookings = bookingsRef.current || [];
    const expiredList = currentBookings.filter(
      (b) =>
        b.status === 'confirmed' &&
        isBookingPastGracePeriod(b.booking_date, b.end_time, b.start_time, b.duration_minutes, 15)
    );

    if (expiredList.length === 0) return;

    const expiredIds = new Set(expiredList.map((b) => b.id));
    setBookings((prev) =>
      prev.map((b) => (expiredIds.has(b.id) ? { ...b, status: 'completed' } : b))
    );

    expiredList.forEach((b) => {
      broadcastEvent('UPDATE_BOOKING_STATUS', { id: b.id, status: 'completed' });
    });

    if (isSupabaseConfigured && supabase) {
      try {
        const idArr = Array.from(expiredIds);
        await supabase
          .from('bookings')
          .update({ status: 'completed' })
          .in('id', idArr);

        if (activeDateRef.current) {
          await fetchPublicBookedSlots(activeDateRef.current);
        }
      } catch (err) {
        console.warn('Auto-complete cloud sync error:', err);
      }
    }
  }, [broadcastEvent, fetchPublicBookedSlots]);

  // Periodic ticker: sweeps every 60 seconds to auto-complete expired tables
  useEffect(() => {
    autoCompleteExpiredBookings();
    const interval = setInterval(() => {
      autoCompleteExpiredBookings();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoCompleteExpiredBookings]);

  // Helper: Retrieve active occupant for any table right now (for Early Checkout in Admin Panel)
  const getTableCurrentOccupant = useCallback(
    (tableId) => {
      const today = getTodayString();
      return (
        bookings.find(
          (b) =>
            b.table_id === tableId &&
            b.booking_date === today &&
            b.status === 'confirmed' &&
            isBookingCurrentlyActive(
              b.booking_date,
              b.start_time,
              b.end_time,
              b.duration_minutes,
              b.status
            )
        ) || null
      );
    },
    [bookings]
  );

  const updateTableCapacity = async (tableId, newCapacity) => {
    const validCap = Math.max(1, Number(newCapacity));
    const updated = tables.map((t) =>
      t.id === tableId ? { ...t, capacity: validCap } : t
    );
    setTables(updated);
    broadcastEvent('UPDATE_TABLES', { tables: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('cafe_tables')
          .update({ capacity: validCap })
          .eq('id', tableId);
        if (error) {
          console.warn('Supabase table capacity update error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.warn('Table capacity update exception:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  };

  const toggleTableMaintenance = async (tableId) => {
    const target = tables.find((t) => t.id === tableId);
    const newStatus = target?.status === 'active' ? 'maintenance' : 'active';
    const updated = tables.map((t) =>
      t.id === tableId ? { ...t, status: newStatus } : t
    );
    setTables(updated);
    broadcastEvent('UPDATE_TABLES', { tables: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('cafe_tables')
          .update({ status: newStatus })
          .eq('id', tableId);
        if (error) {
          console.warn('Supabase table maintenance toggle error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.warn('Table maintenance toggle exception:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  };

  const updateTable = async (tableId, tableData) => {
    const current = tables.find((t) => t.id === tableId);
    if (!current) return { success: false, error: 'Table not found' };

    const updatedTable = {
      ...current,
      name: tableData.name ? tableData.name.trim() : current.name,
      capacity: Math.max(1, Number(tableData.capacity) || current.capacity),
      shape: tableData.shape || current.shape || 'square',
      description: tableData.description !== undefined ? tableData.description.trim() : current.description,
    };

    const updated = tables.map((t) => (t.id === tableId ? updatedTable : t));
    setTables(updated);
    broadcastEvent('UPDATE_TABLES', { tables: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('cafe_tables')
          .update({
            name: updatedTable.name,
            capacity: updatedTable.capacity,
            shape: updatedTable.shape,
            description: updatedTable.description,
          })
          .eq('id', tableId);

        if (error) {
          console.warn('Supabase update table error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.warn('Update table exception:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true, table: updatedTable };
  };

  const addTable = async (newTable) => {
    const tableId = newTable.id || `T${String(tables.length + 1).padStart(2, '0')}`;
    const entry = {
      id: tableId,
      name: newTable.name || `Table ${tableId}`,
      capacity: Math.max(1, Number(newTable.capacity) || 4),
      status: 'active',
      shape: newTable.shape || 'square',
      description: newTable.description || `Table ${tableId} (${newTable.capacity || 4} Chairs)`,
      created_at: new Date().toISOString(),
    };
    const updated = [...tables, entry];
    setTables(updated);
    broadcastEvent('UPDATE_TABLES', { tables: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('cafe_tables').insert({
          id: entry.id,
          name: entry.name,
          capacity: entry.capacity,
          status: entry.status,
          shape: entry.shape,
          description: entry.description,
        });
        if (error) {
          console.warn('Supabase add table error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.warn('Add table exception:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true, table: entry };
  };

  const deleteTable = async (tableId) => {
    const updated = tables.filter((t) => t.id !== tableId);
    setTables(updated);
    broadcastEvent('UPDATE_TABLES', { tables: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('cafe_tables').delete().eq('id', tableId);
        if (error) {
          console.warn('Supabase delete table error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.warn('Delete table exception:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  };

  const updateCafeSettings = async (newSettings) => {
    const hasConfiguredEmail = Boolean(newSettings.owner_email && newSettings.owner_email.trim());
    const updated = {
      ...cafeSettings,
      ...newSettings,
      owner_email_configured: hasConfiguredEmail,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('cafe_settings')
          .update({
            name: updated.name,
            tagline: updated.tagline,
            address: updated.address,
            landmark: updated.landmark,
            phone: updated.phone,
            owner_email: updated.owner_email ? updated.owner_email.trim() : null,
            owner_email_configured: hasConfiguredEmail,
            opening_time: updated.opening_time,
            closing_time: updated.closing_time,
            default_duration: updated.default_duration,
            cleaning_buffer: updated.cleaning_buffer,
            seating_mode: updated.seating_mode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'primary')
          .select();

        if (error) {
          console.error('[Supabase Save Settings Error]:', error.message || error);
          return {
            success: false,
            error: error.message || 'Failed to update cafe settings in database.',
          };
        }

        // Verify that the update actually affected a row (detects RLS blockage or missing primary row)
        if (!data || data.length === 0) {
          console.error('[Supabase Save Settings Error]: No cafe_settings row affected by update.');
          return {
            success: false,
            error: 'Database update failed: No matching settings row found or unauthorized.',
          };
        }

        const confirmedSettings = {
          ...updated,
          ...data[0],
        };

        setCafeSettings(confirmedSettings);
        broadcastEvent('UPDATE_SETTINGS', { settings: confirmedSettings });
        return {
          success: true,
          settings: confirmedSettings,
        };
      } catch (err) {
        console.error('[Supabase Save Settings Exception]:', err);
        return {
          success: false,
          error: err.message || 'Connection error while saving settings.',
        };
      }
    }

    // Only update local state and broadcast when database persistence succeeds (or in Demo mode)
    setCafeSettings(updated);
    broadcastEvent('UPDATE_SETTINGS', { settings: updated });
    return {
      success: true,
      settings: updated,
    };
  };

  const addMenuItem = async (itemData) => {
    const newItem = {
      id: itemData.id || `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (itemData.name || 'New Specialty Dish').trim(),
      category: itemData.category || 'coffee',
      price: Number(itemData.price) || 0,
      description: itemData.description?.trim() || '',
      badge: itemData.badge?.trim() || '',
      image: itemData.image || '/images/menu/cortado.jpg',
      is_available: true,
      created_at: new Date().toISOString(),
    };
    const updated = [newItem, ...menuItems];
    setMenuItems(updated);
    broadcastEvent('UPDATE_MENU_ITEMS', { menuItems: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('menu_items').insert({
          id: newItem.id,
          name: newItem.name,
          category: newItem.category,
          price: newItem.price,
          description: newItem.description,
          badge: newItem.badge,
          image: newItem.image,
          is_available: newItem.is_available,
        });
        if (error) {
          console.warn('Supabase add menu item error:', error.message);
        }
      } catch (err) {
        console.warn('Add menu item exception:', err);
      }
    }
    return newItem;
  };

  const updateMenuItem = async (itemId, itemData) => {
    const current = menuItems.find((m) => m.id === itemId);
    if (!current) return { success: false, error: 'Dish not found' };

    const updatedDish = {
      ...current,
      name: itemData.name !== undefined ? itemData.name.trim() : current.name,
      category: itemData.category || current.category,
      price: itemData.price !== undefined ? Number(itemData.price) : current.price,
      description: itemData.description !== undefined ? itemData.description.trim() : current.description,
      badge: itemData.badge !== undefined ? itemData.badge.trim() : current.badge,
      image: itemData.image || current.image,
      is_available: itemData.is_available !== undefined ? Boolean(itemData.is_available) : current.is_available,
    };

    const updated = menuItems.map((m) => (m.id === itemId ? updatedDish : m));
    setMenuItems(updated);
    broadcastEvent('UPDATE_MENU_ITEMS', { menuItems: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: updatedDish.name,
            category: updatedDish.category,
            price: updatedDish.price,
            description: updatedDish.description,
            badge: updatedDish.badge,
            image: updatedDish.image,
            is_available: updatedDish.is_available,
          })
          .eq('id', itemId);

        if (error) {
          console.warn('Supabase update menu item error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.warn('Update menu item exception:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true, item: updatedDish };
  };

  const deleteMenuItem = async (itemId) => {
    const updated = menuItems.filter((item) => item.id !== itemId);
    setMenuItems(updated);
    broadcastEvent('UPDATE_MENU_ITEMS', { menuItems: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
        if (error) {
          console.warn('Supabase delete menu item error:', error.message);
        }
      } catch (err) {
        console.warn('Delete menu item exception:', err);
      }
    }
  };

  const toggleMenuItemAvailability = async (itemId) => {
    const current = menuItems.find((m) => m.id === itemId);
    const newAvail = current?.is_available === false ? true : false;
    const updated = menuItems.map((item) =>
      item.id === itemId ? { ...item, is_available: newAvail } : item
    );
    setMenuItems(updated);
    broadcastEvent('UPDATE_MENU_ITEMS', { menuItems: updated });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('menu_items')
          .update({ is_available: newAvail })
          .eq('id', itemId);
        if (error) {
          console.warn('Supabase toggle availability error:', error.message);
        }
      } catch (err) {
        console.warn('Toggle menu item availability exception:', err);
      }
    }
  };

  const resetToDefaultData = () => {
    setTables(DEFAULT_TABLES);
    setBookings(INITIAL_SAMPLE_BOOKINGS);
    setCafeSettings(DEFAULT_CAFE_SETTINGS);
    setMenuItems(DEFAULT_MENU_ITEMS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('laura_cafe_tables');
      localStorage.removeItem('laura_cafe_bookings');
      localStorage.removeItem('laura_cafe_settings');
      localStorage.removeItem('laura_cafe_menu_items');
    }
    broadcastEvent('UPDATE_TABLES', { tables: DEFAULT_TABLES });
    broadcastEvent('UPDATE_SETTINGS', { settings: DEFAULT_CAFE_SETTINGS });
    broadcastEvent('UPDATE_MENU_ITEMS', { menuItems: DEFAULT_MENU_ITEMS });
  };

  const openBookingForTable = (tableId) => {
    setPreselectedTableId(tableId);
    setIsBookingModalOpen(true);
  };

  return (
    <CafeContext.Provider
      value={{
        cafeSettings,
        tables,
        bookings,
        emailLogs,
        menuItems,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        toggleMenuItemAvailability,
        activeDate,
        setActiveDate,
        activeStartTime,
        setActiveStartTime,
        activeDuration,
        setActiveDuration,
        activeGuestCount,
        setActiveGuestCount,
        currentTableAvailability,
        calculateTableAvailability,
        findOptimalTable,
        fetchPublicBookedSlots,
        bookedSlotsByDate,
        publicBookedSlots,
        createBooking,
        updateBookingStatus,
        autoCompleteExpiredBookings,
        getTableCurrentOccupant,
        isBookingPastGracePeriod,
        isBookingCurrentlyActive,
        updateTableCapacity,
        toggleTableMaintenance,
        updateTable,
        addTable,
        deleteTable,
        updateCafeSettings,
        resetToDefaultData,
        isBookingModalOpen,
        setIsBookingModalOpen,
        preselectedTableId,
        setPreselectedTableId,
        openBookingForTable,
        isAdminOpen,
        setIsAdminOpen,
        isEmailCenterOpen,
        setIsEmailCenterOpen,
        latestEmailPayload,
        setLatestEmailPayload,
        newNotificationPulse,
        setNewNotificationPulse,
        fetchAdminBookings,
        clearAdminBookings,
        isSupabaseConfigured,
      }}
    >
      {children}
    </CafeContext.Provider>
  );
};

export const useCafe = () => {
  const context = useContext(CafeContext);
  if (!context) {
    throw new Error('useCafe must be used within a CafeProvider');
  }
  return context;
};
