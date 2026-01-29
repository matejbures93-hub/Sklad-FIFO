import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

function fmt(dt) {
  const d = new Date(dt)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmtEur(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return `${n.toFixed(2)} €`
}

export default function Historia() {
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(200)

  const [rows, setRows] = useState([]) // predajky
  const [itemsById, setItemsById] = useState({}) // predajkaId -> items[]
  const [openIds, setOpenIds] = useState({}) // predajkaId -> bool

  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingItemsId, setLoadingItemsId] = useState(null)

  const load = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { data, error } = await supabase
        .from('predajky')
        .select('id, created_at, komu, suma, user_email')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      setRows(data ?? [])
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní histórie')
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async (predajkaId) => {
    setMsg('')
    setLoadingItemsId(predajkaId)
    try {
      const { data, error } = await supabase
        .from('predajky_polozky')
        .select(`
          id,
          predajka_id,
          produkt_id,
          sklad_id,
          mnozstvo,
          cena_ks,
          suma,
          produkty(nazov),
          sklady(nazov)
        `)
        .eq('predajka_id', predajkaId)
        .order('id', { ascending: true })

      if (error) throw error

      setItemsById(prev => ({ ...prev, [predajkaId]: data ?? [] }))
      setOpenIds(prev => ({ ...prev, [predajkaId]: true }))
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní položiek')
    } finally {
      setLoadingItemsId(null)
    }
  }

  useEffect(() => { load() }, [limit])

  // pre fulltext filter potrebujeme vedieť aj názvy produktov v predajke.
  // použijeme už načítané položky (ak nie sú, filter bude fungovať aspoň na komu/email).
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows

    return rows.filter(r => {
      const komu = (r.komu ?? '').toLowerCase()
      const email = (r.user_email ?? '').toLowerCase()
      if (komu.includes(s) || email.includes(s)) return true

      const items = itemsById[r.id] ?? []
      const anyProduct = items.some(it => (it.produkty?.nazov ?? '').toLowerCase().includes(s))
      return anyProduct
    })
  }, [rows, q, itemsById])

  const totalSuma = useMemo(
    () => Math.round(filtered.reduce((sum, r) => sum + (Number(r.suma) || 0), 0) * 100) / 100,
    [filtered]
  )

  const toggle = (id) => {
    const isOpen = !!openIds[id]
    if (isOpen) {
      setOpenIds(prev => ({ ...prev, [id]: false }))
      return
    }
    // ak položky ešte nemáme, načítaj
    if (!itemsById[id]) loadItems(id)
    else setOpenIds(prev => ({ ...prev, [id]: true }))
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">História (Predajky)</h1>
        <button className="text-sm underline" onClick={load}>Obnoviť</button>
      </div>

      {msg && <div className="text-base border rounded-xl p-3 mb-3">{msg}</div>}

      <div className="space-y-3">
        <input
          className="w-full border rounded-xl px-3 py-3 text-lg"
          placeholder="Hľadať (komu / email / produkt)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="border rounded-xl p-3">
          <div className="text-base">
            Zobrazené: <span className="font-semibold">{filtered.length}</span> predajok
          </div>
          <div className="text-base opacity-80 mt-1">
            Spolu: <span className="font-semibold">{fmtEur(totalSuma)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="border rounded-xl px-3 py-2" onClick={() => setLimit(200)}>200</button>
          <button className="border rounded-xl px-3 py-2" onClick={() => setLimit(500)}>500</button>
          <button className="border rounded-xl px-3 py-2" onClick={() => setLimit(1000)}>1000</button>
        </div>

        {loading ? (
          <div className="text-sm opacity-70">Načítavam…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm opacity-70">Zatiaľ žiadne predajky.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const isOpen = !!openIds[r.id]
              const items = itemsById[r.id] ?? []
              const itemsLoading = loadingItemsId === r.id

              return (
                <div key={r.id} className="border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">{r.komu}</div>
                      <div className="text-sm opacity-70 mt-1">
                        {fmt(r.created_at)}{r.user_email ? ` · ${r.user_email}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{fmtEur(r.suma)}</div>
                      <div className="text-xs opacity-60">Spolu</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <button
                      className="text-sm underline"
                      onClick={() => toggle(r.id)}
                      disabled={itemsLoading}
                    >
                      {itemsLoading ? 'Načítavam…' : (isOpen ? 'Skryť položky' : 'Zobraziť položky')}
                    </button>

                    {!itemsById[r.id] && !itemsLoading && (
                      <div className="text-xs opacity-60">
                        Tip: klikni a uvidíš produkty.
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 space-y-2">
                      {items.length === 0 ? (
                        <div className="text-sm opacity-70">Žiadne položky.</div>
                      ) : (
                        items.map(it => (
                          <div key={it.id} className="border rounded-xl p-3">
                            <div className="text-base font-semibold">{it.produkty?.nazov ?? '—'}</div>
                            <div className="text-sm opacity-70">{it.sklady?.nazov ?? '—'}</div>
                            <div className="text-base mt-1">
                              {it.mnozstvo} ks × {fmtEur(it.cena_ks)} = <span className="font-semibold">{fmtEur(it.suma)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
