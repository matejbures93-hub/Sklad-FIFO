import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatExp, fmtEur, expStatus } from '../utils/skladUtils'

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

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
      .gt('mnozstvo', 0)
      .order('expiracia', { ascending: true })

    if (error) setMsg(error.message)
    else setRows(data ?? [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const stats = useMemo(() => {
    const productIds = new Set()
    let totalQty = 0
    let totalValue = 0
    let expired = 0
    let within30 = 0
    let within60 = 0

    for (const r of rows) {
      const qty = Number(r.mnozstvo) || 0
      const buy = Number(r.nakupna_cena)
      const st = expStatus(r.expiracia)

      if (r.produkty?.id) productIds.add(r.produkty.id)
      totalQty += qty

      if (Number.isFinite(buy)) totalValue += buy * qty

      if (st.label === 'EXPIROVANÉ') expired += 1
      if (st.label === 'Do 2 mesiacov') {
        const today = new Date()
        const exp = new Date(r.expiracia)
        const diff = Math.floor((exp - today) / (1000 * 60 * 60 * 24))

        if (diff <= 30) within30 += 1
        else within60 += 1
      }
    }

    return {
      totalProducts: productIds.size,
      totalQty,
      totalValue: Math.round(totalValue * 100) / 100,
      expired,
      within30,
      within60,
      critical: expired + within30 + within60,
    }
  }, [rows])

  const criticalRows = useMemo(() => {
    return rows
      .filter(r => {
        const st = expStatus(r.expiracia)
        return st.label === 'EXPIROVANÉ' || st.label === 'Do 2 mesiacov'
      })
      .slice(0, 10)
  }, [rows])

  const lowStock = useMemo(() => {
    const map = new Map()

    for (const r of rows) {
      const pid = r.produkty?.id
      const name = r.produkty?.nazov ?? '—'
      const qty = Number(r.mnozstvo) || 0

      if (!pid) continue
      if (!map.has(pid)) map.set(pid, { name, qty: 0 })
      map.get(pid).qty += qty
    }

    return Array.from(map.values())
      .filter(x => x.qty <= 3)
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 10)
  }, [rows])

  const topValue = useMemo(() => {
    const map = new Map()

    for (const r of rows) {
      const pid = r.produkty?.id
      const name = r.produkty?.nazov ?? '—'
      const qty = Number(r.mnozstvo) || 0
      const buy = Number(r.nakupna_cena)

      if (!pid || !Number.isFinite(buy)) continue
      if (!map.has(pid)) map.set(pid, { name, value: 0, qty: 0 })

      const g = map.get(pid)
      g.qty += qty
      g.value += buy * qty
    }

    return Array.from(map.values())
      .map(x => ({ ...x, value: Math.round(x.value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [rows])

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="text-sm underline" onClick={load}>Obnoviť</button>
      </div>

      {msg && <div className="text-sm border rounded-xl p-3 mb-3 bg-white">{msg}</div>}
      {loading && <div className="text-sm opacity-70 mb-2">Načítavam…</div>}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="border rounded-2xl bg-white shadow-sm p-4">
          <div className="text-xs opacity-60">💰 Hodnota skladu</div>
          <div className="text-xl font-bold mt-1">{fmtEur(stats.totalValue)}</div>
        </div>

        <div className="border rounded-2xl bg-white shadow-sm p-4">
          <div className="text-xs opacity-60">📦 Kusov spolu</div>
          <div className="text-xl font-bold mt-1">{stats.totalQty} ks</div>
        </div>

        <div className="border rounded-2xl bg-white shadow-sm p-4">
          <div className="text-xs opacity-60">🧴 Produktov</div>
          <div className="text-xl font-bold mt-1">{stats.totalProducts}</div>
        </div>

        <div className="border rounded-2xl bg-white shadow-sm p-4">
          <div className="text-xs opacity-60">⚠️ Kritické</div>
          <div className="text-xl font-bold mt-1">{stats.critical}</div>
        </div>
      </div>

      <div className="border rounded-2xl bg-white shadow-sm p-4 mb-3">
        <div className="text-base font-bold mb-2">EXP prehľad</div>
        <div className="text-sm">🔴 Expirované: <b>{stats.expired}</b></div>
        <div className="text-sm mt-1">🟠 Do 30 dní: <b>{stats.within30}</b></div>
        <div className="text-sm mt-1">🟡 Do 60 dní: <b>{stats.within60}</b></div>
      </div>

      <div className="border rounded-2xl bg-white shadow-sm p-4 mb-3">
        <div className="text-base font-bold mb-2">Kritické položky</div>

        {criticalRows.length === 0 ? (
          <div className="text-sm opacity-70">Žiadne kritické položky ✅</div>
        ) : (
          <div className="space-y-2">
            {criticalRows.map(r => {
              const st = expStatus(r.expiracia)
              return (
                <div key={r.id} className="border rounded-xl p-3">
                  <div className="font-semibold">{r.produkty?.nazov ?? '—'}</div>
                  <div className="text-sm opacity-70">
                    {r.sklady?.nazov ?? '—'} · EXP {formatExp(r.expiracia)}
                  </div>
                  <div className="text-sm mt-1">
                    {Number(r.mnozstvo) || 0} ks · {st.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border rounded-2xl bg-white shadow-sm p-4 mb-3">
        <div className="text-base font-bold mb-2">Nízky stav</div>

        {lowStock.length === 0 ? (
          <div className="text-sm opacity-70">Žiadny nízky stav ✅</div>
        ) : (
          <div className="space-y-2">
            {lowStock.map(x => (
              <div key={x.name} className="flex justify-between border rounded-xl p-3">
                <div className="font-semibold">{x.name}</div>
                <div>{x.qty} ks</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-2xl bg-white shadow-sm p-4">
        <div className="text-base font-bold mb-2">Top hodnota skladu</div>

        {topValue.length === 0 ? (
          <div className="text-sm opacity-70">Žiadne dáta.</div>
        ) : (
          <div className="space-y-2">
            {topValue.map(x => (
              <div key={x.name} className="border rounded-xl p-3">
                <div className="font-semibold">{x.name}</div>
                <div className="text-sm opacity-70">{x.qty} ks</div>
                <div className="text-sm font-semibold mt-1">{fmtEur(x.value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}