
-- Products (bottle sizes & empty bottles)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('refill','empty_bottle')),
  size_liters numeric NOT NULL,
  price numeric NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Promotions/ads
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  badge text,
  cta_label text,
  cta_url text,
  bg_gradient text,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  address_label text,
  notes text,
  delivery_type text NOT NULL DEFAULT 'delivery' CHECK (delivery_type IN ('delivery','pickup')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  lat double precision,
  lng double precision,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','preparing','out_for_delivery','delivered','cancelled')),
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

-- Business settings (single row)
CREATE TABLE public.shop_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shop_name text NOT NULL DEFAULT 'Blue Shade',
  tagline text NOT NULL DEFAULT 'Purified drinking water · Refill & Delivery',
  phone text NOT NULL DEFAULT '0791 366 663',
  base_delivery_fee numeric NOT NULL DEFAULT 50,
  free_delivery_threshold numeric NOT NULL DEFAULT 500,
  accent_hue int NOT NULL DEFAULT 205,
  open_now boolean NOT NULL DEFAULT true,
  hero_message text DEFAULT 'Pure water, delivered to your door.',
  shop_lat double precision,
  shop_lng double precision
);

INSERT INTO public.shop_settings (id) VALUES (1);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed products
INSERT INTO public.products (name, kind, size_liters, price, description, sort_order) VALUES
  ('20L Refill', 'refill', 20, 200, 'Refill your 20L bottle with purified water', 1),
  ('10L Refill', 'refill', 10, 120, 'Refill your 10L bottle', 2),
  ('5L Refill', 'refill', 5, 70, 'Refill your 5L bottle', 3),
  ('1L Refill', 'refill', 1, 20, 'Refill your 1L bottle', 4),
  ('Empty 20L Bottle', 'empty_bottle', 20, 450, 'Brand new empty 20L bottle', 5),
  ('Empty 10L Bottle', 'empty_bottle', 10, 280, 'Brand new empty 10L bottle', 6),
  ('Empty 5L Bottle', 'empty_bottle', 5, 180, 'Brand new empty 5L bottle', 7);

INSERT INTO public.promotions (title, body, badge, bg_gradient) VALUES
  ('20% off your first delivery', 'Use any size bottle. Tap to order — we come to you.', 'NEW', 'linear-gradient(135deg, oklch(0.72 0.16 215), oklch(0.55 0.18 240))'),
  ('Free delivery over 500 KSh', 'Stock up the home or office and we deliver free.', 'OFFER', 'linear-gradient(135deg, oklch(0.78 0.14 195), oklch(0.62 0.17 220))');

-- RLS: public app, no auth → permissive
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products write" ON public.products FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "promotions read" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "promotions write" ON public.promotions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "orders read" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders write" ON public.orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "settings read" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "settings write" ON public.shop_settings FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_settings;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.promotions REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.shop_settings REPLICA IDENTITY FULL;
