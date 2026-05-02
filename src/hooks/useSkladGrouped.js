import { useMemo } from 'react'
import { expStatus } from '../utils/skladUtils'

function useSkladGrouped({
  rows,
  q,
  letter,
  skladFilter,
  onlyCritical,
  showExpired,
}) {
  return useMemo(() => {
    const query = q.trim().toLowerCase()
    const pick = (letter || '').trim().toUpperCase()

    const filtered = rows.filter(r => {
      const nazovRaw = r.produkty?.nazov ?? ''
      const nazov = nazovRaw.toLowerCase()
      const nazovUpper = nazovRaw.toUpperCase()

      const skladN = r.sklady?.nazov ?? ''
      const st = expStatus(r.expiracia)

      if (pick && !nazovUpper.startsWith(pick)) return false
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

      if (r.expiracia && (!g.nearestExp || r.expiracia < g.nearestExp)) {
        g.nearestExp = r.expiracia
      }

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

      if (r.expiracia && (!sg.nearestExp || r.expiracia < sg.nearestExp)) {
        sg.nearestExp = r.expiracia
      }

      sg.rows.push(r)
    }

    const arr = Array.from(map.values()).map(g => ({
      ...g,
      bySkladArr: Array.from(g.bySklad.values()).sort((a, b) =>
        (a.sklad_nazov ?? '').localeCompare(b.sklad_nazov ?? '', 'sk')
      ),
    }))

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
  }, [rows, q, letter, skladFilter, onlyCritical, showExpired])
}

export default useSkladGrouped