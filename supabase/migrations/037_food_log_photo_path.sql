-- 037: add a photo_path column to challenge_food_log so a meal-photo entry
-- (camera capture -> meal-photos bucket) can carry the uploaded image's
-- storage path back to a real food-log row, for the future Cal-AI-style
-- backend to read and estimate calories/macros from. Nullable -- every
-- existing logging path (manual, USDA search, AI-estimate, plan) leaves
-- this null and is unaffected.
alter table challenge_food_log add column if not exists photo_path text;
