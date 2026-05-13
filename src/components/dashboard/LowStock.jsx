export default function LowStock({ items }) {
  return (
    <div className="border rounded-2xl bg-white shadow-sm p-4 mb-3">
      <div className="text-base font-bold mb-2">Nízky stav</div>

      {items.length === 0 ? (
        <div className="text-sm opacity-70">Žiadny nízky stav ✅</div>
      ) : (
        <div className="space-y-2">
          {items.map(x => (
            <div key={x.name} className="flex justify-between border rounded-xl p-3">
              <div className="font-semibold">{x.name}</div>
              <div>{x.qty} ks</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}