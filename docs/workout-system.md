# Workout system: first-weeks success

**Goal:** a brand-new woman finishes her first workout thinking "I can do this" and starts her second.
**Built:** 2026-11-17 (commits `2561c42`, `6fdc6c6` and this one). Spec: Asa's 13-item prompt.

## 1. Data model (what is saved, where)

| What | Where | Notes |
|---|---|---|
| Intake: goal, level, days/week, gym/home, injuries, body weight | `challenge_intake` (+ `form_data`) | Sign-up flow, `app/plan/intake/NewFlow.tsx` |
| What she has at home | `form_data.home_weights` = `dumbbell` / `both` / `none` | Asked on her first home workout; "Change" anytime. Old `home_kettlebells` kept in step |
| Every set she taps Done on | `workout_set_logs` (exercise, set index, weight_lb, effort) | Saved the moment she taps. Easy/Hard after a set = `effort` |
| Workout finished + how it felt | `challenge_progress` row `note='__daily__'`, `measurements.workout`, `measurements.effort` 1/2/3 | 1 too easy, 2 just right, 3 too hard |
| HIIT day | same row, `measurements.hiit` | Never moves the lifting rotation |
| Favorites, "always" swaps | `form_data.favorite_moves`, always-swaps | |
| Where she was mid-workout | phone storage `luf_workout_at` (today only) | Reopens on the same screen |

## 2. Sign-up flow (no extra questions)

name → goal → body → days → where she trains → how she likes to lift + level → injuries → food.
**No weight test at sign-up** (Asa's "reduce her input" rule): her first real workout finds her weights instead (section 3).

## 3. Weights (calibration)

1. First time a move appears: a safe start from her level, body weight and the kind of move (`lib/weight-picker.ts`, beginner women's ranges, real dumbbell steps 3/5/8/10/12/15…).
2. The weight row says: "Pick a weight where the last 2 reps feel hard but doable." She taps − / + anytime.
3. After each set: **Hard** → next set one step lighter. **Easy** → one step heavier, only during the gentle start.
4. Her Done saves the weight she used, so the next workout starts there. Double progression moves it up when she hits the top of her reps; two misses move it down (`lib/double-progression.ts`).

## 4. Gentle start (ramp-up rules) — `lib/gentle-start.ts`

- Her **first 4 workouts** (counted workouts, not calendar weeks): one set fewer (never under 2), 30 sec more rest, no step-up sets. A typical gym day goes 21 → 15 sets.
- End of every workout: **How did that feel?** Too easy / Just right / Too hard.
  - Too hard → next workout gentle again **and** every weight one step lighter.
  - Too easy twice in a row (after 2+ workouts) → gentle ends early.
- **Back after 14+ days** → gentle again. No catching up, no penalty.
- The weekly plan never changes; only how hard each session is.

## 5. Screens

| Screen | What she sees |
|---|---|
| Warm-up | Where she is today (Gym/Home), home equipment question once, and one line: "Today: 8 moves, about 30 minutes. Easy start: fewer sets and more rest." (+ "Welcome back" after 5+ days away) |
| Each move | Full-body video, name, Set X of Y, reps, weight with − / +, "How to" → 2–3 form tips, big Done, Back / Swap / Skip |
| Rest | Timer, Easy / Hard, "Next set: 10 lb" when the weight changed |
| Done | Confetti, reward, How did that feel?, "Did these too? Tap to log them" for moves she skipped, friendly check-in opt-in |
| My Plan (Progress) | Her week, 6-week block, Strength chart, milestones |

## 6. Coach

Every Coach Asa reply reads `lib/training-context.ts` first: workouts finished, days since the last one, how her last workouts felt, weights per lift, recent Easy/Hard taps, and whether she's in the gentle start.

## 7. Missed days and check-ins

- Missed days slide the plan forward (rotation follows workouts done, not dates). No penalty.
- Daily check-in (`app/api/cron/daily-nudge`): after 3+ quiet days the message is "Hey, just checking in 💛 No catching up needed. Today starts fresh with a short, easy workout." She opts in on the Done screen.

## 8. Test plan (verifies the success definition)

| # | Check | How |
|---|---|---|
| 1 | Gentle rules | `gentleFrom` unit tests: new user gentle; 4 done → normal; too hard → gentle + lighter; easy ×2 → ends early; 14+ days away → gentle |
| 2 | Every user's plan builds | Read-only run of `buildLiveProgram` + `buildBlocks` for all accounts: 0 errors, 0 empty days |
| 3 | No-weights home never shows a weighted move | All levels × styles × goals × days/week |
| 4 | First workout, new guest (`/clear-session`) | Set 1 **of 2**, weight tip shows, Easy after set 1 → "Next set" heavier, finish → feel question → tap Too hard |
| 5 | Second workout | Weights one step lighter, warm-up line says why |
| 6 | Resume | Leave mid-workout, reopen → same screen + "Picked up where you left off." |
| 7 | Forgotten set | Skip a move, finish → it's listed → tap → shows in Strength |
| 8 | Coach | Ask "how am I doing?" → reply uses her real numbers |
| 9 | Success metric (real users) | % of new users who finish workout 1, and % who start workout 2 within 7 days (`challenge_progress` `__daily__` rows) |
