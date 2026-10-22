/**
 * Reusable validation rules for Cafe Reservation System
 * Adheres strictly to Phase 3 requirements for client and server validation.
 */

/**
 * Validate customer full name
 * - Required
 * - Trim whitespace
 * - Reject empty or whitespace-only
 * - Max length 60 characters
 * - Reject control characters
 * - Allows Unicode characters (Bengali, accents, etc.), spaces, hyphens, apostrophes
 */
export function validateCustomerName(name) {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Customer name is required.' };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter your full name.' };
  }
  if (trimmed.length > 60) {
    return { valid: false, error: 'Name must not exceed 60 characters.' };
  }
  // Reject control characters (\x00-\x1F, \x7F)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid control characters.' };
  }
  // Allow letters from any language, spaces, dots, hyphens, and apostrophes
  const validNameRegex = /^[\p{L}\p{M}\s.'-]+$/u;
  if (!validNameRegex.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters.' };
  }
  return { valid: true, value: trimmed };
}

/**
 * Validate customer email address
 * - Required
 * - Normalized whitespace
 * - Valid format
 * - Max length 120 characters
 */
export function validateCustomerEmail(email) {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: 'Email address is required.' };
  }
  if (trimmed.length > 120) {
    return { valid: false, error: 'Email must not exceed 120 characters.' };
  }
  // Standard strict email pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  return { valid: true, value: trimmed.toLowerCase() };
}

/**
 * Validate Indian mobile number
 * Prototype rule:
 * - Exactly 10 digits
 * - Digits only 0-9
 * - First digit must be between 6 and 9
 * - Rejects letters, symbols, spaces, prefixes (+91 or 0), fewer/more than 10 digits
 */
export function validateIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: true, value: '' }; // Optional, but if provided must be strictly valid
  }
  const trimmed = phone.trim();
  if (!trimmed) {
    return { valid: true, value: '' };
  }

  // Check for any non-digit
  if (/\D/.test(trimmed)) {
    return {
      valid: false,
      error: 'Phone number must contain digits only (no spaces, dashes, or country codes).',
    };
  }

  if (trimmed.length < 10) {
    return {
      valid: false,
      error: 'Indian mobile number must be exactly 10 digits (too short).',
    };
  }

  if (trimmed.length > 10) {
    return {
      valid: false,
      error: 'Indian mobile number must be exactly 10 digits (too long).',
    };
  }

  const firstDigit = trimmed[0];
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return {
      valid: false,
      error: 'Indian mobile number must start with 6, 7, 8, or 9.',
    };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate party size / guest count
 * - Positive integer
 * - Up to table chair capacity
 */
export function validateGuestCount(count, tableCapacity) {
  const num = Number(count);
  if (!Number.isInteger(num) || num <= 0) {
    return { valid: false, error: 'Guest count must be a positive integer.' };
  }
  if (tableCapacity && num > tableCapacity) {
    return {
      valid: false,
      error: `Selected table cannot accommodate ${num} guests (capacity: ${tableCapacity} chairs).`,
    };
  }
  return { valid: true, value: num };
}

// Helper: Format "HH:mm" to "6:00 PM"
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

// Helper: Convert total minutes to "HH:mm"
function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Validate booking date and times against cafe operating hours
 * Enforces:
 *  - 1 hour 10 minutes (70 mins) pre-closing cutoff window.
 *  - Clear, user-friendly error messages when remaining time until closing is less than requested duration.
 */
export function validateBookingSchedule({
  bookingDate,
  startTime,
  durationMinutes,
  openingTime = '08:00',
  closingTime = '23:00',
  cutoffBufferMinutes = 0,
}) {
  if (!bookingDate) {
    return { valid: false, error: 'Booking date is required.' };
  }

  // Check if date is in the past (comparing YYYY-MM-DD in local time)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (bookingDate < todayStr) {
    return { valid: false, error: 'Booking date cannot be in the past.' };
  }

  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
    return { valid: false, error: 'Valid start time is required.' };
  }

  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 30 || duration > 240) {
    return { valid: false, error: 'Duration must be between 30 and 240 minutes.' };
  }

  const [sHours, sMinutes] = startTime.split(':').map(Number);
  const startTotalMinutes = sHours * 60 + sMinutes;
  const endTotalMinutes = startTotalMinutes + duration;

  // Check if start time has already passed for today
  if (bookingDate === todayStr) {
    const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();
    if (startTotalMinutes <= currentTotalMinutes) {
      return {
        valid: false,
        error: 'Selected start time has already passed for today. Please select an upcoming time slot or a future date.',
      };
    }
  }

  const [oHours, oMinutes] = openingTime.split(':').map(Number);
  const openingTotalMinutes = oHours * 60 + oMinutes;

  const [cHours, cMinutes] = closingTime.split(':').map(Number);
  const closingTotalMinutes = cHours * 60 + cMinutes;

  // Compute effective start and closing times (handling daytime or overnight wrap)
  let isOvernight = closingTotalMinutes <= openingTotalMinutes;
  let effectiveOpening = openingTotalMinutes;
  let effectiveClosing = isOvernight ? closingTotalMinutes + 1440 : closingTotalMinutes;
  let effectiveStart = isOvernight && startTotalMinutes < closingTotalMinutes ? startTotalMinutes + 1440 : startTotalMinutes;
  let effectiveEnd = effectiveStart + duration;

  if (effectiveStart < effectiveOpening) {
    return { valid: false, error: `Reservation starts before opening time (${formatTime12h(openingTime)}).` };
  }

  // Enforce 1 hour and 10 minutes (70 mins) cutoff before closing
  const activeCutoffBuffer = cutoffBufferMinutes > 0 ? cutoffBufferMinutes : (bookingDate === todayStr ? 70 : 0);
  const cutoffThreshold = effectiveClosing - activeCutoffBuffer;

  if (activeCutoffBuffer > 0 && effectiveStart > cutoffThreshold) {
    if (bookingDate === todayStr) {
      return {
        valid: false,
        error: 'Booking closed for today. Come back next time!',
      };
    }
    const latestAvailableTime = minutesToTime(cutoffThreshold);
    return {
      valid: false,
      error: `Bookings close 1 hour and 10 minutes before closing time (${formatTime12h(closingTime)}). The latest available booking slot is ${formatTime12h(latestAvailableTime)}.`,
    };
  }

  // Check if reservation extends past closing time
  if (effectiveEnd > effectiveClosing) {
    const remainingMins = Math.max(0, effectiveClosing - effectiveStart);
    const remHours = Math.floor(remainingMins / 60);
    const remMinsLeft = remainingMins % 60;
    const timeRemainingStr = remHours > 0
      ? `${remHours} hour${remHours > 1 ? 's' : ''}${remMinsLeft > 0 ? ` ${remMinsLeft} mins` : ''}`
      : `${remMinsLeft} minutes`;

    const requestedDurHours = duration / 60;
    const requestedStr = requestedDurHours >= 1
      ? `${requestedDurHours === 1 ? '1 hour' : `${requestedDurHours} hours`}`
      : `${duration} mins`;

    return {
      valid: false,
      error: `The cafe closes at ${formatTime12h(closingTime)} (only ${timeRemainingStr} remaining). Your requested duration of ${requestedStr} extends past closing time. Please select a shorter duration or an earlier start time.`,
    };
  }

  // Calculate formatted end time HH:MM (handling 24-hour wrap)
  const endHours = Math.floor(endTotalMinutes / 60) % 24;
  const endMins = endTotalMinutes % 60;
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

  return {
    valid: true,
    startTime,
    endTime,
    durationMinutes: duration,
  };
}
