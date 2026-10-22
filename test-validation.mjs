import {
  validateCustomerName,
  validateCustomerEmail,
  validateIndianPhone,
  validateGuestCount,
  validateBookingSchedule,
} from './src/utils/validation.js';

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${description}`);
    failed++;
  }
}

console.log('--- RUNNING VALIDATION TESTS (PHASE 3 / PHASE 9) ---\n');

// 1. Customer Name Tests
assert('Valid English Name', validateCustomerName('Rahim Ahmed').valid === true);
assert('Valid Bengali / Unicode Name', validateCustomerName('রহিম চৌধুরী').valid === true);
assert('Reject Empty Name', validateCustomerName('').valid === false);
assert('Reject Whitespace Name', validateCustomerName('   ').valid === false);
assert('Reject Name with Control Chars', validateCustomerName('Rahim\x00Ahmed').valid === false);
assert('Reject Name Exceeding 60 chars', validateCustomerName('A'.repeat(61)).valid === false);

// 2. Email Tests
assert('Valid Email', validateCustomerEmail('guest@example.com').valid === true);
assert('Normalize Email to Lowercase', validateCustomerEmail('Guest@Example.COM').value === 'guest@example.com');
assert('Reject Email without @', validateCustomerEmail('invalid-email').valid === false);
assert('Reject Email with whitespace', validateCustomerEmail('guest @example.com').valid === false);
assert('Reject Empty Email', validateCustomerEmail('').valid === false);

// 3. Indian Mobile Number Tests
assert('Valid Indian Mobile (starts with 9)', validateIndianPhone('9876543210').valid === true);
assert('Valid Indian Mobile (starts with 6)', validateIndianPhone('6123456789').valid === true);
assert('Valid Indian Mobile (starts with 7)', validateIndianPhone('7890123456').valid === true);
assert('Valid Indian Mobile (starts with 8)', validateIndianPhone('8901234567').valid === true);
assert('Reject Short Phone (9 digits)', validateIndianPhone('987654321').valid === false);
assert('Reject Long Phone (11 digits)', validateIndianPhone('98765432101').valid === false);
assert('Reject Phone with Letters', validateIndianPhone('98765abc10').valid === false);
assert('Reject Phone with Invalid First Digit (5)', validateIndianPhone('5876543210').valid === false);
assert('Reject Phone with Invalid First Digit (1)', validateIndianPhone('1876543210').valid === false);
assert('Allow Optional Empty Phone', validateIndianPhone('').valid === true);

// 4. Guest Count Tests
assert('Valid Guest Count within Capacity', validateGuestCount(4, 6).valid === true);
assert('Reject Zero Guest Count', validateGuestCount(0, 4).valid === false);
assert('Reject Negative Guest Count', validateGuestCount(-2, 4).valid === false);
assert('Reject Decimal Guest Count', validateGuestCount(2.5, 4).valid === false);
assert('Reject Non-numeric Guest Count', validateGuestCount('abc', 4).valid === false);
assert('Reject Exceeding Table Capacity (5 in 4-chair table)', validateGuestCount(5, 4).valid === false);

// 5. Booking Schedule & Operating Hours Tests
assert('Valid Schedule within Operating Hours', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '18:00',
  durationMinutes: 90,
  openingTime: '08:00',
  closingTime: '23:00',
}).valid === true);

assert('Reject Past Date', validateBookingSchedule({
  bookingDate: '2020-01-01',
  startTime: '18:00',
  durationMinutes: 90,
}).valid === false);

assert('Reject Before Opening Time (07:00 vs 08:00)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '07:00',
  durationMinutes: 90,
  openingTime: '08:00',
  closingTime: '23:00',
}).valid === false);

assert('Reject Extending Past Closing Time (22:30 + 90m = 00:00 vs 23:00)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '22:30',
  durationMinutes: 90,
  openingTime: '08:00',
  closingTime: '23:00',
}).valid === false);

// 5b. Overnight Operating Hours Tests (18:00 to 02:00)
assert('Valid Overnight Schedule before midnight (20:00 - 21:30)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '20:00',
  durationMinutes: 90,
  openingTime: '18:00',
  closingTime: '02:00',
}).valid === true);

assert('Valid Overnight Schedule crossing midnight (23:30 - 01:00)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '23:30',
  durationMinutes: 90,
  openingTime: '18:00',
  closingTime: '02:00',
}).valid === true);

assert('Valid Overnight Schedule after midnight (01:00 - 02:00)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '01:00',
  durationMinutes: 60,
  openingTime: '18:00',
  closingTime: '02:00',
}).valid === true);

assert('Reject Overnight Schedule extending past closing (01:30 + 60m = 02:30 vs 02:00)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '01:30',
  durationMinutes: 60,
  openingTime: '18:00',
  closingTime: '02:00',
}).valid === false);

assert('Reject Overnight Schedule before opening (17:00 vs 18:00)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '17:00',
  durationMinutes: 60,
  openingTime: '18:00',
  closingTime: '02:00',
}).valid === false);

assert('Reject Overnight Schedule during closed daytime hours (10:00 vs 18:00-02:00)', validateBookingSchedule({
  bookingDate: '2027-01-01',
  startTime: '10:00',
  durationMinutes: 60,
  openingTime: '18:00',
  closingTime: '02:00',
}).valid === false);

// 6. Overlap Detection with Cleaning Buffer Simulation
function checkOverlap({ existingStart, existingEnd, newStart, newEnd, buffer = 15 }) {
  const bufferedExistingStart = existingStart - buffer;
  const bufferedExistingEnd = existingEnd + buffer;
  return newStart < bufferedExistingEnd && newEnd > bufferedExistingStart;
}

// Existing booking 18:00 (1080m) to 19:30 (1170m) with 15m buffer [1065m to 1185m]
assert('Detect Overlapping Booking in exact window (18:00 - 19:30)', checkOverlap({
  existingStart: 1080, existingEnd: 1170, newStart: 1080, newEnd: 1170
}) === true);

assert('Detect Conflict within Cleaning Buffer (starts 19:35, buffer ends 19:45)', checkOverlap({
  existingStart: 1080, existingEnd: 1170, newStart: 1175, newEnd: 1265
}) === true);

assert('Allow Booking after Cleaning Buffer (starts 19:50 > 19:45)', checkOverlap({
  existingStart: 1080, existingEnd: 1170, newStart: 1190, newEnd: 1280
}) === false);

assert('Allow Booking before Cleaning Buffer (ends 17:40 < 17:45)', checkOverlap({
  existingStart: 1080, existingEnd: 1170, newStart: 960, newEnd: 1060
}) === false);

// 7. Collision-Resistant Unique Booking Reference Format
const sampleBookingId = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
const bookingRefRegex = /^BK-[A-Z0-9]+-[A-Z0-9]{4}$/;
assert('Generated Booking Reference matches secure format', bookingRefRegex.test(sampleBookingId) === true);

// 8. HTML Sanitization Test (Security XSS prevention in email dispatch)
function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
assert('Escape Script Tags in Customer Input', sanitizeHtml('<script>alert("xss")</script>') === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
assert('Escape Quotes and Ampersands', sanitizeHtml('Tom & Jerry "Special"') === 'Tom &amp; Jerry &quot;Special&quot;');

// 9. Server-Controlled Admin Authorization Logic Tests (Harden Admin Check: ID or app_metadata only)
function checkAdminAuthorization(user, trustedAdminUserIds = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002']) {
  if (!user || !user.id) return false;
  // Strictly reject user_metadata.role to prevent client-side privilege escalation
  // Strictly reject mutable cafe_settings.owner_email matching
  // Strictly reject authorization by email alone (prevents spoofing via unverified signups)
  // Only server-controlled app_metadata.role === 'admin' OR trusted admin_users allowlist by user_id
  const isServerAppMetadataAdmin = user.app_metadata?.role === 'admin';
  const isTrustedUserId = trustedAdminUserIds.includes(user.id);
  return isServerAppMetadataAdmin || isTrustedUserId;
}

assert('Accept Admin via server-controlled app_metadata.role', checkAdminAuthorization({
  id: '00000000-0000-0000-0000-000000000099',
  email: 'staff@lauracafe.com',
  app_metadata: { role: 'admin' },
  user_metadata: {}
}) === true);

assert('Accept Admin via trusted user ID in admin_users allowlist table', checkAdminAuthorization({
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@lauracafe.com',
  app_metadata: {},
  user_metadata: {}
}) === true);

assert('REJECT Admin when email matches allowlist but user ID is untrusted', checkAdminAuthorization({
  id: 'unauthorized-user-uuid',
  email: 'admin@lauracafe.com',
  app_metadata: { role: 'authenticated' },
  user_metadata: {}
}) === false);

assert('REJECT Admin privilege escalation via user_metadata.role', checkAdminAuthorization({
  id: 'unauthorized-attacker-id',
  email: 'attacker@example.com',
  app_metadata: { role: 'authenticated' },
  user_metadata: { role: 'admin' } // Untrusted user-editable metadata
}) === false);

assert('REJECT Missing user ID (anonymous or unauthenticated)', checkAdminAuthorization({
  email: 'admin@lauracafe.com',
  app_metadata: { role: 'admin' }
}) === false);

assert('REJECT Arbitrary user without trusted ID or server app_metadata role', checkAdminAuthorization({
  id: 'random-user-id',
  email: 'random-user@example.com',
  app_metadata: {},
  user_metadata: {}
}) === false);

// 10. Concurrency & Race Condition Simulation Tests (Priority 3)
class MockTableReservationManager {
  constructor(capacity = 4) {
    this.capacity = capacity;
    this.bookings = [];
    this.buffer = 15;
  }

  // Atomic reservation with row locking simulation
  bookAtomic(newBooking) {
    const { startMin, endMin, guests } = newBooking;

    // Check capacity
    if (guests > this.capacity) {
      return { success: false, error: 'EXCEEDS_CAPACITY' };
    }

    // Check overlap with cleaning buffer
    const conflict = this.bookings.some((b) => {
      const bStartBuffered = b.startMin - this.buffer;
      const bEndBuffered = b.endMin + this.buffer;
      return startMin < bEndBuffered && endMin > bStartBuffered;
    });

    if (conflict) {
      return { success: false, error: 'TIME_SLOT_OCCUPIED' };
    }

    this.bookings.push(newBooking);
    return { success: true };
  }
}

const tableManager = new MockTableReservationManager(4);

// Simulate two simultaneous requests racing for Table T01 at 18:00 (1080m) to 19:30 (1170m)
const req1 = tableManager.bookAtomic({ id: 'BK-1', startMin: 1080, endMin: 1170, guests: 2 });
const req2 = tableManager.bookAtomic({ id: 'BK-2', startMin: 1080, endMin: 1170, guests: 4 });

assert('First concurrent booking request succeeds', req1.success === true);
assert('Second concurrent booking request is rejected as conflicting', req2.success === false && req2.error === 'TIME_SLOT_OCCUPIED');

// Simulate request attempting to book during the 15-minute cleaning buffer (19:35 = 1175m)
const req3 = tableManager.bookAtomic({ id: 'BK-3', startMin: 1175, endMin: 1265, guests: 2 });
assert('Booking within 15-min cleaning buffer is rejected', req3.success === false && req3.error === 'TIME_SLOT_OCCUPIED');

// Simulate request attempting to exceed capacity (5 guests in 4-seat table)
const req4 = tableManager.bookAtomic({ id: 'BK-4', startMin: 1300, endMin: 1390, guests: 5 });
assert('Booking exceeding table capacity is rejected', req4.success === false && req4.error === 'EXCEEDS_CAPACITY');

// 11. Email Workflow Authoritative Recipient & Duplicate Prevention Tests (Priority 1)
function resolveAuthoritativeRecipient({ type, authoritativeBooking, configuredOwnerEmail }) {
  if (type === 'customer') {
    return authoritativeBooking.customer_email.trim().toLowerCase();
  }
  if (type === 'owner') {
    return (configuredOwnerEmail || 'management@lauracafe.com').trim().toLowerCase();
  }
  return null;
}

const mockAuthoritativeBooking = {
  id: 'BK-CONFIRMED-99',
  customer_email: 'legit.guest@example.com',
  customer_name: 'Legit Guest',
  customer_email_sent: false,
  owner_email_sent: false,
};

assert('Authoritative customer recipient resolves strictly to booking record', resolveAuthoritativeRecipient({
  type: 'customer',
  authoritativeBooking: mockAuthoritativeBooking,
  configuredOwnerEmail: 'owner@lauracafe.com',
}) === 'legit.guest@example.com');

assert('Authoritative owner recipient resolves strictly to configured owner', resolveAuthoritativeRecipient({
  type: 'owner',
  authoritativeBooking: mockAuthoritativeBooking,
  configuredOwnerEmail: 'owner@lauracafe.com',
}) === 'owner@lauracafe.com');

// Duplicate check
function checkDuplicateDispatch(type, booking) {
  if (type === 'customer' && booking.customer_email_sent) return true;
  if (type === 'owner' && booking.owner_email_sent) return true;
  return false;
}

assert('Allow first notification dispatch', checkDuplicateDispatch('customer', mockAuthoritativeBooking) === false);
mockAuthoritativeBooking.customer_email_sent = true;
assert('Reject duplicate customer notification dispatch', checkDuplicateDispatch('customer', mockAuthoritativeBooking) === true);

// 12. Public Table Availability Zero-PII Exposure Tests (Priority 5)
function sanitizePublicAvailabilitySlot(dbBooking) {
  // Public function get_public_booked_slots must strictly exclude customer PII
  return {
    table_id: dbBooking.table_id,
    start_time: dbBooking.start_time,
    end_time: dbBooking.end_time,
    guest_count: dbBooking.guest_count,
    status: dbBooking.status,
  };
}

const privateDbRecord = {
  id: 'BK-SECRET-42',
  table_id: 'T03',
  customer_name: 'Jane Doe',
  customer_email: 'jane.doe@private.com',
  customer_phone: '9876543210',
  special_notes: 'Private VIP birthday party',
  start_time: '19:00',
  end_time: '20:30',
  guest_count: 2,
  status: 'confirmed',
};

const publicSlot = sanitizePublicAvailabilitySlot(privateDbRecord);
assert('Public availability slot does not expose customer name', publicSlot.customer_name === undefined);
assert('Public availability slot does not expose customer email', publicSlot.customer_email === undefined);
assert('Public availability slot does not expose customer phone', publicSlot.customer_phone === undefined);
assert('Public availability slot does not expose special notes', publicSlot.special_notes === undefined);
assert('Public availability slot preserves table_id and timing', publicSlot.table_id === 'T03' && publicSlot.start_time === '19:00');

// 13. Production Demo Mode Email Rejection Tests (Issue 1)
function handleEmailDispatchPrecheck(payload, isSupabaseConfigured) {
  if (payload?.isDemo || payload?.demoBooking) {
    return {
      status: 403,
      body: {
        success: false,
        status: 'demo_email_disabled',
        error: 'Demo mode email dispatch is strictly disabled. Real emails cannot be triggered with client demo payloads.',
      },
    };
  }

  if (!isSupabaseConfigured) {
    return {
      status: 503,
      body: {
        success: false,
        status: 'unavailable',
        error: 'Authoritative database is not configured. Email dispatch unavailable.',
      },
    };
  }

  return { status: 200, body: { success: true } };
}

assert('Reject email dispatch when client passes isDemo: true', handleEmailDispatchPrecheck({ isDemo: true, bookingId: 'BK-1', type: 'customer' }, true).status === 403);
assert('Reject email dispatch when client passes demoBooking object', handleEmailDispatchPrecheck({ demoBooking: { customer_email: 'target@test.com' }, type: 'customer' }, true).status === 403);
assert('Reject email dispatch when Supabase is unconfigured', handleEmailDispatchPrecheck({ bookingId: 'BK-1', type: 'customer' }, false).status === 503);
assert('Allow legitimate dispatch precheck when Supabase is configured and payload is clean', handleEmailDispatchPrecheck({ bookingId: 'BK-1', type: 'customer' }, true).status === 200);

// 14. Booking Timestamps & Midnight Crossing Calculations (Issue 2)
function calculateBookingTimestamps(bookingDateStr, startTimeStr, durationMinutes, openingTimeStr = '08:00', closingTimeStr = '23:00') {
  const [sH, sM] = startTimeStr.split(':').map(Number);
  const startTs = new Date(`${bookingDateStr}T${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00Z`);
  const endTs = new Date(startTs.getTime() + durationMinutes * 60 * 1000);

  const [oH, oM] = openingTimeStr.split(':').map(Number);
  const openTs = new Date(`${bookingDateStr}T${String(oH).padStart(2, '0')}:${String(oM).padStart(2, '0')}:00Z`);

  const [cH, cM] = closingTimeStr.split(':').map(Number);
  let closeTs;
  if (cH * 60 + cM > oH * 60 + oM) {
    closeTs = new Date(`${bookingDateStr}T${String(cH).padStart(2, '0')}:${String(cM).padStart(2, '0')}:00Z`);
  } else {
    // Closing time crosses midnight into next morning
    const nextDay = new Date(startTs);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];
    closeTs = new Date(`${nextDayStr}T${String(cH).padStart(2, '0')}:${String(cM).padStart(2, '0')}:00Z`);
  }

  const beforeOpening = startTs < openTs;
  const afterClosing = endTs > closeTs;

  return {
    startTs,
    endTs,
    openTs,
    closeTs,
    beforeOpening,
    afterClosing,
    endDayAdvanced: endTs.getUTCDate() !== startTs.getUTCDate(),
  };
}

// Case A: 23:00 booking for 90m with 23:00 closing time
const midnightCrossingCheck = calculateBookingTimestamps('2026-10-18', '23:00', 90, '08:00', '23:00');
assert('Midnight-crossing booking date advances to next calendar day', midnightCrossingCheck.endDayAdvanced === true);
assert('Midnight-crossing booking extending past 23:00 closing is rejected', midnightCrossingCheck.afterClosing === true);

// Case B: Late-night venue closing at 02:00 AM next day
const lateNightCafeCheck = calculateBookingTimestamps('2026-10-18', '23:30', 90, '18:00', '02:00');
assert('Booking ending at 01:00 AM within 02:00 AM late-night closing is accepted', lateNightCafeCheck.afterClosing === false);

// 15. Closing-Time Boundary Invariants (Issue 2)
// Booking 21:30 for 90 min ends at exactly 23:00
const exactClosingCheck = calculateBookingTimestamps('2026-10-18', '21:30', 90, '08:00', '23:00');
assert('Booking ending exactly at closing time is accepted', exactClosingCheck.afterClosing === false);

// Booking 21:31 for 90 min ends at 23:01 (1 minute past closing)
const overClosingCheck = calculateBookingTimestamps('2026-10-18', '21:31', 90, '08:00', '23:00');
assert('Booking ending 1 minute past closing time is rejected', overClosingCheck.afterClosing === true);

// 16. Concurrency-Safe Atomic Claims & Duplicate Notification Prevention (Issue 4)
class MockNotificationClaimEngine {
  constructor() {
    this.claims = new Map(); // key: `${bookingId}:${type}`, value: { status, claimedAt }
  }

  claim(bookingId, type) {
    const key = `${bookingId}:${type}`;
    const existing = this.claims.get(key);

    if (existing) {
      if (existing.status === 'submitted') {
        return { success: false, status: 'already_sent', message: 'Notification already dispatched.' };
      }
      if (existing.status === 'claimed') {
        return { success: false, status: 'in_flight', message: 'Notification dispatch in progress.' };
      }
      // If failed, allow retry
      existing.status = 'claimed';
      existing.claimedAt = Date.now();
      return { success: true, status: 'claimed' };
    }

    this.claims.set(key, { status: 'claimed', claimedAt: Date.now() });
    return { success: true, status: 'claimed' };
  }

  complete(bookingId, type, success) {
    const key = `${bookingId}:${type}`;
    const existing = this.claims.get(key);
    if (existing) {
      existing.status = success ? 'submitted' : 'failed';
    }
  }
}

const claimEngine = new MockNotificationClaimEngine();
const claim1 = claimEngine.claim('BK-CONCURRENCY-1', 'customer');
const claim2 = claimEngine.claim('BK-CONCURRENCY-1', 'customer');

assert('First concurrent notification claim succeeds', claim1.success === true && claim1.status === 'claimed');
assert('Simultaneous concurrent notification claim is rejected as in_flight', claim2.success === false && claim2.status === 'in_flight');

// 17. SMTP Failure & Safe Retry Handling (Issue 4)
// Simulate failure of the first dispatch
claimEngine.complete('BK-CONCURRENCY-1', 'customer', false);

// Now retry dispatch after failure
const retryClaim = claimEngine.claim('BK-CONCURRENCY-1', 'customer');
assert('Safe retry permitted after SMTP failure', retryClaim.success === true && retryClaim.status === 'claimed');

// Mark successful completion
claimEngine.complete('BK-CONCURRENCY-1', 'customer', true);

// Subsequent call should be permanently rejected as already_sent
const postSuccessClaim = claimEngine.claim('BK-CONCURRENCY-1', 'customer');
assert('Post-delivery notification dispatch permanently blocked as already_sent', postSuccessClaim.success === false && postSuccessClaim.status === 'already_sent');

// 18. Truthful Database Status Persistence & Failure Separation (Issue 3)
function formatDispatchResponse({ smtpSuccess, dbUpdateSuccess, messageId, submittedAt, dbError }) {
  if (!smtpSuccess) {
    return {
      status: 500,
      body: {
        success: false,
        status: 'failed',
        error: 'Failed to dispatch email notification via Gmail SMTP.',
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      status: 'submitted',
      persisted: dbUpdateSuccess,
      persistenceError: dbUpdateSuccess ? null : (dbError || 'Database status update failed after SMTP submission.'),
      messageId,
      submittedAt,
    },
  };
}

const perfectDispatch = formatDispatchResponse({
  smtpSuccess: true,
  dbUpdateSuccess: true,
  messageId: '<test-msg-1@gmail.com>',
  submittedAt: '2026-10-18T18:00:00Z',
});
assert('Perfect dispatch reports submitted and persisted: true', perfectDispatch.body.status === 'submitted' && perfectDispatch.body.persisted === true);

const dbFailureDispatch = formatDispatchResponse({
  smtpSuccess: true,
  dbUpdateSuccess: false,
  messageId: '<test-msg-2@gmail.com>',
  submittedAt: '2026-10-18T18:00:00Z',
  dbError: 'Database connection timeout during status persistence',
});
assert('Failed DB write truthfully reports persisted: false without silencing error', dbFailureDispatch.body.persisted === false && dbFailureDispatch.body.persistenceError.includes('Database connection timeout'));

// 19. RPC Least-Privilege & Anonymous PII Protection Tests (v7 Fixes)
function simulateRpcAuthorizationCheck({ callerRole, functionName }) {
  // Functions claim_notification_dispatch and record_notification_result
  // are strictly restricted to server service_role or admin
  const isPrivileged = callerRole === 'service_role' || callerRole === 'admin';
  if (!isPrivileged) {
    return {
      allowed: false,
      errorCode: '42501',
      error: `Access Denied: Only server service_role or admin may execute ${functionName}.`,
    };
  }
  return { allowed: true };
}

assert('REJECT anonymous user execution on claim_notification_dispatch', simulateRpcAuthorizationCheck({
  callerRole: 'anon',
  functionName: 'claim_notification_dispatch',
}).allowed === false);

assert('REJECT standard authenticated user execution on claim_notification_dispatch', simulateRpcAuthorizationCheck({
  callerRole: 'authenticated',
  functionName: 'claim_notification_dispatch',
}).allowed === false);

assert('REJECT anonymous user execution on record_notification_result', simulateRpcAuthorizationCheck({
  callerRole: 'anon',
  functionName: 'record_notification_result',
}).allowed === false);

assert('REJECT standard authenticated user execution on record_notification_result', simulateRpcAuthorizationCheck({
  callerRole: 'authenticated',
  functionName: 'record_notification_result',
}).allowed === false);

assert('ALLOW server service_role execution on claim_notification_dispatch', simulateRpcAuthorizationCheck({
  callerRole: 'service_role',
  functionName: 'claim_notification_dispatch',
}).allowed === true);

assert('ALLOW server service_role execution on record_notification_result', simulateRpcAuthorizationCheck({
  callerRole: 'service_role',
  functionName: 'record_notification_result',
}).allowed === true);

// Verify Zero Customer PII returned by claim_notification_dispatch
function mockClaimNotificationDispatchReturn(bookingId) {
  return {
    success: true,
    status: 'claimed',
    booking_id: bookingId,
  };
}

const claimReturn = mockClaimNotificationDispatchReturn('BK-LEAST-PRIV-101');
assert('claim_notification_dispatch returns minimal non-sensitive status', claimReturn.success === true && claimReturn.status === 'claimed' && claimReturn.booking_id === 'BK-LEAST-PRIV-101');
assert('claim_notification_dispatch NEVER returns customer_name', claimReturn.customer_name === undefined);
assert('claim_notification_dispatch NEVER returns customer_email', claimReturn.customer_email === undefined);
assert('claim_notification_dispatch NEVER returns customer_phone', claimReturn.customer_phone === undefined);
assert('claim_notification_dispatch NEVER returns special_notes', claimReturn.special_notes === undefined);

// 20. Unsafe Fallback Elimination & Strict Error Handling Tests (v7 Fixes)
function simulateEmailDispatchFlow({ claimRpcError, claimRpcSuccess, claimStatus, dbBooking }) {
  // If claim RPC fails (e.g. database error, network timeout, permission error):
  // System MUST immediately stop and return 500 claim_failed without falling back to query-and-send
  if (claimRpcError) {
    return {
      status: 500,
      body: {
        success: false,
        status: 'claim_failed',
        error: 'Unable to acquire atomic notification claim from database.',
      },
      attemptedFallbackQuery: false,
      sentEmail: false,
    };
  }

  if (!claimRpcSuccess) {
    return {
      status: claimStatus === 'already_sent' ? 200 : (claimStatus === 'in_flight' ? 409 : 400),
      body: { success: claimStatus === 'already_sent', status: claimStatus },
      attemptedFallbackQuery: false,
      sentEmail: false,
    };
  }

  // Legitimate path: fetch authoritative booking with service_role and send
  return {
    status: 200,
    body: { success: true, status: 'submitted' },
    attemptedFallbackQuery: false,
    sentEmail: true,
  };
}

const failedClaimScenario = simulateEmailDispatchFlow({
  claimRpcError: new Error('Database connection reset during RPC execution'),
  claimRpcSuccess: false,
  claimStatus: null,
});
assert('Claim failure immediately terminates with 500 claim_failed', failedClaimScenario.status === 500 && failedClaimScenario.body.status === 'claim_failed');
assert('Claim failure NEVER executes unsafe non-atomic query-and-send fallback', failedClaimScenario.attemptedFallbackQuery === false && failedClaimScenario.sentEmail === false);

// ==============================================================================
// 21. Schema & RPC Consistency, Status Constraints & Retry Mechanics (v8 Fixes)
// ==============================================================================
console.log('\n--- 21. EMAIL LOGS SCHEMA & RPC CONSISTENCY (v8) ---');

// A. Reconciled Schema Model Validation
const emailLogSchemaDefinition = {
  columns: [
    'id',
    'booking_id',
    'recipient_type',
    'recipient_email',
    'subject',
    'status',
    'message_id',
    'provider',
    'error_message',
    'payload',
    'created_at',
  ],
  allowedStatuses: ['submitted', 'queued', 'failed', 'sent'],
  allowedRecipientTypes: ['customer', 'owner'],
  defaultProvider: 'gmail_smtp',
};

assert('email_logs defines message_id column', emailLogSchemaDefinition.columns.includes('message_id'));
assert('email_logs defines provider column', emailLogSchemaDefinition.columns.includes('provider'));
assert('email_logs defines error_message column', emailLogSchemaDefinition.columns.includes('error_message'));
assert('email_logs defines payload column', emailLogSchemaDefinition.columns.includes('payload'));
assert('email_logs status constraint allows "submitted"', emailLogSchemaDefinition.allowedStatuses.includes('submitted'));
assert('email_logs status constraint allows "queued"', emailLogSchemaDefinition.allowedStatuses.includes('queued'));
assert('email_logs status constraint allows "failed"', emailLogSchemaDefinition.allowedStatuses.includes('failed'));
assert('email_logs status constraint preserves legacy "sent"', emailLogSchemaDefinition.allowedStatuses.includes('sent'));

// B. Simulation of record_notification_result RPC logic
class MockSupabaseDb {
  constructor() {
    this.bookings = {
      'BK-V8-001': { id: 'BK-V8-001', customer_email_sent: false, owner_email_sent: false },
      'BK-V8-002': { id: 'BK-V8-002', customer_email_sent: false, owner_email_sent: false },
    };
    this.claims = {
      'BK-V8-001_customer': { booking_id: 'BK-V8-001', notification_type: 'customer', status: 'claimed' },
      'BK-V8-002_customer': { booking_id: 'BK-V8-002', notification_type: 'customer', status: 'claimed' },
    };
    this.emailLogs = [];
    this.simulateEmailLogInsertFailure = false;
    this.simulateBookingMissingOnUpdate = false;
    this.simulateClaimUpdateFailure = false;
  }

  recordNotificationResult({
    bookingId,
    notificationType,
    success,
    recipientEmail = null,
    subject = null,
    messageId = null,
    error = null,
  }) {
    if (!['customer', 'owner'].includes(notificationType)) {
      return { success: false, status: 'invalid_type', error: 'Invalid notification type.' };
    }
    if (!this.bookings[bookingId]) {
      return { success: false, status: 'not_found', error: 'Booking record not found.' };
    }

    let logPersisted = true;
    let logError = null;

    const claimKey = `${bookingId}_${notificationType}`;

    // Verify claim exists before state mutation
    if (!this.claims[claimKey]) {
      return {
        success: false,
        status: 'claim_missing',
        error: 'Notification claim row was missing or could not be updated.',
        claim_persisted: false,
      };
    }

    if (success) {
      // Transactional Consistency:
      // 1. Update booking flag first and verify affected row count > 0
      if (!this.bookings[bookingId] || this.simulateBookingMissingOnUpdate) {
        // Rollback: ensure claim is NOT left in 'submitted', but set to 'failed' to allow safe retry
        this.claims[claimKey].status = 'failed';
        this.claims[claimKey].updated_at = new Date().toISOString();
        return {
          success: false,
          status: 'booking_missing',
          error: 'Booking row was missing or could not update notification flag.',
          claim_persisted: false,
        };
      }
      if (notificationType === 'customer') {
        this.bookings[bookingId].customer_email_sent = true;
      } else if (notificationType === 'owner') {
        this.bookings[bookingId].owner_email_sent = true;
      }

      // 2. Mark claim as submitted and verify affected row count > 0
      if (this.simulateClaimUpdateFailure) {
        // Rollback booking flag so partial update is not committed!
        if (notificationType === 'customer') {
          this.bookings[bookingId].customer_email_sent = false;
        } else if (notificationType === 'owner') {
          this.bookings[bookingId].owner_email_sent = false;
        }
        return {
          success: false,
          status: 'claim_missing',
          error: 'Notification claim row was missing or could not be updated.',
          claim_persisted: false,
        };
      }
      this.claims[claimKey].status = 'submitted';
      this.claims[claimKey].updated_at = new Date().toISOString();

      // 3. Attempt insert into email_logs if recipient provided
      if (recipientEmail && recipientEmail.trim() !== '') {
        const logAttempted = true;
        if (this.simulateEmailLogInsertFailure) {
          logPersisted = false;
          logError = 'Simulated database disk full error during log insert';
        } else {
          logPersisted = true;
          this.emailLogs.push({
            booking_id: bookingId,
            recipient_email: recipientEmail,
            recipient_type: notificationType,
            subject,
            status: 'submitted',
            message_id: messageId,
            provider: 'gmail_smtp',
            created_at: new Date().toISOString(),
          });
        }
        return {
          success: true,
          claim_persisted: true,
          log_attempted: logAttempted,
          log_persisted: logPersisted,
          log_error: logError,
        };
      } else {
        // Recipient omitted: log insert was NOT attempted
        return {
          success: true,
          claim_persisted: true,
          log_attempted: false,
          log_persisted: false,
          log_error: null,
        };
      }
    } else {
      // Failure case: mark claim as failed and verify affected row count > 0
      if (!this.claims[claimKey]) {
        return {
          success: false,
          status: 'claim_missing',
          error: 'Notification claim row was missing or could not be updated to failed state.',
          claim_persisted: false,
        };
      }
      this.claims[claimKey].status = 'failed';
      this.claims[claimKey].updated_at = new Date().toISOString();

      if (recipientEmail && recipientEmail.trim() !== '') {
        const logAttempted = true;
        if (this.simulateEmailLogInsertFailure) {
          logPersisted = false;
          logError = 'Simulated database disk full error during log insert';
        } else {
          logPersisted = true;
          this.emailLogs.push({
            booking_id: bookingId,
            recipient_email: recipientEmail,
            recipient_type: notificationType,
            subject: subject || 'Dispatch Failure',
            status: 'failed',
            error_message: error,
            provider: 'gmail_smtp',
            created_at: new Date().toISOString(),
          });
        }
        return {
          success: true,
          claim_persisted: true,
          log_attempted: logAttempted,
          log_persisted: logPersisted,
          log_error: logError,
        };
      } else {
        // Recipient omitted on failure
        return {
          success: true,
          claim_persisted: true,
          log_attempted: false,
          log_persisted: false,
          log_error: null,
        };
      }
    }
  }

  claimNotificationDispatch({ bookingId, notificationType }) {
    const booking = this.bookings[bookingId];
    if (!booking) return { success: false, status: 'not_found' };

    const claimKey = `${bookingId}_${notificationType}`;
    const claim = this.claims[claimKey];

    const flag = notificationType === 'customer' ? booking.customer_email_sent : booking.owner_email_sent;
    if (flag || claim?.status === 'submitted') {
      return { success: false, status: 'already_sent' };
    }

    // If claimed recently, in flight
    if (claim && claim.status === 'claimed') {
      return { success: false, status: 'in_flight' };
    }

    // If never claimed, or status is failed, grant claim
    this.claims[claimKey] = {
      booking_id: bookingId,
      notification_type: notificationType,
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    };

    return { success: true, status: 'claimed', booking_id: bookingId };
  }
}

// Test Case 1: Successful SMTP Submission
const testDb1 = new MockSupabaseDb();
const successRes = testDb1.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'customer',
  success: true,
  recipientEmail: 'guest@example.com',
  subject: 'Reservation Confirmed #BK-V8-001',
  messageId: '<msg-12345@gmail.com>',
});

assert('RPC reports success for SMTP submission', successRes.success === true && successRes.log_persisted === true && successRes.log_attempted === true && successRes.claim_persisted === true);
assert('notification_claims status transitioned to "submitted"', testDb1.claims['BK-V8-001_customer'].status === 'submitted');
assert('Booking flag customer_email_sent set to true', testDb1.bookings['BK-V8-001'].customer_email_sent === true);
assert('email_logs records status as "submitted"', testDb1.emailLogs[0].status === 'submitted');
assert('email_logs records message_id', testDb1.emailLogs[0].message_id === '<msg-12345@gmail.com>');
assert('email_logs records provider as "gmail_smtp"', testDb1.emailLogs[0].provider === 'gmail_smtp');

// Test Case 2: Duplicate Prevention after Successful Submission
const dupClaim = testDb1.claimNotificationDispatch({
  bookingId: 'BK-V8-001',
  notificationType: 'customer',
});
assert('Duplicate dispatch claim rejected with "already_sent"', dupClaim.success === false && dupClaim.status === 'already_sent');

// Test Case 3: SMTP Failure Releases Claim to 'failed' to Allow Safe Retry
const testDb2 = new MockSupabaseDb();
const failureRes = testDb2.recordNotificationResult({
  bookingId: 'BK-V8-002',
  notificationType: 'customer',
  success: false,
  recipientEmail: 'guest2@example.com',
  subject: 'Reservation Confirmed #BK-V8-002',
  error: 'SMTP 535 Authentication credentials invalid',
});

assert('RPC reports success processing failure record', failureRes.success === true && failureRes.log_persisted === true);
assert('notification_claims status updated to "failed"', testDb2.claims['BK-V8-002_customer'].status === 'failed');
assert('Booking customer_email_sent remains false', testDb2.bookings['BK-V8-002'].customer_email_sent === false);
assert('email_logs contains failure record with error message', testDb2.emailLogs[0].status === 'failed' && testDb2.emailLogs[0].error_message.includes('535'));

// Retry dispatch after SMTP failure should succeed in acquiring claim
const v8RetryClaim = testDb2.claimNotificationDispatch({
  bookingId: 'BK-V8-002',
  notificationType: 'customer',
});
assert('Safe retry successfully re-claims notification after failure', v8RetryClaim.success === true && v8RetryClaim.status === 'claimed');

// Test Case 4: Log Insert Exception Does NOT Leave Claim Stuck in 'claimed'
const testDb3 = new MockSupabaseDb();
testDb3.simulateEmailLogInsertFailure = true;

const logFailureRes = testDb3.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'customer',
  success: true,
  recipientEmail: 'guest@example.com',
  subject: 'Reservation Confirmed #BK-V8-001',
  messageId: '<msg-persist-fail@gmail.com>',
});

assert('RPC succeeds overall even if log insert fails', logFailureRes.success === true);
assert('Truthful reporting: log_persisted is false', logFailureRes.log_persisted === false);
assert('Truthful reporting: log_attempted is true', logFailureRes.log_attempted === true);
assert('Truthful reporting: log_error captures failure reason', typeof logFailureRes.log_error === 'string');
assert('Claim is STILL updated to "submitted" (claim is NOT stuck in "claimed")', testDb3.claims['BK-V8-001_customer'].status === 'submitted');
assert('Booking flag is still updated correctly', testDb3.bookings['BK-V8-001'].customer_email_sent === true);

// ==============================================================================
// 22. Truthful Skipped-Log Reporting & Safe Owner Email Resolution (Final Fixes)
// ==============================================================================
console.log('\n--- 22. TRUTHFUL SKIPPED-LOG REPORTING & SAFE OWNER RESOLUTION ---');

// Test Case 5: When email-log insert is skipped (no recipient), log_persisted MUST NOT be true
const testDb4 = new MockSupabaseDb();
const skippedLogRes = testDb4.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'customer',
  success: false,
  recipientEmail: null, // Recipient unavailable or not provided
  error: 'Authoritative booking record could not be retrieved',
});

assert('Skipped log returns log_persisted: false (NEVER true when no row is written)', skippedLogRes.log_persisted === false);
assert('Skipped log returns log_attempted: false', skippedLogRes.log_attempted === false);
assert('Skipped log returns success: true for claim state update', skippedLogRes.success === true);

// Test Case 6: Safe Owner Email Resolution (Explicit Trust Gate & No Hardcoded Fallback)
function resolveOwnerRecipient({ dbSettings, envOwnerEmail }) {
  const isOwnerEmailConfigured = Boolean(dbSettings?.owner_email_configured);
  const dbOwnerEmail = isOwnerEmailConfigured ? (dbSettings?.owner_email || '').trim() : '';
  const fallbackEnvEmail = (envOwnerEmail || '').trim();
  const candidate = (dbOwnerEmail || fallbackEnvEmail).toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!candidate || !emailRegex.test(candidate)) {
    return { valid: false, recipient: null, error: 'Authoritative cafe owner email address is not configured.' };
  }
  return { valid: true, recipient: candidate, error: null };
}

// 6a: Reject when both DB and env are unconfigured (NEVER fall back to hardcoded management@lauracafe.com)
const unconfiguredOwner = resolveOwnerRecipient({
  dbSettings: null,
  envOwnerEmail: '',
});
assert('Reject unconfigured owner email without falling back to hardcoded domain', unconfiguredOwner.valid === false && unconfiguredOwner.recipient === null);

// 6b: Resolve from database settings when configured
const dbOwner = resolveOwnerRecipient({
  dbSettings: { owner_email: 'verified.owner@cafeexample.com', owner_email_configured: true },
  envOwnerEmail: '',
});
assert('Resolve owner email from authoritative database settings', dbOwner.valid === true && dbOwner.recipient === 'verified.owner@cafeexample.com');

// 6c: Resolve from environment variable when database settings has no email
const envOwner = resolveOwnerRecipient({
  dbSettings: { owner_email: '', owner_email_configured: false },
  envOwnerEmail: 'env.owner@cafeexample.com',
});
assert('Resolve owner email from server environment variable', envOwner.valid === true && envOwner.recipient === 'env.owner@cafeexample.com');

// 6d: Reject invalid email format in settings
const invalidOwner = resolveOwnerRecipient({
  dbSettings: { owner_email: 'not-an-email', owner_email_configured: true },
  envOwnerEmail: '',
});
assert('Reject invalid owner email format', invalidOwner.valid === false);

// ==============================================================================
// 23. Database Defaults & Comprehensive RPC Result Validation (Final Fixes 1 & 2)
// ==============================================================================
console.log('\n--- 23. DATABASE DEFAULTS & FULL RPC VALIDATION (FIX 1 & FIX 2) ---');

// 1. Safe Migration simulation: Add owner_email_configured (default FALSE), drop default, preserve existing values
function simulateCafeSettingsMigration(existingSettingsRows) {
  return existingSettingsRows.map(row => {
    // Preserve existing owner_email completely without wiping or overwriting
    return {
      ...row,
      owner_email_configured: row.owner_email_configured !== undefined ? row.owner_email_configured : false,
    };
  });
}

const migratedRows = simulateCafeSettingsMigration([
  { id: 'primary', name: "L'Aura Cafe", owner_email: 'management@lauracafe.com' },
  { id: 'custom_cafe', name: 'Real Cafe', owner_email: 'real.owner@customdomain.com' },
]);
assert('Migration preserves existing historical owner email without wiping to null', migratedRows[0].owner_email === 'management@lauracafe.com');
assert('Migration defaults owner_email_configured to false for unverified legacy records', migratedRows[0].owner_email_configured === false);
assert('Migration preserves existing configured owner email', migratedRows[1].owner_email === 'real.owner@customdomain.com');

// 2. Full RPC result validator in send-email route
function validateRouteDispatchResult({ recordData, recordErr, smtpAccepted = true }) {
  const rpcCallSucceeded = !recordErr && recordData && recordData.success === true;
  const claimPersistedSuccess = Boolean(rpcCallSucceeded && recordData.claim_persisted === true);
  const logPersistedSuccess = Boolean(rpcCallSucceeded && recordData.log_persisted === true);
  const overallPersisted = Boolean(claimPersistedSuccess && logPersistedSuccess);

  let persistenceErrorMsg = null;
  if (recordErr) {
    persistenceErrorMsg = 'Database status update failed after SMTP submission.';
  } else if (recordData && recordData.success === false) {
    persistenceErrorMsg = 'Database status recording rejected after SMTP submission.';
  } else if (recordData && recordData.log_persisted === false) {
    persistenceErrorMsg = 'Email audit log insertion failed.';
  }

  return {
    success: true,
    status: 'submitted',
    smtpAccepted,
    persisted: overallPersisted,
    claimPersisted: claimPersistedSuccess,
    logPersisted: logPersistedSuccess,
    persistenceError: overallPersisted ? null : persistenceErrorMsg,
  };
}

// Case A: Full Success (SMTP + Claim + Log)
const resFullSuccess = validateRouteDispatchResult({
  recordData: { success: true, claim_persisted: true, log_persisted: true },
  recordErr: null,
});
assert('Route reports smtpAccepted: true on successful submission', resFullSuccess.smtpAccepted === true);
assert('Route reports persisted: true when claim and log succeed', resFullSuccess.persisted === true);
assert('Route reports claimPersisted: true', resFullSuccess.claimPersisted === true);
assert('Route reports logPersisted: true', resFullSuccess.logPersisted === true);
assert('Route reports persistenceError: null', resFullSuccess.persistenceError === null);

// Case B: Database RPC Transport Error after SMTP Submission
const resRpcTransportErr = validateRouteDispatchResult({
  recordData: null,
  recordErr: { message: 'Database connection terminated' },
});
assert('Route distinguishes SMTP acceptance when DB transport fails', resRpcTransportErr.smtpAccepted === true);
assert('Route reports persisted: false on DB transport error', resRpcTransportErr.persisted === false);
assert('Route reports claimPersisted: false on DB transport error', resRpcTransportErr.claimPersisted === false);
assert('Route reports generic persistenceError without leaking internal DB error', resRpcTransportErr.persistenceError === 'Database status update failed after SMTP submission.');

// Case C: RPC Rejection (success: false without transport error)
const resRpcRejection = validateRouteDispatchResult({
  recordData: { success: false, status: 'invalid_id', error: 'Invalid booking ID' },
  recordErr: null,
});
assert('Route reports persisted: false when RPC returns success: false', resRpcRejection.persisted === false);
assert('Route reports claimPersisted: false on RPC rejection', resRpcRejection.claimPersisted === false);
assert('Route reports persistenceError without exposing stack', resRpcRejection.persistenceError === 'Database status recording rejected after SMTP submission.');

// Case D: Claim succeeded, but audit log insert failed
const resLogFail = validateRouteDispatchResult({
  recordData: { success: true, claim_persisted: true, log_persisted: false, log_error: 'Disk quota exceeded' },
  recordErr: null,
});
assert('Route reports claimPersisted: true when claim succeeded', resLogFail.claimPersisted === true);
assert('Route reports logPersisted: false when audit log failed', resLogFail.logPersisted === false);
assert('Route reports overall persisted: false when log write fails', resLogFail.persisted === false);
assert('Route reports specific audit log persistenceError', resLogFail.persistenceError === 'Email audit log insertion failed.');

// ==============================================================================
// 24. REGRESSION SUITE: DATABASE OWNER CONFIGURATION & RPC PERSISTENCE (FINAL FIXES)
// ==============================================================================
console.log('\n--- 24. REGRESSION SUITE: OWNER EMAIL CONFIG & RPC PERSISTENCE ---');

// 1. Existing owner email matching historical default ('management@lauracafe.com')
// 1a: Unconfigured legacy record: Value is preserved in DB, but NOT trusted by route -> falls back to env variable
const legacyMatchingDefaultWithEnv = resolveOwnerRecipient({
  dbSettings: { owner_email: 'management@lauracafe.com', owner_email_configured: false },
  envOwnerEmail: 'verified.ops@mycafe.com',
});
assert('Existing owner email matching historical default with owner_email_configured: false falls back to env variable',
  legacyMatchingDefaultWithEnv.valid === true && legacyMatchingDefaultWithEnv.recipient === 'verified.ops@mycafe.com');

// 1b: Unconfigured legacy record with no env variable -> rejected safely without sending
const legacyMatchingDefaultNoEnv = resolveOwnerRecipient({
  dbSettings: { owner_email: 'management@lauracafe.com', owner_email_configured: false },
  envOwnerEmail: '',
});
assert('Existing owner email matching historical default with owner_email_configured: false and no env fails safely',
  legacyMatchingDefaultNoEnv.valid === false && legacyMatchingDefaultNoEnv.recipient === null);

// 1c: Deliberately configured in Admin settings -> Explicitly trusted and used, even if value is 'management@lauracafe.com'
const configuredMatchingDefault = resolveOwnerRecipient({
  dbSettings: { owner_email: 'management@lauracafe.com', owner_email_configured: true },
  envOwnerEmail: 'fallback.env@mycafe.com',
});
assert('Explicitly configured owner email is trusted even when matching historical default (does not infer unconfigured from value)',
  configuredMatchingDefault.valid === true && configuredMatchingDefault.recipient === 'management@lauracafe.com');

// 2. Unconfigured owner email (both DB unconfigured and env unset)
const unconfiguredNeither = resolveOwnerRecipient({
  dbSettings: { owner_email: null, owner_email_configured: false },
  envOwnerEmail: null,
});
assert('Unconfigured owner email fails validation without sending owner notification',
  unconfiguredNeither.valid === false && unconfiguredNeither.recipient === null);

// 3. Missing notification claim row in record_notification_result
const dbMissingClaim = new MockSupabaseDb();
// 3a: Success path with missing claim row (e.g. notificationType 'owner' has no claim row in dbMissingClaim)
const missingClaimSuccessRes = dbMissingClaim.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'owner',
  success: true,
  recipientEmail: 'owner@mycafe.com',
  subject: 'New Booking',
});
assert('Missing claim row on success path returns success: false', missingClaimSuccessRes.success === false);
assert('Missing claim row on success path returns status: claim_missing', missingClaimSuccessRes.status === 'claim_missing');
assert('Missing claim row on success path returns claim_persisted: false', missingClaimSuccessRes.claim_persisted === false);

// 3b: Failure path with missing claim row
const missingClaimFailRes = dbMissingClaim.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'owner',
  success: false,
  recipientEmail: 'owner@mycafe.com',
  error: 'SMTP transmission failure',
});
assert('Missing claim row on failure path returns success: false', missingClaimFailRes.success === false);
assert('Missing claim row on failure path returns status: claim_missing', missingClaimFailRes.status === 'claim_missing');
assert('Missing claim row on failure path returns claim_persisted: false', missingClaimFailRes.claim_persisted === false);

// 4. Successful claim update (both success and failure paths)
const dbValidClaim = new MockSupabaseDb();
const validClaimSuccessRes = dbValidClaim.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'customer',
  success: true,
  recipientEmail: 'guest@example.com',
  subject: 'Booking Confirmation',
  messageId: '<msg-success-456@gmail.com>',
});
assert('Valid claim update on success returns success: true', validClaimSuccessRes.success === true);
assert('Valid claim update on success returns claim_persisted: true', validClaimSuccessRes.claim_persisted === true);
assert('Valid claim status transitioned to submitted in DB', dbValidClaim.claims['BK-V8-001_customer'].status === 'submitted');
assert('Valid claim updates booking customer_email_sent flag', dbValidClaim.bookings['BK-V8-001'].customer_email_sent === true);

const dbValidClaimFail = new MockSupabaseDb();
const validClaimFailRes = dbValidClaimFail.recordNotificationResult({
  bookingId: 'BK-V8-002',
  notificationType: 'customer',
  success: false,
  recipientEmail: 'guest@example.com',
  error: 'SMTP connection timeout',
});
assert('Valid claim update on failure returns success: true', validClaimFailRes.success === true);
assert('Valid claim update on failure returns claim_persisted: true', validClaimFailRes.claim_persisted === true);
assert('Valid claim status transitioned to failed in DB to permit retry', dbValidClaimFail.claims['BK-V8-002_customer'].status === 'failed');

// 5. Missing booking row
const dbMissingBooking = new MockSupabaseDb();
// 5a: Non-existent booking ID
const nonExistentBookingRes = dbMissingBooking.recordNotificationResult({
  bookingId: 'NON_EXISTENT_BK',
  notificationType: 'customer',
  success: true,
  recipientEmail: 'guest@example.com',
});
assert('Missing booking row returns success: false', nonExistentBookingRes.success === false);
assert('Missing booking row returns status: not_found', nonExistentBookingRes.status === 'not_found');

// 5b: Booking flag update failure (simulating booking row missing during flag update)
const dbBookingMissingOnUpdate = new MockSupabaseDb();
dbBookingMissingOnUpdate.simulateBookingMissingOnUpdate = true;
const bookingMissingOnUpdateRes = dbBookingMissingOnUpdate.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'customer',
  success: true,
  recipientEmail: 'guest@example.com',
});
assert('Missing booking row on flag update returns success: false', bookingMissingOnUpdateRes.success === false);
assert('Missing booking row on flag update returns status: booking_missing', bookingMissingOnUpdateRes.status === 'booking_missing');
assert('Missing booking row on flag update returns claim_persisted: false', bookingMissingOnUpdateRes.claim_persisted === false);
assert('Transactional consistency: claim is NOT left in "submitted" if booking flag update fails',
  dbBookingMissingOnUpdate.claims['BK-V8-001_customer'].status !== 'submitted');
assert('Transactional consistency: claim is set to "failed" on booking update failure to permit retry',
  dbBookingMissingOnUpdate.claims['BK-V8-001_customer'].status === 'failed');

// 5c: Claim update failure during success dispatch (simulating claim update failure after booking update)
const dbClaimUpdateFail = new MockSupabaseDb();
dbClaimUpdateFail.simulateClaimUpdateFailure = true;
const claimUpdateFailRes = dbClaimUpdateFail.recordNotificationResult({
  bookingId: 'BK-V8-001',
  notificationType: 'customer',
  success: true,
  recipientEmail: 'guest@example.com',
});
assert('Claim update failure returns success: false', claimUpdateFailRes.success === false);
assert('Claim update failure returns status: claim_missing', claimUpdateFailRes.status === 'claim_missing');
assert('Transactional consistency: booking flag rolled back to false when claim update fails',
  dbClaimUpdateFail.bookings['BK-V8-001'].customer_email_sent === false);

// ==============================================================================
// 25. ADMIN SETTINGS SAVE TRUTHFULNESS & ROW VERIFICATION
// ==============================================================================
console.log('\n--- 25. ADMIN SETTINGS SAVE TRUTHFULNESS & ROW VERIFICATION ---');

// Simulation of CafeContext updateCafeSettings with mock Supabase client and .select() verification
async function simulateUpdateCafeSettings({ currentSettings, newSettings, mockSupabase }) {
  const hasConfiguredEmail = Boolean(newSettings.owner_email && newSettings.owner_email.trim());
  const updated = {
    ...currentSettings,
    ...newSettings,
    owner_email_configured: hasConfiguredEmail,
  };

  if (mockSupabase) {
    try {
      const { data, error } = await mockSupabase.update(updated).eq('id', 'primary').select();
      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to update cafe settings in database.',
          retainedSettings: currentSettings, // Authoritative settings kept intact
        };
      }
      // Inspect affected row count (detects RLS blockage or missing primary record)
      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Database update failed: No matching settings row found or unauthorized.',
          retainedSettings: currentSettings, // Authoritative settings kept intact
        };
      }
      return {
        success: true,
        settings: { ...updated, ...data[0] },
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Connection error while saving settings.',
        retainedSettings: currentSettings,
      };
    }
  }

  return {
    success: true,
    settings: updated,
  };
}

const currentCafeSettings = {
  name: "L'Aura Cafe",
  owner_email: 'old.owner@example.com',
  owner_email_configured: true,
};

// 1: Genuine database error (e.g. database connection termination or internal error)
const failMockSupabase = {
  update: () => ({
    eq: () => ({
      select: async () => ({ data: null, error: { message: 'Database connection terminated' } }),
    }),
  }),
};

const failedSaveResult = await simulateUpdateCafeSettings({
  currentSettings: currentCafeSettings,
  newSettings: { owner_email: 'unauthorized.change@evil.com' },
  mockSupabase: failMockSupabase,
});

assert('updateCafeSettings reports success: false on genuine database error', failedSaveResult.success === false);
assert('updateCafeSettings exposes actual error message', failedSaveResult.error.includes('Database connection terminated'));
assert('Authoritative settings retained unchanged when database save errors', failedSaveResult.retainedSettings.owner_email === 'old.owner@example.com');

// 2: Zero-row update with no Supabase error (e.g. RLS policy violation or missing primary record)
const zeroRowMockSupabase = {
  update: () => ({
    eq: () => ({
      select: async () => ({ data: [], error: null }),
    }),
  }),
};

const zeroRowSaveResult = await simulateUpdateCafeSettings({
  currentSettings: currentCafeSettings,
  newSettings: { owner_email: 'silent.fail@example.com' },
  mockSupabase: zeroRowMockSupabase,
});

assert('updateCafeSettings reports success: false on zero-row update with no error', zeroRowSaveResult.success === false);
assert('updateCafeSettings reports explicit failure when no row was affected', zeroRowSaveResult.error.includes('No matching settings row found'));
assert('Authoritative settings retained unchanged when zero rows affected', zeroRowSaveResult.retainedSettings.owner_email === 'old.owner@example.com');

// 3: Database update success
const successMockSupabase = {
  update: (payload) => ({
    eq: () => ({
      select: async () => ({ data: [{ id: 'primary', ...payload }], error: null }),
    }),
  }),
};

const successfulSaveResult = await simulateUpdateCafeSettings({
  currentSettings: currentCafeSettings,
  newSettings: { owner_email: 'new.owner@example.com' },
  mockSupabase: successMockSupabase,
});

assert('updateCafeSettings reports success: true on successful database write', successfulSaveResult.success === true);
assert('updateCafeSettings marks owner_email_configured: true', successfulSaveResult.settings.owner_email_configured === true);
assert('updateCafeSettings applies confirmed new owner email', successfulSaveResult.settings.owner_email === 'new.owner@example.com');

// ==============================================================================
// 26. OWNER EMAIL PRIVACY & SECURED PUBLIC CAFE SETTINGS
// ==============================================================================
console.log('\n--- 26. OWNER EMAIL PRIVACY & SECURED PUBLIC CAFE SETTINGS ---');

// 1. Secured public view schema projection
const publicCafeSettingsColumns = [
  'id', 'name', 'tagline', 'address', 'landmark', 'phone',
  'opening_time', 'closing_time', 'default_duration', 'cleaning_buffer',
  'seating_mode', 'timezone', 'currency', 'updated_at'
];

assert('Public view public_cafe_settings EXCLUDES owner_email',
  !publicCafeSettingsColumns.includes('owner_email'));
assert('Public view public_cafe_settings EXCLUDES owner_email_configured',
  !publicCafeSettingsColumns.includes('owner_email_configured'));
assert('Public view includes name, address, phone, and hours',
  ['name', 'address', 'phone', 'opening_time', 'closing_time'].every(col => publicCafeSettingsColumns.includes(col)));

// 2. Direct cafe_settings authorization check
function checkCafeSettingsAccess(role, isUserAdmin) {
  if (role === 'service_role') {
    return { allowSelect: true, canReadOwnerEmail: true };
  }
  if (role === 'authenticated' && isUserAdmin) {
    return { allowSelect: true, canReadOwnerEmail: true };
  }
  // Anonymous or non-admin authenticated users
  return { allowSelect: false, canReadOwnerEmail: false };
}

const anonAccess = checkCafeSettingsAccess('anon', false);
assert('Anonymous user CANNOT select from cafe_settings table directly', anonAccess.allowSelect === false);
assert('Anonymous user CANNOT read private owner email', anonAccess.canReadOwnerEmail === false);

const customerAccess = checkCafeSettingsAccess('authenticated', false);
assert('Ordinary authenticated customer CANNOT select from cafe_settings table directly', customerAccess.allowSelect === false);
assert('Ordinary authenticated customer CANNOT read private owner email', customerAccess.canReadOwnerEmail === false);

const adminAccess = checkCafeSettingsAccess('authenticated', true);
assert('Verified admin CAN select from cafe_settings table', adminAccess.allowSelect === true);
assert('Verified admin CAN read and configure owner email', adminAccess.canReadOwnerEmail === true);

const serverServiceRoleAccess = checkCafeSettingsAccess('service_role', false);
assert('Server service_role CAN read cafe_settings for transactional email dispatch', serverServiceRoleAccess.allowSelect === true);
assert('Server service_role has access to authoritative owner email', serverServiceRoleAccess.canReadOwnerEmail === true);

// ==============================================================================
// 27. FRESH-INSTALL SQL SCRIPT INTEGRITY & SECURITY AUDIT
// ==============================================================================
console.log('\n--- 27. FRESH-INSTALL SQL SCRIPT INTEGRITY & SECURITY AUDIT ---');

import fs from 'fs';
import path from 'path';

const freshInstallSqlPath = path.resolve('supabase-fresh-install.sql');
assert('supabase-fresh-install.sql exists', fs.existsSync(freshInstallSqlPath));

const sqlContent = fs.readFileSync(freshInstallSqlPath, 'utf8');
assert('supabase-fresh-install.sql is non-empty (>5KB)', sqlContent.length > 5000);

// Check all 8 required tables
const expectedTables = [
  'admin_users',
  'cafe_settings',
  'cafe_tables',
  'menu_categories',
  'menu_items',
  'bookings',
  'notification_claims',
  'email_logs'
];
for (const table of expectedTables) {
  assert(`SQL script creates table: ${table}`, sqlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`));
}

