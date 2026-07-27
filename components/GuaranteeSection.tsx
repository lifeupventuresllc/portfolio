// Shared guarantee block for /challenge and /services/fitness — Asa wants this
// visible near the top AND bottom of both pages. Scale-weight only (no waist
// inches — not reliably the first visible sign of progress in 6 weeks per
// Asa's own coaching judgment), and explicitly scoped to Challenge/Inner
// Circle members since that's the only tier with weekly coaching to guarantee.
export default function GuaranteeSection() {
  return (
    <section className="py-20 px-4 border-t border-smoke">
      <div className="max-w-2xl mx-auto text-center bg-charcoal border-2 border-gold/30 rounded-3xl p-8 sm:p-10">
        <p className="text-gold text-xs font-semibold tracking-[0.25em] uppercase mb-4">
          My Guarantee — Challenge &amp; Inner Circle
        </p>
        <p className="text-white text-lg sm:text-xl font-semibold leading-relaxed">
          Show up and do the work — weekly check-ins, follow your plan, put in your
          workouts. If you still don&apos;t see your first 5–8 lbs down or gained on the
          scale, depending on your goal — I coach you
          <span className="text-gold"> free until you do.*</span>
        </p>
        <p className="text-ivory/50 text-sm mt-4">
          *For Challenge and Inner Circle members. You just hold up your end: check in
          every week, follow the plan, do the workouts. I go all in for the women who go
          all in. That&apos;s on me.
        </p>
      </div>
    </section>
  )
}
