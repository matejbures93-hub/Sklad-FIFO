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

export default function Zakaznici() {
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [q, setQ] = useState('')

  // formulár nový zákazník
  const [nazov, setNazov] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [poznamka, setPoznamka] = useState('')

  // detail
  const [selected, setSelected] = useState(null)
  const [detailSales, setDetailSales] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { data, error } = await supabase
        .from('zakaznici')
        .select('id, created_at, nazov, telefon, email, poznamka')
        .order('nazov', { ascending: true })

      if (error) throw error
      setRows(data ?? [])
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní zákazníkov')
    } finally {
      setLoading(false)
    }
  }

  const loadDetailSales = async (zakaznikId) => {
    setDetailLoading(true)
    setMsg('')
    try {
      const { data, error } = await supabase
        .from('predajky')
        .select('id, created_at, komu, suma, user_email')
        .eq('zakaznik_id', zakaznikId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setDetailSales(data ?? [])
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní predajok zákazníka')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r => {
      const a = (r.nazov ?? '').toLowerCase()
      const t = (r.telefon ?? '').toLowerCase()
      const e = (r.email ?? '').toLowerCase()
      const p = (r.poznamka ?? '').toLowerCase()
      return a.includes(s) || t.includes(s) || e.includes(s) || p.includes(s)
    })
  }, [rows, q])

  const totalsForSelected = useMemo(() => {
    const ks = detailSales.length
    const suma = Math.round(detailSales.reduce((sum, r) => sum + (Number(r.suma) || 0), 0) * 100) / 100
    return { ks, suma }
  }, [detailSales])

  const createCustomer = async () => {
    setMsg('')
    if (!nazov.trim()) return setMsg('Zadaj názov zákazníka')

    try {
      const { data, error } = await supabase
        .from('zakaznici')
        .insert({
          nazov: nazov.trim(),
          telefon: telefon.trim() || null,
          email: email.trim() || null,
          poznamka: poznamka.trim() || null,
        })
        .select('id, created_at, nazov, telefon, email, poznamka')
        .single()

      if (error) throw error

      setNazov('')
      setTelefon('')
      setEmail('')
      setPoznamka('')
      setRows(prev => {
        const next = [data, ...prev]
        next.sort((a, b) => (a.nazov ?? '').localeCompare(b.nazov ?? ''))
        return next
      })
      setMsg('Zákazník pridaný ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní zákazníka')
    }
  }

  const openDetail = async (row) => {
    setSelected(row)
    await loadDetailSales(row.id)
  }

  const saveDetail = async () => {
    if (!selected) return
    setMsg('')
    try {
      const { error } = await supabase
        .from('zakaznici')
        .update({
          nazov: selected.nazov?.trim() ?? '',
          telefon: selected.telefon?.trim() || null,
          email: selected.email?.trim() || null,
          poznamka: selected.poznamka?.trim() || null,
        })
        .eq('id', selected.id)

      if (error) throw error

      setRows(prev => {
        const next = prev.map(r => (r.id === selected.id ? selected : r))
        next.sort((a, b) => (a.nazov ?? '').localeCompare(b.nazov ?? ''))
        return next
      })
      setMsg('Uložené ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní zmien')
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Zákazníci</h1>
        <button className="text-sm underline" onClick={load}>Obnoviť</button>
      </div>

      {msg && <div className="text-base border rounded-xl p-3 mb-3">{msg}</div>}

      {/* Vyhľadávanie */}
      <input
        className="w-full border rounded-xl px-3 py-3 text-lg mb-3"
        placeholder="Hľadať (meno / tel / email / poznámka)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* Nový zákazník */}
      <div className="border rounded-xl p-3 mb-3">
        <div className="text-base font-semibold mb-2">Pridať zákazníka</div>

        <div className="space-y-2">
          <input
            className="w-full border rounded-xl px-3 py-3 text-lg"
            placeholder="Názov / Meno*"
            value={nazov}
            onChange={(e) => setNazov(e.target.value)}
          />
          <input
            className="w-full border rounded-xl px-3 py-3 text-lg"
            placeholder="Telefón (voliteľné)"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
          />
          <input
            className="w-full border rounded-xl px-3 py-3 text-lg"
            placeholder="Email (voliteľné)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <textarea
            className="w-full border rounded-xl px-3 py-3 text-base"
            placeholder="Poznámka (voliteľné)"
            rows={3}
            value={poznamka}
            onChange={(e) => setPoznamka(e.target.value)}
          />
          <button className="w-full border rounded-xl py-3 text-lg font-semibold" onClick={createCustomer}>
            Uložiť zákazníka
          </button>
        </div>
      </div>

      {/* Zoznam zákazníkov */}
      <div className="border rounded-xl p-3">
        <div className="text-base font-semibold">
          Zoznam ({filtered.length})
        </div>

        {loading ? (
          <div className="text-sm opacity-70 mt-2">Načítavam…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm opacity-70 mt-2">Zatiaľ žiadni zákazníci.</div>
        ) : (
          <div className="space-y-2 mt-2">
            {filtered.map(r => (
              <button
                key={r.id}
                className="w-full text-left border rounded-xl p-3"
                onClick={() => openDetail(r)}
              >
                <div className="text-lg font-bold">{r.nazov}</div>
                <div className="text-sm opacity-70">
                  {r.telefon ? `📞 ${r.telefon} ` : ''}{r.email ? `✉️ ${r.email}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail zákazníka */}
      {selected && (
        <div className="border rounded-xl p-3 mt-3">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold">Detail</div>
            <button className="text-sm underline" onClick={() => setSelected(null)}>Zavrieť</button>
          </div>

          <div className="space-y-2 mt-2">
            <input
              className="w-full border rounded-xl px-3 py-3 text-lg"
              value={selected.nazov ?? ''}
              onChange={(e) => setSelected(prev => ({ ...prev, nazov: e.target.value }))}
            />
            <input
              className="w-full border rounded-xl px-3 py-3 text-lg"
              placeholder="Telefón"
              value={selected.telefon ?? ''}
              onChange={(e) => setSelected(prev => ({ ...prev, telefon: e.target.value }))}
            />
            <input
              className="w-full border rounded-xl px-3 py-3 text-lg"
              placeholder="Email"
              value={selected.email ?? ''}
              onChange={(e) => setSelected(prev => ({ ...prev, email: e.target.value }))}
            />
            <textarea
              className="w-full border rounded-xl px-3 py-3 text-base"
              rows={3}
              placeholder="Poznámka"
              value={selected.poznamka ?? ''}
              onChange={(e) => setSelected(prev => ({ ...prev, poznamka: e.target.value }))}
            />

            <button className="w-full border rounded-xl py-3 text-lg font-semibold" onClick={saveDetail}>
              Uložiť zmeny
            </button>
          </div>

          <div className="border-t mt-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">Predajky zákazníka</div>
              <button className="text-sm underline" onClick={() => loadDetailSales(selected.id)}>Obnoviť</button>
            </div>

            <div className="text-sm opacity-70 mt-1">
              Počet: <span className="font-semibold">{totalsForSelected.ks}</span> · Spolu: <span className="font-semibold">{fmtEur(totalsForSelected.suma)}</span>
            </div>

            {detailLoading ? (
              <div className="text-sm opacity-70 mt-2">Načítavam…</div>
            ) : detailSales.length === 0 ? (
              <div className="text-sm opacity-70 mt-2">Zatiaľ bez predajok.</div>
            ) : (
              <div className="space-y-2 mt-2">
                {detailSales.map(p => (
                  <div key={p.id} className="border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{p.komu}</div>
                        <div className="text-sm opacity-70">{fmt(p.created_at)}{p.user_email ? ` · ${p.user_email}` : ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold">{fmtEur(p.suma)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