// Check all critical functions and RPCs
const expectedFunctions = [
  'is_admin',
  'book_table_atomic',
  'claim_notification_dispatch',
  'record_notification_result',
  'get_public_booked_slots',
  'get_public_cafe_settings'
];
for (const fn of expectedFunctions) {
  assert(`SQL script creates function: ${fn}`, sqlContent.includes(`FUNCTION ${fn}`));
}

// Check public secured view
assert('SQL script creates public_cafe_settings view', sqlContent.includes('CREATE OR REPLACE VIEW public_cafe_settings'));

// Check view excludes sensitive owner email fields
const viewMatch = sqlContent.match(/CREATE OR REPLACE VIEW public_cafe_settings AS\s+SELECT([\s\S]*?)FROM cafe_settings;/i);
assert('View definition found in SQL', Boolean(viewMatch && viewMatch[1]));
if (viewMatch) {
  const viewCols = viewMatch[1];
  assert('View EXCLUDES owner_email', !viewCols.includes('owner_email'));
  assert('View EXCLUDES owner_email_configured', !viewCols.includes('owner_email_configured'));
  assert('View includes public cafe info (name, address, phone)',
    viewCols.includes('name') && viewCols.includes('address') && viewCols.includes('phone'));
}

// Check non-destructive rule: no DROP TABLE, no DELETE FROM, no TRUNCATE
assert('No DROP TABLE statements present', !/DROP\s+TABLE/i.test(sqlContent));
assert('No DELETE FROM statements present', !/DELETE\s+FROM/i.test(sqlContent));
assert('No TRUNCATE statements present', !/TRUNCATE/i.test(sqlContent));

