-- Step 1: Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Step 2: Update existing fitness product
UPDATE products SET slug = 'fitness-program', category = 'fitness', sort_order = 1 WHERE name = 'Complete Fitness Program';

-- Step 3: Insert Content Editing products
INSERT INTO products (name, description, price, active, slug, category, sort_order) VALUES
('Content Editing - Starter', 'Get consistent, polished content — 4 Reels/month', 29700, true, 'content-starter', 'content-editing', 10),
('Content Editing - Growth', 'For creators ready to break through — 8 Reels/month', 59700, true, 'content-growth', 'content-editing', 11),
('Content Editing - Full Engine', 'Your entire content operation, handled — 12+ Reels/month', 99700, true, 'content-engine', 'content-editing', 12);

-- Step 4: Insert Audio Engineering products
INSERT INTO products (name, description, price, active, slug, category, sort_order) VALUES
('Audio Engineering - Single', '1 track professional mix & master', 15000, true, 'audio-single', 'audio-engineering', 20),
('Audio Engineering - EP Package', '3-5 tracks mix & master with project consistency', 50000, true, 'audio-ep', 'audio-engineering', 21),
('Audio Engineering - Album', '6-12 tracks mix & master with creative direction', 90000, true, 'audio-album', 'audio-engineering', 22);
