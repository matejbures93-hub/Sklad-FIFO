import { formatExp, fmtEur, isExpired } from '../../utils/predajUtils'

export default function ProductSection({
  letters,
  letter,
  setLetter,
  qProd,
  setQProd,
  produktId,
  setProduktId,
  filteredProdukty,
  stockRows,
  overrideSkladId,
  setOverrideSkladId,
  selectedBatchId,
  setSelectedBatchId,
  skladSummary,
  batchOptions,
  selectedBatch,
  chosenSklad,
  cenaKs,
  setCenaKs,
  qtyInput,
  setQtyInput,
  addToCart,
}) {
  const resetProductSelection = () => {
    setProduktId('')
    setOverrideSkladId('')
    setSelectedBatchId('')
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-xl p-3">
        <div className="text-sm opacity-70 mb-2">Rýchly výber podľa písmena</div>
        <div className="flex flex-wrap gap-1">
          {letters.map(l => (
            <button
              key={l}
              className={`px-2 py-1 rounded-lg text-sm font-semibold border ${
                letter === l ? 'bg-black text-white' : 'bg-white'
              }`}
              onClick={() => {
                setLetter(l)
                resetProductSelection()
              }}
            >
              {l}
            </button>
          ))}
          <button
            className="px-2 py-1 rounded-lg text-sm border"
            onClick={() => {
              setLetter('')
              resetProductSelection()
            }}
            title="Zrušiť písmeno"
          >
            ✕
          </button>
        </div>

        <input
          className="w-full border rounded-xl px-3 py-2 mt-2"
          placeholder="(voliteľné) hľadať produkt…"
          value={qProd}
          onChange={(e) => setQProd(e.target.value)}
        />
      </div>

      <div>
        <div className="text-base font-semibold mb-1">Produkt</div>
        <select
          className="w-full border rounded-xl px-3 py-3 text-lg"
          value={produktId}
          onChange={(e) => {
            setProduktId(e.target.value)
            setOverrideSkladId('')
            setSelectedBatchId('')
          }}
        >
          <option value="">Vyber…</option>
          {filteredProdukty.map(p => <option key={p.id} value={p.id}>{p.nazov}</option>)}
        </select>
      </div>

      {produktId && stockRows.length > 0 && (
        <div className="border rounded-xl p-3">
          <div className="text-sm opacity-70">Sklad pre tento produkt</div>

          <div className="mt-2">
            <div className="text-sm font-semibold mb-1">
              Sklad vyberá systém automaticky podľa najbližšej neexpirovanej EXP
            </div>
            <div className="text-xs opacity-60 mb-1">
              Ručne zmeň iba vtedy, ak chceš predávať iba z konkrétneho skladu.
            </div>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={overrideSkladId}
              onChange={(e) => {
                setOverrideSkladId(e.target.value)
                setSelectedBatchId('')
              }}
            >
              <option value="">Automaticky: najbližší neexpirovaný EXP</option>
              {skladSummary.map(s => (
                <option key={s.sklad_id} value={s.sklad_id}>
                  {s.sklad_nazov} — {s.total} ks — najbližší EXP {s.nearestExp ? formatExp(s.nearestExp) : '—'}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <div className="text-sm font-semibold mb-1">Vybrať šaržu / EXP</div>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="">Automaticky: najbližšia neexpirovaná šarža</option>
              {batchOptions
                .filter(r => !overrideSkladId || Number(r.sklad_id) === Number(overrideSkladId))
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {isExpired(r.expiracia) ? 'EXPIROVANÉ – ' : ''}
                    {r.sklady?.nazov ?? `Sklad ${r.sklad_id}`} · EXP {r.expiracia ? formatExp(r.expiracia) : '—'} · {Number(r.mnozstvo) || 0} ks
                  </option>
                ))}
            </select>
          </div>

          {(selectedBatch || chosenSklad) && (
            <div className="mt-3">
              {selectedBatch ? (
                <>
                  <div className="text-base font-semibold">
                    {selectedBatch.sklady?.nazov ?? `Sklad ${selectedBatch.sklad_id}`} · EXP {formatExp(selectedBatch.expiracia)}
                  </div>

                  <div className="text-sm opacity-80 mt-1">
                    Dostupné v šarži: <span className="font-semibold">{Number(selectedBatch.mnozstvo) || 0}</span> ks
                  </div>

                  <div className="text-sm opacity-80 mt-1">
                    Nákupná cena (info): <span className="font-semibold">{fmtEur(selectedBatch.nakupna_cena)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-base font-semibold">{chosenSklad?.sklad_nazov ?? '—'}</div>

                  <div className="text-sm opacity-80 mt-1">
                    Dostupné: <span className="font-semibold">{chosenSklad?.total ?? 0}</span> ks · Najbližší použiteľný EXP:{' '}
                    <span className="font-semibold">{chosenSklad?.nearestExp ? formatExp(chosenSklad.nearestExp) : '—'}</span>
                  </div>

                  <div className="text-sm opacity-80 mt-1">
                    Nákupná cena (info):{' '}
                    <span className="font-semibold">
                      {chosenSklad?.minBuy === null || chosenSklad?.minBuy === undefined
                        ? '—'
                        : chosenSklad.minBuy === chosenSklad.maxBuy
                          ? fmtEur(chosenSklad.minBuy)
                          : `${fmtEur(chosenSklad.minBuy)} – ${fmtEur(chosenSklad.maxBuy)}`}
                    </span>
                    {chosenSklad?.nearestBuy !== null && chosenSklad?.nearestBuy !== undefined && (
                      <>
                        {' '}· Najbližšia šarža: <span className="font-semibold">{fmtEur(chosenSklad.nearestBuy)}</span> / ks
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="text-sm font-semibold mb-1">Cena (€/ks)</div>
        <input
          inputMode="decimal"
          className="w-full border rounded-xl px-3 py-3 text-lg"
          placeholder="napr. 3,90"
          value={cenaKs}
          onChange={(e) => setCenaKs(e.target.value)}
        />
      </div>

      <div className="border rounded-xl p-3">
        <div className="text-base font-semibold mb-2">Pridať do predajky</div>

        <div className="grid grid-cols-2 gap-2">
          <button className="border rounded-xl py-3 text-lg font-semibold" onClick={() => addToCart(1)}>+1</button>
          <button className="border rounded-xl py-3 text-lg font-semibold" onClick={() => addToCart(5)}>+5</button>
        </div>

        <div className="flex gap-2 mt-2">
          <input
            inputMode="numeric"
            className="flex-1 border rounded-xl px-3 py-3 text-lg"
            placeholder="vlastné (ks)"
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value.replace(/[^\d]/g, ''))}
          />
          <button className="border rounded-xl px-4 py-3 text-lg font-semibold" onClick={() => addToCart(qtyInput)}>
            Pridať
          </button>
        </div>

        <div className="text-xs opacity-60 mt-2">
          Tip: Predajka = košík. Pridaj viac produktov a potom klikni „Dokončiť predaj".
        </div>
      </div>
    </div>
  )
}
