import { formatExp, expStatus } from '../../utils/skladUtils'

export default function CriticalItems({ items }) {
  return (
    <div className="border rounded-2xl bg-white shadow-sm p-4 mb-3">
      <div className="text-base font-bold mb-2">Kritické položky</div>

      {items.length === 0 ? (
        <div className="text-sm opacity-70">Žiadne kritické položky ✅</div>
      ) : (
        <div className="space-y-2">
          {items.map(r => {
            const st = expStatus(r.expiracia)

            return (
              <div key={r.id} className="border rounded-xl p-3">
                <div className="font-semibold">{r.produkty?.nazov ?? '—'}</div>
                <div className="text-sm opacity-70">
                  {r.sklady?.nazov ?? '—'} · EXP {formatExp(r.expiracia)}
                </div>
                <div className="text-sm mt-1">
                  {Number(r.mnozstvo) || 0} ks · {st.label}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}