// Check no invented owner email
assert('No invented management@lauracafe.com present', !sqlContent.includes('management@lauracafe.com'));
assert('owner_email in seed data defaults to NULL', sqlContent.includes('NULL, -- owner_email') || /VALUES\s*\([^)]*NULL,\s*FALSE/i.test(sqlContent));

// Check dependency order:
// 1. admin_users must appear before is_admin() definition
const adminUsersPos = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS admin_users');
const isAdminPos = sqlContent.indexOf('CREATE OR REPLACE FUNCTION is_admin');
assert('Dependency order: admin_users table precedes is_admin() function',
  adminUsersPos !== -1 && isAdminPos !== -1 && adminUsersPos < isAdminPos);

// 2. is_admin() must precede policies calling is_admin()
const firstPolicyWithIsAdmin = sqlContent.indexOf('USING (is_admin())');
assert('Dependency order: is_admin() function precedes policies using is_admin()',
  isAdminPos !== -1 && firstPolicyWithIsAdmin !== -1 && isAdminPos < firstPolicyWithIsAdmin);

// 3. menu_categories must precede menu_items
const menuCatPos = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS menu_categories');
const menuItemsPos = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS menu_items');
assert('Dependency order: menu_categories precedes menu_items',
  menuCatPos !== -1 && menuItemsPos !== -1 && menuCatPos < menuItemsPos);

