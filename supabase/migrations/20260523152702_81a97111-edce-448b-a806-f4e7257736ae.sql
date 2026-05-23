CREATE TABLE public.moving_items (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT,
  cubic_feet NUMERIC NOT NULL CHECK (cubic_feet >= 0),
  weight_lbs NUMERIC NOT NULL CHECK (weight_lbs >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.moving_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read moving items"
  ON public.moving_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insert moving items"
  ON public.moving_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update moving items"
  ON public.moving_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete moving items"
  ON public.moving_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER moving_items_updated_at
  BEFORE UPDATE ON public.moving_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.moving_items (item_name, category, cubic_feet, weight_lbs, display_order) VALUES
  ('Small box',            'Boxes',      1.5,  20,   10),
  ('Medium box',           'Boxes',      3,    35,   20),
  ('Large box',            'Boxes',      4.5,  50,   30),
  ('Wardrobe box',         'Boxes',      13,   60,   40),
  ('Twin mattress',        'Bedroom',    20,   45,   50),
  ('Queen mattress',       'Bedroom',    35,   75,   60),
  ('King mattress',        'Bedroom',    45,  100,   70),
  ('Bed frame',            'Bedroom',    15,   80,   80),
  ('Dresser',              'Bedroom',    30,  120,   90),
  ('Nightstand',           'Bedroom',    8,    35,  100),
  ('Wardrobe',             'Bedroom',    45,  180,  110),
  ('2-seat sofa',          'Living',     35,  120,  120),
  ('3-seat sofa',          'Living',     50,  180,  130),
  ('Sectional sofa',       'Living',     85,  280,  140),
  ('Armchair',             'Living',     20,   60,  150),
  ('Coffee table',         'Living',     12,   40,  160),
  ('TV stand',             'Living',     15,   60,  170),
  ('TV (up to 55")',       'Living',     8,    40,  180),
  ('TV (65" or larger)',   'Living',     12,   60,  190),
  ('Bookshelf',            'Living',     20,   80,  200),
  ('Dining table',         'Dining',     35,  100,  210),
  ('Dining chair',         'Dining',     6,    20,  220),
  ('Buffet/Hutch',         'Dining',     45,  180,  230),
  ('Refrigerator',         'Appliance',  35,  250,  240),
  ('Washer',               'Appliance',  20,  180,  250),
  ('Dryer',                'Appliance',  20,  130,  260),
  ('Dishwasher',           'Appliance',  15,  100,  270),
  ('Microwave',            'Appliance',  4,    30,  280),
  ('Office desk',          'Office',     25,   80,  290),
  ('Office chair',         'Office',     10,   35,  300),
  ('Filing cabinet',       'Office',     12,   60,  310),
  ('Bicycle',              'Other',      15,   30,  320),
  ('Treadmill',            'Other',      40,  220,  330),
  ('Patio chair',          'Outdoor',    8,    20,  340),
  ('BBQ grill',            'Outdoor',    25,  100,  350),
  ('Misc item',            'Other',      5,    25,  999);