import { fmtEur } from '../../utils/skladUtils'

export default function TopValue({ items }) {
  return (
    <div className="border rounded-2xl bg-white shadow-sm p-4">
      <div className="text-base font-bold mb-2">Top hodnota skladu</div>

      {items.length === 0 ? (
        <div className="text-sm opacity-70">Žiadne dáta.</div>
      ) : (
        <div className="space-y-2">
          {items.map(x => (
            <div key={x.name} className="border rounded-xl p-3">
              <div className="font-semibold">{x.name}</div>
              <div className="text-sm opacity-70">{x.qty} ks</div>
              <div className="text-sm font-semibold mt-1">{fmtEur(x.value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}