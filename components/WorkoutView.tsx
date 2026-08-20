// On-screen renderer for a generated WorkoutProgram (gym or home).
// Server component; when `editable`, gym superset moves get a swap control
// whose options are computed here (same muscle, her level, injury-safe).
import { GOAL_LABEL, type WorkoutProgram, type GymDay } from '@/lib/workout'
import type { Level, Injury } from '@/lib/workout-exercises'
import { swapOptions } from '@/lib/workout-swap'
import ExerciseSwap from '@/components/ExerciseSwap'

function Cue({ text }: { text: string }) {
  return <p className="text-ivory/40 text-xs leading-relaxed mt-0.5">{text}</p>
}

export default function WorkoutView({ program, editable = false, level = 1, injuries = [] }: {
  program: WorkoutProgram
  editable?: boolean
  level?: Level
  injuries?: Injury[]
}) {
  const isHome = program.track === 'home'

  // Legal swap options for one superset slot (excludes moves used elsewhere that day).
  const optionsFor = (d: GymDay, side: 'push' | 'pull', i: number) => {
    const cur = d.supersets[i][side]
    const used = d.supersets.flatMap((s) => [s.push.name, s.pull.name])
      .concat(d.accessory.map((a) => a.name))
      .filter((n) => n !== cur.name)
    return swapOptions({ muscle: cur.muscle, movement: cur.movement, level, injuries, excludeNames: used })
      .map((e) => ({ name: e.name, cue: e.cue }))
  }
  return (
    <div className="space-y-4">
      {/* Header meta */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] bg-gold/15 text-gold px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">{program.levelLabel}</span>
        <span className="text-[10px] bg-obsidian border border-smoke text-ivory/60 px-2.5 py-1 rounded-full uppercase tracking-wider">{isHome ? 'Home' : 'Gym'}</span>
        <span className="text-[10px] bg-obsidian border border-smoke text-ivory/60 px-2.5 py-1 rounded-full uppercase tracking-wider">Week {program.weekNumber}</span>
        {/* Real, not cosmetic — this program's rep/set scheme and cardio
            duration are now actually built for this goal, not just labeled
            with it. See lib/workout.ts's repScheme()/GOAL_LABEL. */}
        {(GOAL_LABEL as Record<string, string>)[program.goal] && (
          <span className="text-[10px] bg-obsidian border border-smoke text-ivory/60 px-2.5 py-1 rounded-full uppercase tracking-wider">Goal: {(GOAL_LABEL as Record<string, string>)[program.goal]}</span>
        )}
        {program.targetNote && <span className="text-[10px] bg-obsidian border border-smoke text-ivory/60 px-2.5 py-1 rounded-full uppercase tracking-wider">Focus: {program.targetNote}</span>}
      </div>

      {program.injuryNotes && program.injuryNotes.length > 0 && (
        <div className="bg-charcoal border border-gold/30 rounded-2xl p-4">
          <p className="text-gold text-xs uppercase tracking-wider font-semibold mb-2">Your modifications</p>
          <ul className="space-y-1">
            {program.injuryNotes.map((n, i) => <li key={i} className="text-ivory/60 text-xs">• {n}</li>)}
          </ul>
        </div>
      )}

      {/* GYM */}
      {!isHome && program.gymDays?.map((d) => (
        <div key={d.dayNum} className="bg-charcoal border border-smoke rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-white font-bold text-lg">Day {d.dayNum}: {d.title}</h3>
          </div>
          <p className="text-ivory/40 text-xs mb-4">{d.muscles.join(' · ')}</p>

          <p className="text-ivory/50 text-[11px] uppercase tracking-wider mb-1">Warm-up</p>
          <p className="text-ivory/60 text-xs mb-4">{d.warmup.join(' · ')}</p>

          <p className="text-gold text-[11px] uppercase tracking-wider mb-2 font-semibold">Supersets</p>
          <div className="space-y-3 mb-4">
            {d.supersets.map((s, i) => (
              <div key={i} className="bg-obsidian border border-smoke rounded-xl p-3">
                <p className="text-gold/80 text-[10px] uppercase tracking-wider mb-1">Superset {i + 1} — {s.reps}</p>
                <p className="text-white text-sm font-semibold">{s.push.name}</p>
                <Cue text={s.push.cue} />
                {editable && <ExerciseSwap dayNum={d.dayNum} supersetIndex={i} side="push" options={optionsFor(d, 'push', i)} />}
                <p className="text-white text-sm font-semibold mt-2">{s.pull.name}</p>
                <Cue text={s.pull.cue} />
                {editable && <ExerciseSwap dayNum={d.dayNum} supersetIndex={i} side="pull" options={optionsFor(d, 'pull', i)} />}
              </div>
            ))}
          </div>

          <p className="text-gold text-[11px] uppercase tracking-wider mb-2 font-semibold">Accessory</p>
          <div className="space-y-2 mb-4">
            {d.accessory.map((a, i) => (
              <div key={i}>
                <p className="text-white text-sm"><span className="font-semibold">{a.name}</span> <span className="text-ivory/40">· {a.reps}</span></p>
                <Cue text={a.cue} />
              </div>
            ))}
          </div>

          <p className="text-gold text-[11px] uppercase tracking-wider mb-2 font-semibold">Abs — {d.ab.scheme}</p>
          <div className="space-y-2 mb-4">
            <div><p className="text-white text-sm font-semibold">{d.ab.upper.name}</p><Cue text={d.ab.upper.cue} /></div>
            <div><p className="text-white text-sm font-semibold">{d.ab.lower.name}</p><Cue text={d.ab.lower.cue} /></div>
            {d.ab.bonus && (
              <div><p className="text-white text-sm font-semibold">{d.ab.bonus.name} <span className="text-gold/70 text-xs font-normal">— core focus</span></p><Cue text={d.ab.bonus.cue} /></div>
            )}
          </div>

          <div className="bg-obsidian border border-smoke rounded-xl p-3">
            <p className="text-gold/80 text-[10px] uppercase tracking-wider mb-1">Cardio finisher</p>
            <p className="text-white text-sm font-semibold">{d.cardio.title} — {d.cardio.mins}</p>
            <p className="text-ivory/50 text-xs">{d.cardio.speed} · incline {d.cardio.incline}</p>
            <Cue text={d.cardio.note} />
          </div>
        </div>
      ))}

      {/* HOME */}
      {isHome && program.home && (
        <>
          <div className="bg-charcoal border border-smoke rounded-2xl p-5">
            <p className="text-white font-semibold text-sm mb-1">{program.home.minutes} per session</p>
            <p className="text-ivory/50 text-[11px] uppercase tracking-wider mt-3 mb-1">Warm-up</p>
            <p className="text-ivory/60 text-xs">{program.home.warmup.join(' · ')}</p>
          </div>
          {program.home.days.map((d) => (
            <div key={d.dayNum} className="bg-charcoal border border-smoke rounded-2xl p-5">
              <h3 className="text-white font-bold text-base mb-3">{d.title}</h3>
              <div className="space-y-2">
                {d.exercises.map((e, i) => (
                  <div key={i} className="flex justify-between items-center bg-obsidian border border-smoke rounded-xl px-4 py-2.5">
                    <span className="text-white text-sm">{e.name}</span>
                    <span className="text-gold text-xs font-semibold">{e.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="bg-charcoal border border-smoke rounded-2xl p-5">
            <p className="text-ivory/50 text-[11px] uppercase tracking-wider mb-1">Cool-down</p>
            <p className="text-ivory/60 text-xs mb-3">{program.home.cooldown.join(' · ')}</p>
            <p className="text-ivory/50 text-[11px] uppercase tracking-wider mb-1">Walking</p>
            <p className="text-ivory/60 text-xs">{program.home.walking}</p>
          </div>
        </>
      )}
    </div>
  )
}
