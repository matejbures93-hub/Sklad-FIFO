import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

function formatExp(exp) {
  if (!exp) return ''
  const [y, m] = exp.split('-')
  return `${m}/${y}`
}

function fmtEur(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(2)} €`
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return Math.floor((d - today) / (1000 * 60 * 60 * 24))
}

function expStatus(exp) {
  const d = daysUntil(exp)
  if (d === null) return { dot: 'bg-gray-400', label: '—' }
  if (d < 0) return { dot: 'bg-red-500', label: 'EXPIROVANÉ' }
  if (d <= 60) return { dot: 'bg-orange-500', label: 'Do 2 mesiacov' }
  return { dot: 'bg-green-500', label: 'OK' }
}

export default function Sklad() {
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // UI
  const [q, setQ] = useState('')
  const [skladFilter, setSkladFilter] = useState('') // nazov skladu
  const [onlyCritical, setOnlyCritical] = useState(false) // oranž+červ
  const [showExpired, setShowExpired] = useState(true) // zobrazovať expirované
  const [openKey, setOpenKey] = useState('') // produkt_key rozbalený

  const load = async () => {
    setLoading(true)
    setMsg('')
    const { data, error } = await supabase
      .from('zasoby')
      .select(`
        id,
        expiracia,
        mnozstvo,
        nakupna_cena,
        produkty ( id, nazov ),
        sklady ( id, nazov )
      `)
      .eq('aktivne', true)
      .order('expiracia', { ascending: true })
      .order('id', { ascending: true })

    if (error) setMsg(error.message)
    else setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const skladyOptions = useMemo(() => {
    const set = new Set()
    for (const r of rows) {
      const n = r.sklady?.nazov
      if (n) set.add(n)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'sk'))
  }, [rows])

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase()

    const filtered = rows.filter(r => {
      const nazov = (r.produkty?.nazov ?? '').toLowerCase()
      const skladN = r.sklady?.nazov ?? ''
      const st = expStatus(r.expiracia)

      if (query && !nazov.includes(query)) return false
      if (skladFilter && skladN !== skladFilter) return false
      if (!showExpired && st.label === 'EXPIROVANÉ') return false
      if (onlyCritical && !(st.label === 'EXPIROVANÉ' || st.label === 'Do 2 mesiacov')) return false

      return true
    })

    const map = new Map()

    for (const r of filtered) {
      const pid = r.produkty?.id ?? 'x'
      const pName = r.produkty?.nazov ?? '—'
      const key = `${pid}:${pName}`

      const qty = Number(r.mnozstvo) || 0
      const buy = Number(r.nakupna_cena)
      const value = Number.isFinite(buy) ? Math.round(buy * qty * 100) / 100 : null

      if (!map.has(key)) {
        map.set(key, {
          key,
          produkt_id: pid,
          produkt_nazov: pName,
          totalQty: 0,
          nearestExp: null,
          hasExpired: false,
          hasCritical: false,
          totalValue: 0,
          valueKnown: true,
          bySklad: new Map(),
        })
      }

      const g = map.get(key)
      g.totalQty += qty

      if (r.expiracia && (!g.nearestExp || r.expiracia < g.nearestExp)) g.nearestExp = r.expiracia

      const st = expStatus(r.expiracia)
      if (st.label === 'EXPIROVANÉ') g.hasExpired = true
      if (st.label === 'EXPIROVANÉ' || st.label === 'Do 2 mesiacov') g.hasCritical = true

      if (value === null) g.valueKnown = false
      else g.totalValue = Math.round((g.totalValue + value) * 100) / 100

      const sid = r.sklady?.id ?? 'x'
      const sName = r.sklady?.nazov ?? '—'
      const sKey = `${sid}:${sName}`

      if (!g.bySklad.has(sKey)) {
        g.bySklad.set(sKey, {
          sklad_id: sid,
          sklad_nazov: sName,
          totalQty: 0,
          nearestExp: null,
          rows: [],
        })
      }

      const sg = g.bySklad.get(sKey)
      sg.totalQty += qty
      if (r.expiracia && (!sg.nearestExp || r.expiracia < sg.nearestExp)) sg.nearestExp = r.expiracia
      sg.rows.push(r)
    }

    const arr = Array.from(map.values()).map(g => ({
      ...g,
      bySkladArr: Array.from(g.bySklad.values()).sort((a, b) =>
        (a.sklad_nazov ?? '').localeCompare(b.sklad_nazov ?? '', 'sk')
      ),
    }))

    // kritické prvé + najbližší EXP
    arr.sort((a, b) => {
      const ac = a.hasCritical ? 0 : 1
      const bc = b.hasCritical ? 0 : 1
      if (ac !== bc) return ac - bc
      const ae = a.nearestExp || '9999-12-31'
      const be = b.nearestExp || '9999-12-31'
      if (ae !== be) return ae < be ? -1 : 1
      return a.produkt_nazov.localeCompare(b.produkt_nazov, 'sk')
    })

    return arr
  }, [rows, q, skladFilter, onlyCritical, showExpired])

  const topSummary = useMemo(() => {
    const totalProducts = grouped.length
    const totalQty = grouped.reduce((s, g) => s + (Number(g.totalQty) || 0), 0)
    const criticalCount = grouped.filter(g => g.hasCritical).length
    return { totalProducts, totalQty, criticalCount }
  }, [grouped])

  // ✅ keď meníš filtre/hľadanie, zavri otvorený detail
  useEffect(() => {
    setOpenKey('')
  }, [q, skladFilter, onlyCritical, showExpired])

  return (
    <div className="max-w-md mx-auto p-4 pt-8 pb-4">
      {/* HORE: len nadpis + obnoviť */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Sklad</h1>
        <button className="text-sm underline" onClick={load}>Obnoviť</button>
      </div>

      {/* Spodný FIX panel (vždy dole na obrazovke) */}
      <div className="fixed left-0 right-0 bottom-0 z-50">
        <div className="max-w-md mx-auto px-4 pb-4">
          <div className="border rounded-2xl bg-white shadow-lg">
            {/* malý “úchyt” */}
            <div className="pt-2">
              <div className="mx-auto w-12 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="p-3">
              {msg && <div className="border rounded-xl p-3 mb-3 bg-white">{msg}</div>}
              {loading && <div className="text-sm opacity-70 mb-2">Načítavam…</div>}

              {/* Ovládanie */}
              <div className="space-y-2 mb-3">
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
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold ${onlyCritical ? 'bg-orange-50' : 'bg-white'}`}
                    onClick={() => setOnlyCritical(v => !v)}
                    title="Zobrazí len oranžové + červené"
                  >
                    Kritické
                  </button>

                  <button
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold ${showExpired ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => setShowExpired(v => !v)}
                    title="Zapnúť/vypnúť expirované"
                  >
                    EXP
                  </button>
                </div>

                <div className="text-xs opacity-70">
                  Produkty: <b>{topSummary.totalProducts}</b> · Spolu ks: <b>{topSummary.totalQty}</b> · Kritické: <b>{topSummary.criticalCount}</b>
                </div>
              </div>

              {/* Zoznam – scroll v rámci panelu */}
              <div className="max-h-[55vh] overflow-y-auto pr-1">
                {grouped.length === 0 && !loading ? (
                  <div className="text-sm opacity-70">Nič sa nenašlo.</div>
                ) : (
                  <div className="space-y-3">
                    {grouped.map(g => {
                      const st = g.hasExpired
                        ? { dot: 'bg-red-500', label: 'EXPIROVANÉ' }
                        : g.hasCritical
                          ? { dot: 'bg-orange-500', label: 'Do 2 mesiacov' }
                          : { dot: 'bg-green-500', label: 'OK' }

                      const isOpen = openKey === g.key

                      return (
                        <div key={g.key} className="border rounded-2xl p-4 bg-white">
                          <button className="w-full text-left" onClick={() => setOpenKey(isOpen ? '' : g.key)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-lg font-bold truncate">{g.produkt_nazov}</div>
                                <div className="text-sm opacity-70 mt-1">
                                  Spolu: <b>{g.totalQty} ks</b> · Najbližší EXP: <b>{g.nearestExp ? formatExp(g.nearestExp) : '—'}</b>
                                </div>
                                <div className="text-sm opacity-70 mt-1">
                                  Hodnota: <b>{g.valueKnown ? fmtEur(g.totalValue) : '—'}</b>
                                </div>
                              </div>

                              <div className="shrink-0 flex flex-col items-end">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block w-3 h-3 rounded-full ${st.dot}`} />
                                  <div className="text-xs font-semibold">{st.label}</div>
                                </div>
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
                                      <b>{sg.totalQty} ks</b> · EXP <b>{sg.nearestExp ? formatExp(sg.nearestExp) : '—'}</b>
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
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${st2.dot}`} />
                                              <div className="text-sm font-semibold">
                                                EXP {formatExp(r.expiracia) || '—'}
                                              </div>
                                            </div>
                                            <div className="text-sm font-semibold">{qty} ks</div>
                                          </div>

                                          <div className="text-xs opacity-70 mt-1">{st2.label}</div>

                                          <div className="text-sm opacity-80 mt-2">
                                            Nákup: <b>{fmtEur(buy)}</b> / ks · Hodnota: <b>{total !== null ? fmtEur(total) : '—'}</b>
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
                    })}
                  </div>
                )}
              </div>

              <div className="h-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}