import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatExp, fmtEur, expStatus } from '../utils/skladUtils'
import StatCard from '../components/dashboard/StatCard'
import ExpOverview from '../components/dashboard/ExpOverview'
import CriticalItems from '../components/dashboard/CriticalItems'
import LowStock from '../components/dashboard/LowStock'
import TopValue from '../components/dashboard/TopValue'
import WarehouseValue from '../components/dashboard/WarehouseValue'


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

  const warehouseValue = useMemo(() => {
  const map = new Map()

  for (const r of rows) {
    const sid = r.sklady?.id ?? 'x'
    const name = r.sklady?.nazov ?? '—'
    const qty = Number(r.mnozstvo) || 0
    const buy = Number(r.nakupna_cena)

    if (!map.has(sid)) map.set(sid, { name, value: 0, qty: 0 })

    const g = map.get(sid)
    g.qty += qty
    if (Number.isFinite(buy)) g.value += buy * qty
  }

  return Array.from(map.values())
    .map(x => ({ ...x, value: Math.round(x.value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
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
        <StatCard label="💰 Hodnota skladu" value={fmtEur(stats.totalValue)} />
        <StatCard label="📦 Kusov spolu" value={`${stats.totalQty} ks`} />
        <StatCard label="🧴 Produktov" value={stats.totalProducts} />
        <StatCard label="⚠️ Kritické" value={stats.critical} />
      </div>

      <ExpOverview
        expired={stats.expired}
        within30={stats.within30}
        within60={stats.within60}
      />

      <CriticalItems items={criticalRows} />

      <LowStock items={lowStock} />

      <WarehouseValue items={warehouseValue} />

      <TopValue items={topValue} />
      
    </div>
  )
}