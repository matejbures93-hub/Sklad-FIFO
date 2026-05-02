import { formatExp } from '../../utils/skladUtils'

export default function InventoryModal({
  invOpen,
  invSaving,
  invErr,
  invRow,
  invQty,
  setInvQty,
  closeInv,
  saveInv,
}) {
  if (!invOpen) return null

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/40" onClick={closeInv} aria-label="Zavrieť" />
      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white border rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-semibold">Inventúra šarže</div>
          <button className="text-sm underline" onClick={closeInv} disabled={invSaving}>Zavrieť</button>
        </div>

        <div className="text-sm opacity-70">
          Produkt: <b>{invRow?.produkty?.nazov ?? '—'}</b><br />
          Sklad: <b>{invRow?.sklady?.nazov ?? '—'}</b><br />
          EXP: <b>{formatExp(invRow?.expiracia) || '—'}</b><br />
          Aktuálne v systéme: <b>{Number(invRow?.mnozstvo) || 0} ks</b>
        </div>

        <div className="mt-3">
          <div className="text-sm font-semibold mb-1">Reálne množstvo (ks)</div>
          <input
            inputMode="numeric"
            className="w-full border rounded-xl px-3 py-3 text-lg"
            placeholder="napr. 5"
            value={invQty}
            onChange={(e) => setInvQty(e.target.value.replace(/[^\d]/g, ''))}
            disabled={invSaving}
          />
          <div className="text-xs opacity-60 mt-1">
            Ak zadáš 0, šarža sa deaktivuje a zmizne zo skladu.
          </div>
        </div>

        {invErr && <div className="text-sm border rounded-xl p-2 mt-3 bg-white">{invErr}</div>}

        <button
          className="w-full border rounded-xl py-3 text-lg font-semibold mt-3"
          onClick={saveInv}
          disabled={invSaving}
        >
          {invSaving ? 'Ukladám…' : 'Uložiť inventúru'}
        </button>
      </div>
    </div>
  )
}