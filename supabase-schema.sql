-- ==============================================================================
-- L'Aura Cafe & Artisanal Roastery — Complete Supabase PostgreSQL Schema
-- Tables, RLS Policies, Realtime Publication, Atomic Booking Function & Seed Data
-- ==============================================================================

-- 1. CAFE SETTINGS
CREATE TABLE IF NOT EXISTS cafe_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    name TEXT NOT NULL DEFAULT 'L''Aura Cafe & Roastery',
    tagline TEXT DEFAULT 'Artisan Coffee, Culinary Brunch & Ambient Living',
    address TEXT NOT NULL DEFAULT 'Plot 14, Park Street Heritage Area, Kolkata 700016',
    landmark TEXT DEFAULT 'Near Camac Street Crossing, Level 1',
    phone TEXT NOT NULL DEFAULT '+91 98301 23456',
    owner_email TEXT DEFAULT NULL,
    owner_email_configured BOOLEAN NOT NULL DEFAULT FALSE,
    opening_time TIME NOT NULL DEFAULT '08:00',
    closing_time TIME NOT NULL DEFAULT '23:00',
    default_duration INT NOT NULL DEFAULT 90, -- minutes
    cleaning_buffer INT NOT NULL DEFAULT 15, -- minutes
    seating_mode TEXT NOT NULL DEFAULT 'exclusive_table' CHECK (seating_mode IN ('exclusive_table', 'shared_seating')),
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    currency TEXT NOT NULL DEFAULT '₹',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CAFE TABLES & CHAIR CAPACITY
CREATE TABLE IF NOT EXISTS cafe_tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance')),
    shape TEXT DEFAULT 'square',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS menu_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- 4. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    category TEXT REFERENCES menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    badge TEXT,
    image TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL REFERENCES cafe_tables(id) ON DELETE RESTRICT,
    table_name TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    guest_count INT NOT NULL CHECK (guest_count > 0),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    special_notes TEXT,
    customer_email_sent BOOLEAN DEFAULT FALSE,
    owner_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EMAIL NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'owner')),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('submitted', 'queued', 'failed', 'sent')),
    message_id TEXT,
    provider TEXT DEFAULT 'gmail_smtp',
    error_message TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SAFE MIGRATION FOR EXISTING DEPLOYMENTS (V8/V9 SCHEMA RECONCILIATION)
-- ==============================================================================
-- Reconcile email_logs columns and status constraint safely for existing databases
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gmail_smtp';
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS payload JSONB;

DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    -- 1. Identify any existing status check constraint scoped strictly to public.email_logs
    FOR v_constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.relname = 'email_logs'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    END LOOP;

    -- 2. Add reconciled status check constraint strictly scoped to public.email_logs
    -- Supports all application statuses: 'submitted', 'queued', 'failed', and legacy 'sent'
    ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_status_check 
        CHECK (status IN ('submitted', 'queued', 'failed', 'sent'));
END $$;

-- Safe migration for cafe_settings: add explicit configuration state and drop legacy default
ALTER TABLE public.cafe_settings ADD COLUMN IF NOT EXISTS owner_email_configured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.cafe_settings ALTER COLUMN owner_email DROP DEFAULT;
ALTER TABLE public.cafe_settings ALTER COLUMN owner_email DROP NOT NULL;


