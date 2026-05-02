import { formatExp } from '../../utils/skladUtils'

export default function MoveBatchModal({
  moveOpen,
  moveSaving,
  moveErr,
  moveRow,
  moveQty,
  setMoveQty,
  moveTargetSkladId,
  setMoveTargetSkladId,
  skladyList,
  closeMove,
  saveMove,
}) {
  if (!moveOpen) return null

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/40" onClick={closeMove} aria-label="Zavrieť" />

      <div className="absolute left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white border rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-semibold">Presunúť šaržu</div>
          <button className="text-sm underline" onClick={closeMove} disabled={moveSaving}>Zavrieť</button>
        </div>

        <div className="text-sm opacity-70">
          Produkt: <b>{moveRow?.produkty?.nazov ?? '—'}</b><br />
          Zo skladu: <b>{moveRow?.sklady?.nazov ?? '—'}</b><br />
          EXP: <b>{formatExp(moveRow?.expiracia) || '—'}</b> · Dostupné: <b>{Number(moveRow?.mnozstvo) || 0} ks</b>
        </div>

        <div className="mt-3">
          <div className="text-sm font-semibold mb-1">Cieľový sklad</div>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={moveTargetSkladId}
            onChange={(e) => setMoveTargetSkladId(e.target.value)}
            disabled={moveSaving}
          >
            <option value="">— vyber —</option>
            {skladyList
              .filter(s => Number(s.id) !== Number(moveRow?.sklady?.id))
              .map(s => (
                <option key={s.id} value={s.id}>{s.nazov}</option>
              ))}
          </select>
        </div>

        <div className="mt-3">
          <div className="text-sm font-semibold mb-1">Množstvo (ks)</div>
          <input
            inputMode="numeric"
            className="w-full border rounded-xl px-3 py-3 text-lg"
            placeholder="napr. 5"
            value={moveQty}
            onChange={(e) => setMoveQty(e.target.value.replace(/[^\d]/g, ''))}
            disabled={moveSaving}
          />
          <div className="text-xs opacity-60 mt-1">
            Tip: ak zadáš celé množstvo, šarža sa len “presunie”. Ak zadáš menej, šarža sa rozdelí.
          </div>
        </div>

        {moveErr && <div className="text-sm border rounded-xl p-2 mt-3 bg-white">{moveErr}</div>}

        <button
          className="w-full border rounded-xl py-3 text-lg font-semibold mt-3"
          onClick={saveMove}
          disabled={moveSaving}
        >
          {moveSaving ? 'Presúvam…' : 'Presunúť'}
        </button>
      </div>
    </div>
  )
}