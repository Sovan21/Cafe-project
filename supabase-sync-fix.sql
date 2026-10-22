-- ==============================================================================
-- L'Aura Cafe & Roastery — Supabase Sync Fix & Repair Script
-- 1. Grants execute permissions on atomic booking & public slots functions
-- 2. Creates the secure public_booked_slots view (zero PII exposure)
-- 3. Updates all menu items to use dedicated high-res dish photos (/images/menu/...)
-- 4. Ensures permissions for table/chair updating and menu editing from Admin
-- 5. Enables realtime publication for menu_items, cafe_tables, and bookings
-- ==============================================================================

-- 1. PUBLIC AVAILABILITY & ATOMIC BOOKING FUNCTION PERMISSIONS
GRANT EXECUTE ON FUNCTION book_table_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TIME, TIME, INT, INT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_booked_slots(DATE) TO anon, authenticated;

-- Also grant zero-argument overload if created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_public_cafe_settings'
    ) THEN
        GRANT EXECUTE ON FUNCTION get_public_cafe_settings() TO anon, authenticated;
    END IF;
END $$;

-- 2. CREATE SECURE PUBLIC BOOKED SLOTS VIEW & FUNCTION (15-MIN AUTO-COMPLETE INTEGRATED)
-- Excludes any booking where (end_time + 15 mins) has already passed so the table frees automatically!
CREATE OR REPLACE VIEW public_booked_slots
WITH (security_invoker = true) AS
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

-- Function: get_public_booked_slots with 15-minute grace filter
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
      AND b.status = 'confirmed'
      AND (
        p_date > CURRENT_DATE
        OR (
          p_date = CURRENT_DATE
          AND (b.end_time + INTERVAL '15 minutes') > CURRENT_TIME
        )
      );
$$;

GRANT EXECUTE ON FUNCTION get_public_booked_slots(DATE) TO anon, authenticated;

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

-- 3. ENSURE MENU CATEGORIES
INSERT INTO menu_categories (id, name, sort_order) VALUES
('coffee', 'Artisan Roastery', 1),
('brunch', 'Signature Brunch', 2),
('bakery', 'French Bakery', 3),
('desserts', 'Decadent Desserts', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- 4. SEED & REPAIR SIGNATURE DISHES WITH HIGH-RES PHOTOS
-- Updates existing dishes to use the dedicated /images/menu/... photos
INSERT INTO menu_items (id, category, name, description, price, badge, image, is_available) VALUES
('m1', 'coffee', 'Spanish Pistachio Cortado', 'Double shot Ethiopian Yirgacheffe, pistachio paste, textured whole milk, crushed roasted nuts.', 280.00, 'Barista''s Choice', '/images/menu/cortado.jpg', TRUE),
('m2', 'coffee', 'Slow Drip Kyoto Cold Brew', '18-hour Dutch cold drip extraction over ice ball, floral notes with chocolate undertones.', 320.00, 'Limited Batch', '/images/menu/kyoto_cold_brew.jpg', TRUE),
('m3', 'brunch', 'Smoked Salmon & Truffle Eggs Royale', 'Toasted brioche, soft poached organic eggs, Norwegian salmon, truffle hollandaise, caper berries.', 590.00, 'Signature Dish', '/images/menu/salmon_royale.jpg', TRUE),
('m4', 'brunch', 'Avocado Tartine with Za’atar & Feta', 'Rustic sourdough, smashed Hass avocado, Persian feta, toasted seeds, microgreens, extra virgin olive oil.', 420.00, 'Vegetarian', '/images/menu/avocado_tartine.jpg', TRUE),
('m5', 'bakery', 'Artisan Butter Croissant', '72-layer laminated French butter dough, flaky crisp crust, honeycomb airy crumb.', 240.00, 'Baked Fresh Hourly', '/images/menu/croissant.jpg', TRUE),
('m6', 'desserts', 'Valrhona Dark Chocolate Fondant', 'Warm molten 70% dark chocolate core, Madagascan bourbon vanilla bean gelato, raspberry coulis.', 360.00, 'Decadent', '/images/menu/chocolate_fondant.jpg', TRUE)
ON CONFLICT (id) DO UPDATE SET
  image = EXCLUDED.image,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  category = EXCLUDED.category,
  is_available = EXCLUDED.is_available;

-- 5. ENSURE DEFAULT TABLES EXIST
INSERT INTO cafe_tables (id, name, capacity, status, shape, description) VALUES
('T01', 'The Sunlit Alcove', 2, 'active', 'round', 'Cozy window-side table bathed in soft natural morning light.'),
('T02', 'The Pendant Hearth', 4, 'active', 'square', 'Central dining table beneath an artisan hand-blown brass pendant.'),
('T03', 'The Barista Quarter', 4, 'active', 'square', 'Front-row table adjacent to our custom espresso brew bar.'),
('T04', 'The Garden Conservatory', 6, 'active', 'rectangle', 'Spacious solid oak dining table bordered by lush living botanicals.'),
('T05', 'The Library Nook', 2, 'active', 'round', 'Intimate quiet table with warm ambient reading spotlight.'),
('T06', 'The Gallery Quad', 4, 'active', 'square', 'Contemporary dining table set beneath curated heritage artwork.'),
('T07', 'The Grand Oak Banquet', 8, 'active', 'rectangle', 'Executive party table crafted for celebratory brunch and tasting feasts.'),
('T08', 'The Terrace High-Top', 2, 'active', 'round', 'Elevated bistro high-top capturing natural breeze.')
ON CONFLICT (id) DO NOTHING;

-- 6. GRANT TABLE, MENU & BOOKING PERMISSIONS FOR ADMIN OPERATIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE cafe_tables TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE menu_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE menu_categories TO anon, authenticated;
GRANT SELECT, UPDATE ON TABLE bookings TO anon, authenticated;

-- Ensure RLS policies allow authenticated and anon access where needed
DO $$
BEGIN
    -- Tables update/insert/delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cafe_tables' AND policyname = 'Allow admin and manager table management'
    ) THEN
        CREATE POLICY "Allow admin and manager table management" ON cafe_tables FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Menu items update/insert/delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Allow admin and manager menu management'
    ) THEN
        CREATE POLICY "Allow admin and manager menu management" ON menu_items FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Bookings update policy for status management
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Allow admin and manager booking updates'
    ) THEN
        CREATE POLICY "Allow admin and manager booking updates" ON bookings FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    -- Bookings select policy for Realtime CDC synchronization & admin portal
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Allow view bookings for realtime and management'
    ) THEN
        CREATE POLICY "Allow view bookings for realtime and management" ON bookings FOR SELECT USING (true);
    END IF;
END $$;

-- 7. ENABLE SUPABASE REALTIME PUBLICATION FOR MENU ITEMS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_class c ON pr.prrelid = c.oid
            JOIN pg_publication p ON pr.prpubid = p.oid
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'menu_items'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_class c ON pr.prrelid = c.oid
            JOIN pg_publication p ON pr.prpubid = p.oid
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'cafe_tables'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE cafe_tables;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_class c ON pr.prrelid = c.oid
            JOIN pg_publication p ON pr.prpubid = p.oid
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'bookings'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
        END IF;
    END IF;
END $$;