-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE SEARCH & CONCURRENCY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_date_table ON bookings (booking_date, table_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tables_status ON cafe_tables (status);

-- ==============================================================================
-- ATOMIC BOOKING FUNCTION (PREVENTS DOUBLE BOOKINGS & TIME OVERLAPS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION book_table_atomic(
    p_booking_id TEXT,
    p_table_id TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_duration_minutes INT,
    p_guest_count INT,
    p_special_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table_capacity INT;
    v_table_status TEXT;
    v_table_name TEXT;
    v_overlap_count INT;
    v_occupied_seats INT;
    v_seating_mode TEXT;
    v_opening_time TIME;
    v_closing_time TIME;
    v_buffer INT;
    v_timezone TEXT;
    v_current_local_ts TIMESTAMP;
    v_current_local_date DATE;
    v_booking_start_ts TIMESTAMP;
    v_booking_end_ts TIMESTAMP;
    v_cafe_open_ts TIMESTAMP;
    v_cafe_close_ts TIMESTAMP;
BEGIN
    -- 1. Fetch authoritative cafe configuration (opening hours, buffer, mode, and timezone)
    SELECT 
        COALESCE(opening_time, '08:00'::TIME),
        COALESCE(closing_time, '23:00'::TIME),
        COALESCE(cleaning_buffer, 15),
        COALESCE(seating_mode, 'exclusive_table'),
        COALESCE(timezone, 'Asia/Kolkata')
    INTO v_opening_time, v_closing_time, v_buffer, v_seating_mode, v_timezone
    FROM cafe_settings 
    WHERE id = 'primary';

    IF v_timezone IS NULL OR trim(v_timezone) = '' THEN
        v_timezone := 'Asia/Kolkata';
    END IF;

    -- Calculate current wall-clock timestamp and date in the configured cafe timezone
    v_current_local_ts := (NOW() AT TIME ZONE v_timezone);
    v_current_local_date := v_current_local_ts::DATE;

    -- 2. Validate required inputs
    IF p_booking_id IS NULL OR trim(p_booking_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ID', 'message', 'Booking ID is required.');
    END IF;

    IF p_customer_name IS NULL OR trim(p_customer_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME', 'message', 'Customer name is required.');
    END IF;

    IF p_customer_email IS NULL OR p_customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_EMAIL', 'message', 'A valid email address is required.');
    END IF;

    -- Validate booking date in cafe timezone (reject past dates)
    IF p_booking_date IS NULL OR p_booking_date < v_current_local_date THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAST_DATE', 'message', 'Reservation date cannot be in the past.');
    END IF;

    -- Validate stay duration (30m to 240m)
    IF p_duration_minutes IS NULL OR p_duration_minutes < 30 OR p_duration_minutes > 240 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_DURATION', 'message', 'Stay duration must be between 30 and 240 minutes.');
    END IF;

    -- Validate start time format & calculate end timestamp authoritatively without losing date across midnight
    IF p_start_time IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_START_TIME', 'message', 'Start time is required.');
    END IF;
    
    v_booking_start_ts := (p_booking_date + p_start_time);
    v_booking_end_ts := v_booking_start_ts + (p_duration_minutes || ' minutes')::interval;
    p_end_time := v_booking_end_ts::TIME;

    -- 3. Enforce cafe operating hours across midnight boundaries (handles daytime & overnight hours)
    IF v_closing_time > v_opening_time THEN
        -- Standard daytime/evening schedule (e.g., 08:00 to 23:00)
        v_cafe_open_ts := (p_booking_date + v_opening_time);
        v_cafe_close_ts := (p_booking_date + v_closing_time);
    ELSE
        -- Overnight schedule (e.g., 18:00 to 02:00)
        IF p_start_time < v_closing_time THEN
            -- Booking starts after midnight (e.g., 01:00) within the overnight window
            -- The operating window opened on the previous calendar evening
            v_cafe_open_ts := ((p_booking_date - INTERVAL '1 day')::DATE + v_opening_time);
            v_cafe_close_ts := (p_booking_date + v_closing_time);
        ELSE
            -- Booking starts before midnight (e.g., 20:00) extending into next calendar morning
            v_cafe_open_ts := (p_booking_date + v_opening_time);
            v_cafe_close_ts := ((p_booking_date + INTERVAL '1 day')::DATE + v_closing_time);
        END IF;
    END IF;

    IF v_booking_start_ts < v_cafe_open_ts THEN
        RETURN jsonb_build_object('success', false, 'error', 'BEFORE_OPENING', 'message', format('Reservation start time (%s) is before cafe opening (%s).', to_char(v_booking_start_ts, 'HH24:MI'), to_char(v_cafe_open_ts, 'HH24:MI')));
    END IF;

    IF v_booking_end_ts > v_cafe_close_ts THEN
        RETURN jsonb_build_object('success', false, 'error', 'AFTER_CLOSING', 'message', format('Reservation end time (%s) extends past cafe closing (%s).', to_char(v_booking_end_ts, 'HH24:MI'), to_char(v_cafe_close_ts, 'HH24:MI')));
    END IF;

    -- Enforce that reservation start time is not in the past relative to cafe timezone
    IF v_booking_start_ts <= v_current_local_ts THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAST_TIME', 'message', 'Reservation time has already passed for today.');
    END IF;

    -- 3. Check table existence, status and lock table row to prevent concurrent race conditions
    SELECT capacity, status, name 
    INTO v_table_capacity, v_table_status, v_table_name
    FROM cafe_tables
    WHERE id = p_table_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TABLE_NOT_FOUND', 'message', 'Selected table does not exist.');
    END IF;

    IF v_table_status <> 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'TABLE_UNAVAILABLE', 'message', 'This table is currently unavailable or undergoing maintenance.');
    END IF;

    -- Validate guest count against table physical chair capacity
    IF p_guest_count IS NULL OR p_guest_count <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_GUESTS', 'message', 'Party size must be at least 1 guest.');
    END IF;

    IF p_guest_count > v_table_capacity THEN
        RETURN jsonb_build_object('success', false, 'error', 'EXCEEDS_CAPACITY', 'message', format('Party of %s exceeds table capacity of %s chairs.', p_guest_count, v_table_capacity));
    END IF;

    -- 4. Concurrency Check factoring in Cleaning Buffer across midnight boundaries
    IF v_seating_mode = 'shared_seating' THEN
        SELECT COALESCE(SUM(guest_count), 0)
        INTO v_occupied_seats
        FROM bookings
        WHERE table_id = p_table_id
          AND status = 'confirmed'
          AND booking_date BETWEEN (p_booking_date - 1) AND (p_booking_date + 1)
          AND (
            v_booking_start_ts < (
              CASE 
                WHEN end_time <= start_time THEN ((booking_date + INTERVAL '1 day')::DATE + end_time)
                ELSE (booking_date + end_time)
              END + (v_buffer || ' minutes')::interval
            )
            AND
            v_booking_end_ts > (
              (booking_date + start_time) - (v_buffer || ' minutes')::interval
            )
          );

        IF (v_occupied_seats + p_guest_count) > v_table_capacity THEN
            RETURN jsonb_build_object('success', false, 'error', 'CAPACITY_EXCEEDED', 'message', format('Only %s seats remain available for this table during the selected time (including %s-min cleaning buffer).', GREATEST(0, v_table_capacity - v_occupied_seats), v_buffer));
        END IF;
    ELSE
        -- Exclusive Table Mode: any overlapping booking (plus cleaning buffer) reserves the whole table
        SELECT COUNT(*)
        INTO v_overlap_count
        FROM bookings
        WHERE table_id = p_table_id
          AND status = 'confirmed'
          AND booking_date BETWEEN (p_booking_date - 1) AND (p_booking_date + 1)
          AND (
            v_booking_start_ts < (
              CASE 
                WHEN end_time <= start_time THEN ((booking_date + INTERVAL '1 day')::DATE + end_time)
                ELSE (booking_date + end_time)
              END + (v_buffer || ' minutes')::interval
            )
            AND
            v_booking_end_ts > (
              (booking_date + start_time) - (v_buffer || ' minutes')::interval
            )
          );

        IF v_overlap_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'TIME_SLOT_OCCUPIED', 'message', format('This table was just reserved by another guest for this window (including %s-min cleaning buffer).', v_buffer));
        END IF;
    END IF;

    -- 5. Insert confirmed booking with unconfirmed email status (emails dispatched post-commit)
    INSERT INTO bookings (
        id,
        table_id,
        table_name,
        customer_name,
        customer_email,
        customer_phone,
        booking_date,
        start_time,
        end_time,
        duration_minutes,
        guest_count,
        status,
        special_notes,
        customer_email_sent,
        owner_email_sent,
        created_at
    ) VALUES (
        p_booking_id,
        p_table_id,
        v_table_name,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_booking_date,
        p_start_time,
        p_end_time,
        p_duration_minutes,
        p_guest_count,
        'confirmed',
        p_special_notes,
        FALSE,
        FALSE,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'table_id', p_table_id,
        'table_name', v_table_name,
        'message', 'Reservation confirmed successfully!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION book_table_atomic TO anon, authenticated;

-- ==============================================================================
-- NOTIFICATION DISPATCH CLAIMS (CONCURRENCY-SAFE DUPLICATE DISPATCH PREVENTION)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notification_claims (
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('customer', 'owner')),
    status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'submitted', 'failed')),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (booking_id, notification_type)
);

ALTER TABLE notification_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view and manage notification claims"
ON notification_claims
FOR ALL
USING (is_admin());

-- Server-Only Atomic Claim Function for Notification Dispatch (Least Privilege: service_role ONLY)
CREATE OR REPLACE FUNCTION claim_notification_dispatch(
    p_booking_id TEXT,
    p_notification_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_claim notification_claims%ROWTYPE;
    v_already_sent BOOLEAN := FALSE;
BEGIN
    -- Strict Caller Authorization: Only trusted server service_role or admin
    IF (COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' AND current_user <> 'service_role' AND NOT is_admin()) THEN
        RAISE EXCEPTION 'Access Denied: Only server service_role or admin may claim notification dispatch.'
            USING ERRCODE = '42501';
    END IF;

    IF p_notification_type NOT IN ('customer', 'owner') THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_type', 'error', 'Invalid notification type.');
    END IF;

    IF p_booking_id IS NULL OR trim(p_booking_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_id', 'error', 'Booking ID is required.');
    END IF;

    -- Lock the booking row
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_found', 'error', 'Booking record not found.');
    END IF;

    IF v_booking.status <> 'confirmed' THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_confirmed', 'error', format('Booking is %s (must be confirmed).', v_booking.status));
    END IF;

    -- Check if booking flags indicate already sent
    IF p_notification_type = 'customer' AND v_booking.customer_email_sent THEN
        v_already_sent := TRUE;
    ELSIF p_notification_type = 'owner' AND v_booking.owner_email_sent THEN
        v_already_sent := TRUE;
    END IF;

    IF v_already_sent THEN
        RETURN jsonb_build_object('success', false, 'status', 'already_sent', 'message', 'Notification has already been dispatched for this booking.');
    END IF;

    -- Check existing claim in notification_claims
    SELECT * INTO v_claim
    FROM notification_claims
    WHERE booking_id = p_booking_id AND notification_type = p_notification_type
    FOR UPDATE;

    IF FOUND THEN
        IF v_claim.status = 'submitted' THEN
            RETURN jsonb_build_object('success', false, 'status', 'already_sent', 'message', 'Notification has already been dispatched for this booking.');
        ELSIF v_claim.status = 'claimed' AND v_claim.claimed_at > (NOW() - INTERVAL '2 minutes') THEN
            -- In-flight request currently processing
            RETURN jsonb_build_object('success', false, 'status', 'in_flight', 'message', 'A notification dispatch is currently in progress for this booking.');
        ELSE
            -- Failed or timed out claim: allow retry
            UPDATE notification_claims
            SET status = 'claimed', claimed_at = NOW(), updated_at = NOW()
            WHERE booking_id = p_booking_id AND notification_type = p_notification_type;
        END IF;
    ELSE
        -- Insert new claim
        INSERT INTO notification_claims (booking_id, notification_type, status, claimed_at, updated_at)
        VALUES (p_booking_id, p_notification_type, 'claimed', NOW(), NOW());
    END IF;

    -- Return only the minimum non-sensitive status needed (ZERO customer PII returned)
    RETURN jsonb_build_object(
        'success', true,
        'status', 'claimed',
        'booking_id', p_booking_id
    );
END;
$$;

-- Revoke all public execution permissions; grant exclusively to service_role
REVOKE ALL ON FUNCTION claim_notification_dispatch(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_notification_dispatch(TEXT, TEXT) TO service_role;

-- Server-Only Atomic Result Persistence Function for Notification Dispatch (Least Privilege: service_role ONLY)
CREATE OR REPLACE FUNCTION record_notification_result(
    p_booking_id TEXT,
    p_notification_type TEXT,
    p_success BOOLEAN,
    p_recipient_email TEXT DEFAULT NULL,
    p_subject TEXT DEFAULT NULL,
    p_message_id TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Strict Caller Authorization: Only trusted server service_role or admin
    IF (COALESCE(auth.jwt() ->> 'role', '') <> 'service_role' AND current_user <> 'service_role' AND NOT is_admin()) THEN
        RAISE EXCEPTION 'Access Denied: Only server service_role or admin may record notification results.'
            USING ERRCODE = '42501';
    END IF;

    IF p_notification_type NOT IN ('customer', 'owner') THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_type', 'error', 'Invalid notification type.');
    END IF;

    IF p_booking_id IS NULL OR trim(p_booking_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'status', 'invalid_id', 'error', 'Invalid booking ID.');
    END IF;

    -- 1. Row Locking & Existence validation in strict canonical order
    PERFORM 1 FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status', 'not_found', 'error', 'Booking record not found.');
    END IF;

    PERFORM 1 FROM notification_claims 
    WHERE booking_id = p_booking_id AND notification_type = p_notification_type 
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status', 'claim_missing',
            'error', 'Notification claim row was missing or could not be locked.',
            'claim_persisted', false
        );
    END IF;

    DECLARE
        v_claim_count INT := 0;
        v_booking_count INT := 0;
        v_log_persisted BOOLEAN := false;
        v_log_attempted BOOLEAN := false;
        v_log_error TEXT := NULL;
    BEGIN
        IF p_success THEN
            -- Atomic subtransaction strategy: Required state changes either succeed together or roll back together
            BEGIN
                -- 1. Update notification claim to submitted
                UPDATE notification_claims
                SET status = 'submitted', updated_at = NOW()
                WHERE booking_id = p_booking_id AND notification_type = p_notification_type;
                GET DIAGNOSTICS v_claim_count = ROW_COUNT;

                IF v_claim_count = 0 THEN
                    RAISE EXCEPTION 'claim_missing' USING ERRCODE = 'P0002';
                END IF;

                -- 2. Update booking notification flag
                IF p_notification_type = 'customer' THEN
                    UPDATE bookings SET customer_email_sent = TRUE WHERE id = p_booking_id;
                    GET DIAGNOSTICS v_booking_count = ROW_COUNT;
                ELSIF p_notification_type = 'owner' THEN
                    UPDATE bookings SET owner_email_sent = TRUE WHERE id = p_booking_id;
                    GET DIAGNOSTICS v_booking_count = ROW_COUNT;
                END IF;

                IF v_booking_count = 0 THEN
                    RAISE EXCEPTION 'booking_missing' USING ERRCODE = 'P0002';
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    -- Subtransaction rollback happened automatically by PostgreSQL engine!
                    -- Transition claim to 'failed' in an isolated statement so retry is permitted
                    IF SQLERRM = 'booking_missing' THEN
                        UPDATE notification_claims
                        SET status = 'failed', updated_at = NOW()
                        WHERE booking_id = p_booking_id AND notification_type = p_notification_type;

                        RETURN jsonb_build_object(
                            'success', false,
                            'status', 'booking_missing',
                            'error', 'Booking row was missing or could not update notification flag.',
                            'claim_persisted', false
                        );
                    ELSE
                        RETURN jsonb_build_object(
                            'success', false,
                            'status', 'claim_missing',
                            'error', 'Notification claim row was missing or could not be updated.',
                            'claim_persisted', false
                        );
                    END IF;
            END;

            -- 3. Insert audit log inside a protected block if recipient provided
            IF p_recipient_email IS NOT NULL AND trim(p_recipient_email) <> '' THEN
                v_log_attempted := true;
                BEGIN
                    INSERT INTO email_logs (
                        booking_id, recipient_email, recipient_type, subject, status, message_id, provider, created_at
                    ) VALUES (
                        p_booking_id, p_recipient_email, p_notification_type, p_subject, 'submitted', p_message_id, 'gmail_smtp', NOW()
                    );
                    v_log_persisted := true;
                EXCEPTION WHEN OTHERS THEN
                    v_log_persisted := false;
                    v_log_error := SQLERRM;
                END;
            END IF;
        ELSE
            -- 1. Mark claim as failed to permit future safe retry and verify affected rows
            UPDATE notification_claims
            SET status = 'failed', updated_at = NOW()
            WHERE booking_id = p_booking_id AND notification_type = p_notification_type;
            GET DIAGNOSTICS v_claim_count = ROW_COUNT;

            IF v_claim_count = 0 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'status', 'claim_missing',
                    'error', 'Notification claim row was missing or could not be updated to failed state.',
                    'claim_persisted', false
                );
            END IF;

            -- 2. Insert failure audit log if recipient provided inside a protected block
            IF p_recipient_email IS NOT NULL AND trim(p_recipient_email) <> '' THEN
                v_log_attempted := true;
                BEGIN
                    INSERT INTO email_logs (
                        booking_id, recipient_email, recipient_type, subject, status, error_message, provider, created_at
                    ) VALUES (
                        p_booking_id, p_recipient_email, p_notification_type, COALESCE(p_subject, 'Dispatch Failure'), 'failed', p_error, 'gmail_smtp', NOW()
                    );
                    v_log_persisted := true;
                EXCEPTION WHEN OTHERS THEN
                    v_log_persisted := false;
                    v_log_error := SQLERRM;
                END;
            END IF;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'claim_persisted', true,
            'log_attempted', v_log_attempted,
            'log_persisted', v_log_persisted,
            'log_error', v_log_error
        );
    END;
END;
$$;

-- Revoke all public execution permissions; grant exclusively to service_role
REVOKE ALL ON FUNCTION record_notification_result(TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_notification_result(TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ==============================================================================
-- SAFE PUBLIC TABLE AVAILABILITY FUNCTION (ZERO PII EXPOSURE)
-- ==============================================================================
-- Returns ONLY minimal slot allocation data (table_id, time, guest_count)
-- Customer names, emails, phones, and notes are NEVER exposed to public clients.
CREATE OR REPLACE FUNCTION get_public_booked_slots(p_date DATE)
RETURNS TABLE (
    table_id TEXT,
    start_time TIME,
    end_time TIME,
    guest_count INT,
    status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        b.table_id,
        b.start_time,
        b.end_time,
        b.guest_count,
        b.status
    FROM bookings b
    WHERE b.booking_date = p_date
      AND b.status = 'confirmed';
$$;

-- ==============================================================================
-- SECURE PUBLIC CAFE SETTINGS VIEW & RPC (ZERO OWNER EMAIL EXPOSURE)
-- ==============================================================================
-- Exposes strictly non-sensitive public cafe information.
-- owner_email and owner_email_configured are strictly excluded from public access.
CREATE OR REPLACE VIEW public_cafe_settings AS
SELECT 
    id,
    name,
    tagline,
    address,
    landmark,
    phone,
    opening_time,
    closing_time,
    default_duration,
    cleaning_buffer,
    seating_mode,
    timezone,
    currency,
    updated_at
FROM cafe_settings;

CREATE OR REPLACE FUNCTION get_public_cafe_settings()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    tagline TEXT,
    address TEXT,
    landmark TEXT,
    phone TEXT,
    opening_time TIME,
    closing_time TIME,
    default_duration INT,
    cleaning_buffer INT,
    seating_mode TEXT,
    timezone TEXT,
    currency TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        id, name, tagline, address, landmark, phone,
        opening_time, closing_time, default_duration,
        cleaning_buffer, seating_mode, timezone, currency, updated_at
    FROM cafe_settings
    WHERE id = 'primary';
$$;

GRANT SELECT ON public_cafe_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_cafe_settings() TO anon, authenticated;

-- ==============================================================================
-- ENABLE SUPABASE REALTIME PUBLICATION
-- ==============================================================================
-- Tables & bookings published. cafe_settings is omitted to prevent private configuration broadcast.
ALTER PUBLICATION supabase_realtime ADD TABLE cafe_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & GRANTS
-- ==============================================================================
ALTER TABLE cafe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Revoke direct table permissions from anon/public on cafe_settings table
REVOKE ALL ON TABLE cafe_settings FROM anon, PUBLIC;
REVOKE SELECT ON TABLE cafe_settings FROM anon;
GRANT ALL ON TABLE cafe_settings TO service_role;
GRANT SELECT, UPDATE, INSERT ON TABLE cafe_settings TO authenticated;

-- Public can read tables and menu catalog directly (settings accessed via public_cafe_settings view)
CREATE POLICY "Public can view tables" ON cafe_tables FOR SELECT USING (true);
CREATE POLICY "Public can view categories" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Public can view menu items" ON menu_items FOR SELECT USING (true);

-- ==============================================================================
-- TRUSTED ADMIN USERS TABLE & AUTHORIZATION
-- ==============================================================================
-- Server-controlled admin allowlist table
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Verifies whether the calling user has explicit, server-controlled admin privileges:
-- 1. Checked via JWT app_metadata (set by Supabase Admin API, NOT user_metadata which users can edit)
-- 2. OR entry in trusted admin_users table strictly by user_id
-- (NEVER matches mutable cafe_settings or unverified emails to prevent privilege escalation)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (
    auth.uid() IS NOT NULL AND (
      -- 1. Server-controlled role in app_metadata
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      OR
      -- 2. Entry in trusted admin_users allowlist strictly by user_id
      EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid()
      )
    )
  );
$$;

-- Restrict is_admin execution permissions: revoke from PUBLIC and anon
REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, service_role;

-- Admin users table policy: admins can manage allowlist, users can check own status
CREATE POLICY "Admins can view admin allowlist" ON admin_users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Users can check own admin status" ON admin_users FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admin can manage inventory & settings (strictly checked via is_admin)
CREATE POLICY "Admin can modify cafe settings" ON cafe_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can modify tables" ON cafe_tables FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can modify menu items" ON menu_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin can modify categories" ON menu_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Bookings security:
-- 1. Public direct read is disallowed to prevent PII exposure (names, emails, phones)
-- 2. Only authenticated admins with verified role can read and manage all bookings
CREATE POLICY "Admin can view and manage all bookings" ON bookings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Public users cannot execute arbitrary direct inserts; bookings must be placed through
-- the atomic, validated book_table_atomic stored procedure (SECURITY DEFINER).
-- Authenticated admins can insert directly if needed:
CREATE POLICY "Admin can insert bookings directly" ON bookings FOR INSERT TO authenticated WITH CHECK (is_admin());

-- Email logs are strictly private to authenticated admins
CREATE POLICY "Admin can view email logs" ON email_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ==============================================================================
-- SEED DATA (INSERT-ONLY: PRESERVES EXISTING CONFIGURATION ON RERUN)
-- ==============================================================================
INSERT INTO cafe_settings (id, name, tagline, address, landmark, phone, owner_email, owner_email_configured, opening_time, closing_time)
VALUES ('primary', 'L''Aura Cafe & Roastery', 'Artisan Coffee, Culinary Brunch & Ambient Living', 'Plot 14, Park Street Heritage Area, Kolkata 700016', 'Near Camac Street Crossing, Level 1', '+91 98301 23456', NULL, FALSE, '08:00', '23:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cafe_tables (id, name, capacity, status, shape, description) VALUES
('T01', 'Table T01', 2, 'active', 'round', 'Cozy sunlit table. Ideal for pairs.'),
('T02', 'Table T02', 4, 'active', 'square', 'Comfortable table with ambient overhead pendant light.'),
('T03', 'Table T03', 4, 'active', 'square', 'Classic table adjacent to artisan espresso bar.'),
('T04', 'Table T04', 6, 'active', 'rectangle', 'Spacious wooden table surrounded by lush greenery.'),
('T05', 'Table T05', 2, 'active', 'round', 'Intimate quiet table with warm reading light.'),
('T06', 'Table T06', 4, 'active', 'square', 'Contemporary square table under curated artwork.'),
('T07', 'Table T07', 8, 'active', 'rectangle', 'Executive party table for large gatherings.'),
('T08', 'Table T08', 2, 'active', 'round', 'High-top bistro table capturing natural breeze.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_categories (id, name, sort_order) VALUES
('coffee', 'Artisan Roastery', 1),
('brunch', 'Signature Brunch', 2),
('bakery', 'French Bakery', 3),
('desserts', 'Decadent Desserts', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, category, name, description, price, badge, image, is_available) VALUES
('m1', 'coffee', 'Spanish Pistachio Cortado', 'Double shot Ethiopian Yirgacheffe, pistachio paste, textured whole milk, crushed roasted nuts.', 280.00, 'Barista''s Choice', '/images/menu/cortado.jpg', TRUE),
('m2', 'coffee', 'Slow Drip Kyoto Cold Brew', '18-hour Dutch cold drip extraction over ice ball, floral notes with chocolate undertones.', 320.00, 'Limited Batch', '/images/menu/kyoto_cold_brew.jpg', TRUE),
('m3', 'brunch', 'Smoked Salmon & Truffle Eggs Royale', 'Toasted brioche, soft poached organic eggs, Norwegian salmon, truffle hollandaise, caper berries.', 590.00, 'Signature Dish', '/images/menu/salmon_royale.jpg', TRUE),
('m4', 'brunch', 'Avocado Tartine with Za’atar & Feta', 'Rustic sourdough, smashed Hass avocado, Persian feta, toasted seeds, microgreens, extra virgin olive oil.', 420.00, 'Vegetarian', '/images/menu/avocado_tartine.jpg', TRUE),
('m5', 'bakery', 'Artisan Butter Croissant', '72-layer laminated French butter dough, flaky crisp crust, honeycomb airy crumb.', 240.00, 'Baked Fresh Hourly', '/images/menu/croissant.jpg', TRUE),
('m6', 'desserts', 'Valrhona Dark Chocolate Fondant', 'Warm molten 70% dark chocolate core, Madagascan bourbon vanilla bean gelato, raspberry coulis.', 360.00, 'Decadent', '/images/menu/chocolate_fondant.jpg', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public availability permissions & view (15-min auto-complete integrated)
GRANT EXECUTE ON FUNCTION book_table_atomic TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_booked_slots(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_cafe_settings() TO anon, authenticated;

CREATE OR REPLACE VIEW public_booked_slots AS
SELECT 
    b.id,
    b.table_id,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.guest_count,
    b.status
FROM bookings b
WHERE b.status = 'confirmed'
  AND (
    b.booking_date > CURRENT_DATE
    OR (
      b.booking_date = CURRENT_DATE
      AND (b.end_time + INTERVAL '15 minutes') > CURRENT_TIME
    )
  );

GRANT SELECT ON public_booked_slots TO anon, authenticated;

-- Function: auto_complete_expired_bookings (sets past bookings + 15m to 'completed')
CREATE OR REPLACE FUNCTION auto_complete_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE bookings
    SET status = 'completed'
    WHERE status = 'confirmed'
      AND (
        booking_date < CURRENT_DATE
        OR (
          booking_date = CURRENT_DATE
          AND (end_time + INTERVAL '15 minutes') <= CURRENT_TIME
        )
      );
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_complete_expired_bookings() TO anon, authenticated, service_role;


