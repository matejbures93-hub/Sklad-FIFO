import { fmtShort } from '../../utils/predajUtils'

export default function DraftSection({
  drafts,
  draftOpen,
  setDraftOpen,
  draftLoading,
  draftName,
  setDraftName,
  cart,
  zakaznici,
  loadDrafts,
  saveDraft,
  clearCurrentCart,
  loadDraft,
  deleteDraft,
}) {
  return (
    <div className="border rounded-xl p-3 mt-3 bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Rozpracované predajky</div>
        <button className="text-sm underline" onClick={() => { setDraftOpen(v => !v); loadDrafts() }}>
          {draftOpen ? 'Skryť' : `Zobraziť (${drafts.length})`}
        </button>
      </div>

      <input
        className="w-full border rounded-xl px-3 py-2 mt-2"
        placeholder="Názov draftu (voliteľné)"
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          className="border rounded-xl py-2 font-semibold"
          onClick={saveDraft}
          disabled={draftLoading || cart.length === 0}
        >
          {draftLoading ? 'Ukladám…' : '💾 Uložiť'}
        </button>
        <button
          className="border rounded-xl py-2 font-semibold"
          onClick={clearCurrentCart}
          disabled={draftLoading || cart.length === 0}
        >
          🗑️ Vymazať košík
        </button>
      </div>

      {draftOpen && (
        <div className="mt-3 space-y-2">
          {drafts.length === 0 ? (
            <div className="text-sm opacity-70">Žiadne rozpracované predajky.</div>
          ) : (
            drafts.map(d => {
              const customer = zakaznici.find(z => Number(z.id) === Number(d.zakaznik_id))
              return (
                <div key={d.id} className="border rounded-xl p-3">
                  <div className="font-semibold">{d.nazov || 'Bez názvu'}</div>
                  <div className="text-sm opacity-70 mt-1">
                    {customer?.nazov ?? '—'} · {d.itemsCount ?? 0} položiek · 📌 {Number(d.reservedQty) || 0} ks rezervované · {fmtShort(d.updated_at || d.created_at)}
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button className="text-sm underline" onClick={() => loadDraft(d)} disabled={draftLoading}>
                      Načítať
                    </button>
                    <button className="text-sm underline" onClick={() => deleteDraft(d.id)} disabled={draftLoading}>
                      Vymazať
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
