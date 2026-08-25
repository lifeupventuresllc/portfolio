-- 034: Column for prompt 5's "reword the instruction into human copy" LLM
-- step (lib/next-action/llm.ts humanizeInstruction). Stored once, at the
-- moment an instruction is created, so repeated GETs of the same open row
-- always show the exact same wording (matching the existing "don't re-roll
-- on refresh" rule) instead of the LLM rewording it differently each fetch.
-- `instruction` stays the raw deterministic text used for logic/debugging;
-- `display_text` is what she actually sees, falling back to `instruction`
-- whenever the LLM isn't configured or the call fails.
alter table next_action_log add column if not exists display_text text;
