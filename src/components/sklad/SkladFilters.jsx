export default function SkladFilters({
  letters,
  letter,
  setLetter,
  q,
  setQ,
  skladFilter,
  setSkladFilter,
  skladyOptions,
  onlyCritical,
  setOnlyCritical,
  showExpired,
  setShowExpired,
  topSummary,
}) {
  return (
    <div className="border rounded-2xl bg-white shadow-sm p-3 mb-3">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {letters.map(l => (
            <button
              key={l}
              className={`px-2 py-1 rounded-lg text-sm font-semibold border ${
                letter === l ? 'bg-black text-white' : 'bg-white'
              }`}
              onClick={() => setLetter(l)}
            >
              {l}
            </button>
          ))}
          <button
            className="px-2 py-1 rounded-lg text-sm border bg-white"
            onClick={() => setLetter('')}
            title="Zrušiť písmeno"
          >
            ✕
          </button>
        </div>

        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="🔍 Vyhľadať produkt…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="flex gap-2">
          <select
            className="flex-1 border rounded-xl px-3 py-2"
            value={skladFilter}
            onChange={(e) => setSkladFilter(e.target.value)}
          >
            <option value="">Všetky sklady</option>
            {skladyOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button
            className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
              onlyCritical ? 'bg-orange-50' : 'bg-white'
            }`}
            onClick={() => setOnlyCritical(v => !v)}
          >
            Kritické
          </button>

          <button
            className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
              showExpired ? 'bg-white' : 'bg-gray-50'
            }`}
            onClick={() => setShowExpired(v => !v)}
          >
            EXP
          </button>
        </div>

        <div className="text-xs opacity-70">
          Produkty: <b>{topSummary.totalProducts}</b> · Spolu ks: <b>{topSummary.totalQty}</b> · Kritické: <b>{topSummary.criticalCount}</b>
        </div>
      </div>
    </div>
  )
}