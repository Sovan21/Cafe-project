import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// In-memory rate limiting map for email dispatch abuse prevention
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 6;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return true;
  }
  if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return true;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

function sanitizeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Server-only authoritative Supabase client (Strict Least Privilege: service_role key only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isServerConfigured = Boolean(
  supabaseUrl &&
  serviceRoleKey &&
  supabaseUrl.startsWith('http') &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

const serverSupabase = isServerConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export async function POST(request) {
  try {
    // 1. IP Rate Limiting Check
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'local-client';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please wait a minute before requesting more notifications.',
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 2. Disable Demo Mode email dispatch in production (Issue 1)
    if (body?.isDemo || body?.demoBooking) {
      return NextResponse.json(
        {
          success: false,
          status: 'demo_email_disabled',
          error: 'Demo mode email dispatch is strictly disabled. Real emails cannot be triggered with client demo payloads.',
        },
        { status: 403 }
      );
    }

    // 3. Reject email dispatch if authoritative Supabase service role is unconfigured (Issue 1 & 3)
    if (!isServerConfigured || !serverSupabase) {
      return NextResponse.json(
        {
          success: false,
          status: 'unavailable',
          error: 'Authoritative server database credentials (SUPABASE_SERVICE_ROLE_KEY) are not configured. Email dispatch unavailable.',
        },
        { status: 503 }
      );
    }

    const { bookingId, type } = body || {};

    // 4. Validate Required Type & Booking Identifier
    if (!type || (type !== 'customer' && type !== 'owner')) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification type. Must be "customer" or "owner".' },
        { status: 400 }
      );
    }

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing authoritative booking identifier (bookingId).' },
        { status: 400 }
      );
    }

    // 5. Concurrency-Safe Atomic Claim via Database RPC (Issue 4 - NO UNSAFE FALLBACK)
    const { data: claimData, error: claimErr } = await serverSupabase.rpc(
      'claim_notification_dispatch',
      {
        p_booking_id: bookingId.trim(),
        p_notification_type: type,
      }
    );

    // If claim RPC fails, STOP immediately and return explicit error (NO unsafe fallback)
    if (claimErr) {
      console.error('[Notification Claim RPC Error]:', claimErr.message || claimErr);
      return NextResponse.json(
        {
          success: false,
          status: 'claim_failed',
          error: 'Unable to acquire atomic notification claim from database.',
        },
        { status: 500 }
      );
    }

    if (!claimData?.success) {
      if (claimData?.status === 'already_sent') {
        return NextResponse.json({
          success: true,
          status: 'already_sent',
          message: claimData.message || 'Notification has already been dispatched for this booking.',
        });
      }
      if (claimData?.status === 'in_flight') {
        return NextResponse.json(
          {
            success: false,
            status: 'in_flight',
            error: claimData.message || 'A notification dispatch is currently in progress for this booking.',
          },
          { status: 409 }
        );
      }
      if (claimData?.status === 'not_found') {
        return NextResponse.json(
          { success: false, status: 'not_found', error: claimData.error || 'Booking reference not found.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: claimData?.error || 'Notification claim was rejected.' },
        { status: 400 }
      );
    }

    // 6. Fetch authoritative booking record with server service_role privileges
    const { data: bookingData, error: bookingErr } = await serverSupabase
      .from('bookings')
      .select(
        'id, customer_name, customer_email, customer_phone, table_id, table_name, booking_date, start_time, end_time, duration_minutes, guest_count, status, special_notes, customer_email_sent, owner_email_sent'
      )
      .eq('id', bookingId.trim())
      .maybeSingle();

    if (bookingErr || !bookingData) {
      // Release claim if booking record fetch failed
      const { data: rpcData, error: rpcErr } = await serverSupabase.rpc('record_notification_result', {
        p_booking_id: bookingId.trim(),
        p_notification_type: type,
        p_success: false,
        p_error: 'Authoritative booking record could not be retrieved',
      });
      if (rpcErr || rpcData?.success === false) {
        console.error('[RPC Failure Releasing Claim on Booking Fetch Error]:', rpcErr?.message || rpcData?.error || 'Claim release unsuccessful');
      }
      return NextResponse.json(
        { success: false, status: 'fetch_failed', error: 'Authoritative booking record could not be retrieved.' },
        { status: 404 }
      );
    }

    if (bookingData.status !== 'confirmed') {
      const { data: rpcData, error: rpcErr } = await serverSupabase.rpc('record_notification_result', {
        p_booking_id: bookingId.trim(),
        p_notification_type: type,
        p_success: false,
        p_error: `Booking status is ${bookingData.status}`,
      });
      if (rpcErr || rpcData?.success === false) {
        console.error('[RPC Failure Releasing Claim on Unconfirmed Status]:', rpcErr?.message || rpcData?.error || 'Claim release unsuccessful');
      }
      return NextResponse.json(
        { success: false, status: 'not_confirmed', error: `Cannot dispatch notifications for booking with status: ${bookingData.status}` },
        { status: 400 }
      );
    }

    // 7. Fetch cafe settings from authoritative database
    // ==============================================================================
    // OWNER NOTIFICATION EMAIL RESOLUTION PRIORITY:
    // Priority 1 (Primary / Dynamic): Database setting `cafe_settings.owner_email`
    //              (configured by cafe owner/manager dynamically in Admin Dashboard)
    // Priority 2 (Server Fallback): Server environment variable `process.env.CAFE_OWNER_EMAIL`
    //              (infrastructure-level fallback or override)
    // If neither source provides a valid, RFC-compliant email, the notification is
    // rejected with 503 (owner_email_unconfigured) and the claim is safely released.
    // Client-supplied email addresses are NEVER used as owner notification recipients.
    // ==============================================================================
    let cafeName = "L'Aura Cafe & Roastery";
    let cafeAddress = 'Plot 14, Park Street Heritage Area, Kolkata 700016';

    const { data: settings, error: settingsErr } = await serverSupabase
      .from('cafe_settings')
      .select('name, address, owner_email, owner_email_configured')
      .eq('id', 'primary')
      .maybeSingle();

    if (settingsErr) {
      console.error('[Supabase cafe_settings Fetch Error]:', settingsErr.message || settingsErr);
    }

    if (settings) {
      if (settings.name) cafeName = settings.name;
      if (settings.address) cafeAddress = settings.address;
    }

    // Explicit Trust Gate: Database email is only used if explicitly trusted and configured
    const isOwnerEmailConfigured = Boolean(settings?.owner_email_configured);
    const dbOwnerEmail = isOwnerEmailConfigured ? (settings?.owner_email || '').trim() : '';
    const envOwnerEmail = (process.env.CAFE_OWNER_EMAIL || '').trim();

    // 8. Determine Authoritative Recipient
    let finalRecipient = '';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (type === 'customer') {
      finalRecipient = (bookingData.customer_email || '').trim().toLowerCase();
    } else {
      // Apply strict Owner Notification Priority:
      // Priority 1: Explicitly trusted and configured database owner email
      // Priority 2: Server environment variable CAFE_OWNER_EMAIL fallback
      finalRecipient = (dbOwnerEmail || envOwnerEmail).toLowerCase();
    }

    if (!finalRecipient || !emailRegex.test(finalRecipient)) {
      // Release claim if recipient invalid or owner email unconfigured
      const recipientError = type === 'owner'
        ? 'Authoritative cafe owner email address is not configured in database settings or environment variables.'
        : 'Authoritative customer email address is missing or invalid in booking record.';

      const { data: rpcData, error: rpcErr } = await serverSupabase.rpc('record_notification_result', {
        p_booking_id: bookingData.id,
        p_notification_type: type,
        p_success: false,
        p_error: recipientError,
      });
      if (rpcErr || rpcData?.success === false) {
        console.error('[RPC Failure Releasing Claim on Invalid Recipient]:', rpcErr?.message || rpcData?.error || 'Claim release unsuccessful');
      }

      return NextResponse.json(
        {
          success: false,
          status: type === 'owner' ? 'owner_email_unconfigured' : 'invalid_customer_email',
          error: recipientError,
        },
        { status: type === 'owner' ? 503 : 400 }
      );
    }

    // 9. Environment & Credentials Verification (Gmail SMTP only)
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      // Release claim so it can be retried once credentials are configured
      const { data: rpcData, error: rpcErr } = await serverSupabase.rpc('record_notification_result', {
        p_booking_id: bookingData.id,
        p_notification_type: type,
        p_success: false,
        p_recipient_email: finalRecipient,
        p_error: 'Gmail SMTP credentials unconfigured',
      });
      if (rpcErr || rpcData?.success === false) {
        console.error('[RPC Failure Releasing Claim on Unconfigured SMTP]:', rpcErr?.message || rpcData?.error || 'Claim release unsuccessful');
      }
      return NextResponse.json(
        {
          success: false,
          status: 'unconfigured',
          error: 'Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not configured in environment variables.',
          submittedAt: null,
        },
        { status: 503 }
      );
    }

    // 10. Build authoritatively sanitized email content
    const isCustomer = type === 'customer';
    const customerName = sanitizeHtml(bookingData.customer_name || 'Valued Guest');
    const customerEmail = sanitizeHtml(bookingData.customer_email || '');
    const customerPhone = sanitizeHtml(bookingData.customer_phone || 'Not provided');
    const tableName = sanitizeHtml(bookingData.table_name || bookingData.table_id || 'Reserved Table');
    const tableId = sanitizeHtml(bookingData.table_id || '');
    const durationMins = Number(bookingData.duration_minutes) || 90;
    const guestCount = Number(bookingData.guest_count) || 1;
    const bookingRef = sanitizeHtml(bookingData.id);

    const subject = isCustomer
      ? `Reservation Confirmed #${bookingRef} — ${cafeName}`
      : `🔔 New Table Booking Alert: ${tableName} (${guestCount} Guests) #${bookingRef}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #120d0b; color: #faf6f0; padding: 32px 20px; border-radius: 12px; max-width: 580px; margin: auto;">
        <div style="text-align: center; border-bottom: 1px solid rgba(203,159,120,0.3); padding-bottom: 20px;">
          <h1 style="color: #e6a147; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">${sanitizeHtml(cafeName)}</h1>
          <p style="color: #dbbe9e; margin-top: 6px; font-size: 14px;">${isCustomer ? 'Table Reservation Confirmation' : 'New Table Booking Alert (Cafe Management)'}</p>
          <p style="color: #8c7365; margin-top: 2px; font-size: 12px;">${sanitizeHtml(cafeAddress)}</p>
        </div>
        <div style="padding: 24px 0;">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>${isCustomer ? customerName : 'Cafe Manager'}</strong>,</p>
          <p style="color: #dbbe9e; font-size: 14px; line-height: 1.5;">${isCustomer ? 'Your table reservation is confirmed. We look forward to welcoming you.' : 'A new table reservation has just been placed with the following details:'}</p>
          
          <div style="background: rgba(42,33,27,0.85); border: 1px solid #cb9f78; border-radius: 8px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.7;">
            <p style="margin: 3px 0;"><strong>Booking Reference:</strong> <span style="font-family: monospace; color: #e6a147; font-weight: bold;">#${bookingRef}</span></p>
            <p style="margin: 3px 0;"><strong>Assigned Table:</strong> ${tableName} ${tableId ? `(ID: ${tableId})` : ''}</p>
            <p style="margin: 3px 0;"><strong>Date:</strong> ${sanitizeHtml(bookingData.booking_date)}</p>
            <p style="margin: 3px 0;"><strong>Time Window:</strong> ${sanitizeHtml(bookingData.start_time)} - ${sanitizeHtml(bookingData.end_time)} (${durationMins} minutes)</p>
            <p style="margin: 3px 0;"><strong>Party Size:</strong> ${guestCount} Guests</p>
            <p style="margin: 3px 0;"><strong>Status:</strong> <span style="color: #4ade80; text-transform: uppercase; font-weight: bold;">Confirmed</span></p>
            ${!isCustomer ? `
              <hr style="border: 0; border-top: 1px solid rgba(203,159,120,0.25); margin: 12px 0;" />
              <p style="margin: 3px 0;"><strong>Customer Name:</strong> ${customerName}</p>
              <p style="margin: 3px 0;"><strong>Customer Email:</strong> ${customerEmail}</p>
              <p style="margin: 3px 0;"><strong>Customer Phone:</strong> ${customerPhone}</p>
            ` : ''}
            ${bookingData.special_notes ? `<p style="margin: 3px 0;"><strong>Special Notes:</strong> <em>"${sanitizeHtml(bookingData.special_notes)}"</em></p>` : ''}
          </div>

          <p style="font-size: 11px; color: #8c7365; text-align: center; margin-top: 24px; line-height: 1.5;">
            Sent securely via L'Aura Cafe Reservation Engine (Gmail SMTP).<br />
            For questions or modifications, please contact the cafe directly.
          </p>
        </div>
      </div>
    `;

    // 11. Initialize Nodemailer Transporter (Strictly Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
      connectionTimeout: 10000,
    });

    let info = null;
    try {
      // 12. Dispatch Email via Gmail SMTP
      info = await transporter.sendMail({
        from: `"${cafeName}" <${gmailUser}>`,
        to: finalRecipient,
        subject,
        html: emailHtml,
      });
    } catch (smtpError) {
      console.error('[Gmail SMTP Dispatch Error]:', smtpError.message || smtpError);

      // Release claim in database on SMTP failure to permit safe retry (Issue 4)
      const { data: rpcData, error: rpcErr } = await serverSupabase.rpc('record_notification_result', {
        p_booking_id: bookingData.id,
        p_notification_type: type,
        p_success: false,
        p_recipient_email: finalRecipient,
        p_subject: subject,
        p_error: smtpError.message || 'SMTP transmission failure',
      });
      if (rpcErr || rpcData?.success === false) {
        console.error('[RPC Failure Releasing Claim on SMTP Failure]:', rpcErr?.message || rpcData?.error || 'Claim release unsuccessful');
      }

      return NextResponse.json(
        {
          success: false,
          status: 'failed',
          error: 'Failed to dispatch email notification via Gmail SMTP.',
        },
        { status: 500 }
      );
    }

    const submittedTimestamp = new Date().toISOString();

    // 13. Persist Accurate Notification Status with Full RPC Validation
    const { data: recordData, error: recordErr } = await serverSupabase.rpc('record_notification_result', {
      p_booking_id: bookingData.id,
      p_notification_type: type,
      p_success: true,
      p_recipient_email: finalRecipient,
      p_subject: subject,
      p_message_id: info.messageId || null,
    });

    // Validate returned data as well as transport error
    const rpcCallSucceeded = !recordErr && recordData && recordData.success === true;
    const claimPersistedSuccess = Boolean(rpcCallSucceeded && recordData.claim_persisted === true);
    const logPersistedSuccess = Boolean(rpcCallSucceeded && recordData.log_persisted === true);
    const overallPersisted = Boolean(claimPersistedSuccess && logPersistedSuccess);

    let persistenceErrorMsg = null;
    if (recordErr) {
      persistenceErrorMsg = 'Database status update failed after SMTP submission.';
      console.error('[Truthful Persistence Failure]:', recordErr.message || recordErr);
    } else if (recordData && recordData.success === false) {
      persistenceErrorMsg = 'Database status recording rejected after SMTP submission.';
      console.error('[Truthful Persistence Rejection]:', recordData.error || recordData.status);
    } else if (recordData && recordData.log_persisted === false) {
      persistenceErrorMsg = 'Email audit log insertion failed.';
      console.error('[Truthful Audit Log Failure]:', recordData.log_error || 'Log insert error');
    }

    // Return truthful status distinguishing SMTP submission from database persistence
    // Does NOT claim email was unsent (prevents duplicate dispatch retries)
    return NextResponse.json({
      success: true,
      status: 'submitted',
      smtpAccepted: true,
      persisted: overallPersisted,
      claimPersisted: claimPersistedSuccess,
      logPersisted: logPersistedSuccess,
      persistenceError: overallPersisted ? null : persistenceErrorMsg,
      provider: 'gmail_smtp',
      messageId: info.messageId,
      submittedAt: submittedTimestamp,
    });
  } catch (error) {
    console.error('[Unexpected Dispatch Route Error]:', error.message || error);
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        error: 'An unexpected error occurred during email notification processing.',
      },
      { status: 500 }
    );
  }
}
