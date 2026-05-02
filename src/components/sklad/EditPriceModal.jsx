import { fmtEur } from '../../utils/skladUtils'

export default function EditPriceModal({
  editOpen,
  editSaving,
  editErr,
  editPrice,
  setEditPrice,
  closeEdit,
  saveEdit,
}) {
  if (!editOpen) return null

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/40" onClick={closeEdit} aria-label="Zavrieť" />
      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white border rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-semibold">Upraviť nákupnú cenu</div>
          <button className="text-sm underline" onClick={closeEdit} disabled={editSaving}>Zavrieť</button>
        </div>

        <div className="text-sm opacity-70 mb-2">
          Zadaj cenu za kus (€/ks). Môžeš písať aj s čiarkou (napr. 2,30).
        </div>

        <input
          inputMode="decimal"
          className="w-full border rounded-xl px-3 py-3 text-lg"
          placeholder="napr. 2,30"
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
          disabled={editSaving}
        />

        {editErr && <div className="text-sm border rounded-xl p-2 mt-2 bg-white">{editErr}</div>}

        <button
          className="w-full border rounded-xl py-3 text-lg font-semibold mt-3"
          onClick={saveEdit}
          disabled={editSaving}
        >
          {editSaving ? 'Ukladám…' : 'Uložiť'}
        </button>
      </div>
    </div>
  )
}