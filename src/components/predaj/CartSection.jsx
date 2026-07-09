import { formatExp } from '../../utils/predajUtils'
import DraftSection from './DraftSection'

export default function CartSection({
  cart,
  cartTotal,
  currentDraftId,
  draftName,
  removeItem,
  dokonciPredajku,
  loading,
  drafts,
  draftOpen,
  setDraftOpen,
  draftLoading,
  setDraftName,
  zakaznici,
  loadDrafts,
  saveDraft,
  clearCurrentCart,
  loadDraft,
  deleteDraft,
}) {
  return (
    <div className="border rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">Predajka (košík)</div>
        <div className="text-base font-semibold">Spolu: {cartTotal.toFixed(2)} €</div>
      </div>

      {currentDraftId && (
        <div className="text-xs border rounded-xl p-2 mt-2 bg-white">
          💾 Načítaná rozpracovaná predajka: <b>{draftName || `#${currentDraftId}`}</b>
        </div>
      )}

      {cart.length === 0 ? (
        <div className="text-sm opacity-70 mt-2">Zatiaľ prázdne.</div>
      ) : (
        <div className="space-y-2 mt-2">
          {cart.map((i, idx) => (
            <div key={idx} className="border rounded-xl p-3">
              <div className="text-lg font-bold">{i.produkt_nazov}</div>
              <div className="text-sm opacity-80">
                {i.sklad_nazov} · EXP {i.expiracia ? formatExp(i.expiracia) : '—'}
              </div>
              <div className="text-base mt-1">
                {i.qty} ks × {Number(i.cena_ks).toFixed(2)} € = <span className="font-semibold">{Number(i.suma).toFixed(2)} €</span>
              </div>
              <button className="text-sm underline mt-2" onClick={() => removeItem(idx)}>Odstrániť</button>
            </div>
          ))}
        </div>
      )}

      <DraftSection
        drafts={drafts}
        draftOpen={draftOpen}
        setDraftOpen={setDraftOpen}
        draftLoading={draftLoading}
        draftName={draftName}
        setDraftName={setDraftName}
        cart={cart}
        zakaznici={zakaznici}
        loadDrafts={loadDrafts}
        saveDraft={saveDraft}
        clearCurrentCart={clearCurrentCart}
        loadDraft={loadDraft}
        deleteDraft={deleteDraft}
      />

      <button
        className="w-full border rounded-xl py-3 text-lg font-semibold mt-3"
        onClick={dokonciPredajku}
        disabled={loading}
      >
        {loading ? 'Ukladám…' : 'Dokončiť predaj'}
      </button>
    </div>
  )
}
