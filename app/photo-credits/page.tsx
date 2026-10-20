import { MEAL_PHOTO_CREDITS } from '@/lib/meal-photo-credits'

// Credit for the free-license meal photos on the Nutrition tab (CC BY /
// BY-SA ask for it). Chain meals show a photo of that kind of food — these
// are not the restaurants' own photos.
export default function PhotoCreditsPage() {
  return (
    <div className="min-h-[100dvh] px-4 py-8" style={{ background: '#021F16', color: '#EDE7DA' }}>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Meal photo credits</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(237,231,218,0.55)' }}>Photos show the kind of food, not a restaurant&apos;s own photo. From Wikimedia Commons.</p>
        <ul className="space-y-3 text-[13px]">
          {MEAL_PHOTO_CREDITS.map((c) => (
            <li key={c.file}>
              <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{c.title}</a>
              <span style={{ color: 'rgba(237,231,218,0.55)' }}> · {c.author} · {c.license}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
