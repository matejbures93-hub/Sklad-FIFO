import { formatExp, fmtEur, expStatus } from '../../utils/skladUtils'

export default function ProductCard({
  g,
  isOpen,
  setOpenKey,
  openEdit,
  openMove,
  openInv,
}) {
  const st = isOpen
    ? (g.hasExpired
        ? { dot: 'bg-red-500', label: 'EXPIROVANÉ' }
        : g.hasCritical
          ? { dot: 'bg-orange-500', label: 'Do 2 mesiacov' }
          : { dot: 'bg-green-500', label: 'OK' })
    : null

  return (
    <div className="border rounded-2xl p-4 bg-white">
      <button className="w-full text-left" onClick={() => setOpenKey(isOpen ? '' : g.key)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate">{g.produkt_nazov}</div>
            <div className="text-sm opacity-70 mt-1">
              Spolu: <b>{g.totalQty} ks</b> · Najbližší EXP:{' '}
              <b>{g.nearestExp ? formatExp(g.nearestExp) : '—'}</b>
            </div>
            <div className="text-sm opacity-70 mt-1">
              Cena spolu: <b>{g.valueKnown ? fmtEur(g.totalValue) : '—'}</b>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end">
            {st ? (
              <div className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${st.dot}`} />
                <div className="text-xs font-semibold">{st.label}</div>
              </div>
            ) : (
              <div className="h-[14px]" />
            )}
            <div className="text-xs opacity-60 mt-2">{isOpen ? 'Skryť' : 'Detail'}</div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {g.bySkladArr.map(sg => (
            <div key={`${sg.sklad_id}:${sg.sklad_nazov}`} className="border rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{sg.sklad_nazov}</div>
                <div className="text-sm">
                  <b>{sg.totalQty} ks</b> · EXP{' '}
                  <b>{sg.nearestExp ? formatExp(sg.nearestExp) : '—'}</b>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                {sg.rows.map(r => {
                  const st2 = expStatus(r.expiracia)
                  const qty = Number(r.mnozstvo) || 0
                  const buy = Number(r.nakupna_cena)
                  const total = Number.isFinite(buy) ? Math.round(buy * qty * 100) / 100 : null

                  return (
                    <div key={r.id} className="border rounded-xl p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${st2.dot}`} />
                            <div className="text-sm font-semibold">
                              EXP {formatExp(r.expiracia) || '—'}
                            </div>
                          </div>
                          <div className="text-xs opacity-70 mt-1">{st2.label}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold">{qty} ks</div>
                          <div className="flex flex-wrap items-center justify-end gap-3 mt-1">
                            <button
                              className="text-xs underline"
                              onClick={() => openEdit(r)}
                              title="Upraviť nákupnú cenu"
                            >
                              ✏️ Cena
                            </button>
                            <button
                              className="text-xs underline"
                              onClick={() => openMove(r)}
                              title="Presunúť šaržu do iného skladu"
                            >
                              ↔ Presunúť
                            </button>
                            <button
                              className="text-xs underline"
                              onClick={() => openInv(r)}
                              title="Inventúra šarže"
                            >
                              🧮 Inventúra
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm opacity-80 mt-2">
                        Nákup: <b>{fmtEur(buy)}</b> / ks · Hodnota:{' '}
                        <b>{total !== null ? fmtEur(total) : '—'}</b>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}