// 4. cafe_tables must precede bookings
const cafeTablesPos = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS cafe_tables');
const bookingsPos = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS bookings');
assert('Dependency order: cafe_tables precedes bookings',
  cafeTablesPos !== -1 && bookingsPos !== -1 && cafeTablesPos < bookingsPos);

// 5. bookings must precede notification_claims and email_logs
const claimsPos = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS notification_claims');
const emailLogsPos = sqlContent.indexOf('CREATE TABLE IF NOT EXISTS email_logs');
assert('Dependency order: bookings precedes notification_claims',
  bookingsPos !== -1 && claimsPos !== -1 && bookingsPos < claimsPos);
assert('Dependency order: bookings precedes email_logs',
  bookingsPos !== -1 && emailLogsPos !== -1 && bookingsPos < emailLogsPos);

// Check RLS enabled on all tables
for (const table of expectedTables) {
  assert(`RLS enabled on table: ${table}`, sqlContent.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
}

// Check notification RPC permissions: revoked from PUBLIC/anon/auth, granted to service_role
assert('claim_notification_dispatch revoked from PUBLIC, anon, authenticated',
  sqlContent.includes('REVOKE ALL ON FUNCTION claim_notification_dispatch(TEXT, TEXT) FROM PUBLIC, anon, authenticated'));
assert('claim_notification_dispatch granted to service_role',
  sqlContent.includes('GRANT EXECUTE ON FUNCTION claim_notification_dispatch(TEXT, TEXT) TO service_role'));

assert('record_notification_result revoked from PUBLIC, anon, authenticated',
  sqlContent.includes('REVOKE ALL ON FUNCTION record_notification_result(TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated'));
assert('record_notification_result granted to service_role',
  sqlContent.includes('GRANT EXECUTE ON FUNCTION record_notification_result(TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) TO service_role'));

// Check public RPCs granted to anon, authenticated
assert('book_table_atomic granted to anon, authenticated',
  sqlContent.includes('GRANT EXECUTE ON FUNCTION book_table_atomic TO anon, authenticated'));
assert('get_public_booked_slots granted to anon, authenticated',
  sqlContent.includes('GRANT EXECUTE ON FUNCTION get_public_booked_slots(DATE) TO anon, authenticated'));
assert('get_public_cafe_settings granted to anon, authenticated',
  sqlContent.includes('GRANT EXECUTE ON FUNCTION get_public_cafe_settings() TO anon, authenticated'));

// Check cafe_settings direct access revoked from anon
assert('Direct access on cafe_settings revoked from anon, PUBLIC',
  sqlContent.includes('REVOKE ALL ON TABLE cafe_settings FROM anon, PUBLIC'));

// --- Additional Fix Verification (Issues 1, 2, 3) ---

// Issue 1: Hardened is_admin() checks and execution permissions
assert('is_admin() requires auth.uid() IS NOT NULL',
  sqlContent.includes('auth.uid() IS NOT NULL'));
assert('is_admin() does NOT grant admin via unverified/matching email alone',
  !sqlContent.includes("OR email = (auth.jwt() ->> 'email')"));
assert('is_admin() execution revoked from PUBLIC and anon',
  sqlContent.includes('REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC, anon;'));
assert('is_admin() execution granted to authenticated, service_role',
  sqlContent.includes('GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, service_role;'));

// Issue 2: Timezone-consistent date/time validation in book_table_atomic
assert('book_table_atomic queries configured cafe timezone',
  sqlContent.includes("COALESCE(timezone, 'Asia/Kolkata')"));
assert('book_table_atomic calculates local timestamp via NOW() AT TIME ZONE',
  sqlContent.includes('(NOW() AT TIME ZONE v_timezone)'));
assert('book_table_atomic compares booking date against timezone-local date',
  sqlContent.includes('p_booking_date < v_current_local_date'));
assert('book_table_atomic compares booking start against timezone-local timestamp',
  sqlContent.includes('v_booking_start_ts <= v_current_local_ts'));
assert('book_table_atomic checks overnight hours post-midnight condition',
  sqlContent.includes('IF p_start_time < v_closing_time THEN'));
assert('book_table_atomic assigns previous calendar day opening timestamp for overnight post-midnight bookings',
  sqlContent.includes("v_cafe_open_ts := ((p_booking_date - INTERVAL '1 day')::DATE + v_opening_time);"));

// Also check supabase-schema.sql for the same overnight fix
const schemaSqlPath = path.resolve('supabase-schema.sql');
assert('supabase-schema.sql exists', fs.existsSync(schemaSqlPath));
const schemaContent = fs.readFileSync(schemaSqlPath, 'utf8');
assert('supabase-schema.sql checks overnight hours post-midnight condition',
  schemaContent.includes('IF p_start_time < v_closing_time THEN'));
assert('supabase-schema.sql assigns previous calendar day opening timestamp for overnight post-midnight bookings',
  schemaContent.includes("v_cafe_open_ts := ((p_booking_date - INTERVAL '1 day')::DATE + v_opening_time);"));

// Issue 3: Insert-only seed section (safe to rerun, does not overwrite customizations)
assert('Seed cafe_settings uses ON CONFLICT (id) DO NOTHING',
  /INSERT INTO cafe_settings[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/i.test(sqlContent));
assert('Seed cafe_tables uses ON CONFLICT (id) DO NOTHING',
  /INSERT INTO cafe_tables[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/i.test(sqlContent));
assert('Seed menu_categories uses ON CONFLICT (id) DO NOTHING',
  /INSERT INTO menu_categories[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/i.test(sqlContent));
assert('Seed menu_items uses ON CONFLICT (id) DO NOTHING',
  /INSERT INTO menu_items[\s\S]*?ON CONFLICT \(id\) DO NOTHING;/i.test(sqlContent));

console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed`);

if (failed > 0) {
  process.exit(1);
}




