import { fmtEur } from '../../utils/skladUtils'

export default function WarehouseValue({ items }) {
  return (
    <div className="border rounded-2xl bg-white shadow-sm p-4 mb-3">
      <div className="text-base font-bold mb-2">Hodnota podľa skladu</div>

      {items.length === 0 ? (
        <div className="text-sm opacity-70">Žiadne dáta.</div>
      ) : (
        <div className="space-y-2">
          {items.map(x => (
            <div key={x.name} className="border rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{x.name}</div>
                <div className="font-bold">{fmtEur(x.value)}</div>
              </div>
              <div className="text-sm opacity-70 mt-1">{x.qty} ks</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}