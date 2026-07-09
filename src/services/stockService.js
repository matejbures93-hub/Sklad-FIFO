import { supabase } from './supabase'
import { formatExp, isExpired } from '../utils/predajUtils'

export async function getStockForProduct(produktId) {
  const pid = Number(produktId)
  if (!pid) return []

  const { data, error } = await supabase
    .from('zasoby')
    .select('id, sklad_id, expiracia, mnozstvo, nakupna_cena, aktivne, sklady(nazov), produkty(nazov)')
    .eq('produkt_id', pid)
    .eq('aktivne', true)
    .gt('mnozstvo', 0)
    .order('expiracia', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function getReservedByZasoba(reservations, currentDraftId) {
  const map = new Map()
  const activeDraftId = currentDraftId ? Number(currentDraftId) : null

  for (const r of reservations ?? []) {
    // Vlastná načítaná rozpracovaná predajka si svoje rezervácie necháva dostupné.
    if (activeDraftId && Number(r.draft_id) === activeDraftId) continue

    const key = Number(r.zasoba_id)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + (Number(r.mnozstvo) || 0))
  }

  return map
}

export function getAvailableStockRows(stockRows, reservedByZasoba) {
  return (stockRows ?? [])
    .map(r => {
      const reserved = reservedByZasoba.get(Number(r.id)) ?? 0
      const originalQty = Number(r.mnozstvo) || 0
      const freeQty = Math.max(0, originalQty - reserved)

      return {
        ...r,
        povodne_mnozstvo: originalQty,
        rezervovane_mnozstvo: reserved,
        mnozstvo: freeQty,
      }
    })
    .filter(r => (Number(r.mnozstvo) || 0) > 0)
}

export function getBatchOptions(availableStockRows) {
  return [...(availableStockRows ?? [])].sort((a, b) => {
    const ax = isExpired(a.expiracia) ? 1 : 0
    const bx = isExpired(b.expiracia) ? 1 : 0
    if (ax !== bx) return ax - bx

    const ae = a.expiracia || '9999-12-31'
    const be = b.expiracia || '9999-12-31'
    if (ae !== be) return ae < be ? -1 : 1

    return Number(a.id) - Number(b.id)
  })
}

export function getSelectedBatch(availableStockRows, selectedBatchId) {
  const id = Number(selectedBatchId)
  if (!id) return null
  return (availableStockRows ?? []).find(r => Number(r.id) === id) ?? null
}

export function pickAutoBatch(batchOptions, qty) {
  const good = (batchOptions ?? []).filter(r => !isExpired(r.expiracia))

  // Preferuj jednu šaržu, ktorá má dosť kusov, aby zákazník nedostal mix EXP.
  const enoughOneBatch = good.find(r => (Number(r.mnozstvo) || 0) >= qty)
  if (enoughOneBatch) return enoughOneBatch

  // Ak jedna šarža nestačí, vyber najbližšiu neexpirovanú.
  return good[0] ?? null
}

export function getSkladSummary(availableStockRows) {
  const map = new Map()

  for (const r of availableStockRows ?? []) {
    const sid = r.sklad_id

    if (!map.has(sid)) {
      map.set(sid, {
        sklad_id: sid,
        sklad_nazov: r.sklady?.nazov ?? `Sklad ${sid}`,
        total: 0,
        nearestExp: null,
        nearestBuy: null,
        minBuy: null,
        maxBuy: null,
        produkt_nazov: r.produkty?.nazov ?? '',
      })
    }

    const g = map.get(sid)

    const qty = Number(r.mnozstvo) || 0
    g.total += qty

    const buy = Number(r.nakupna_cena)
    if (Number.isFinite(buy)) {
      if (g.minBuy === null || buy < g.minBuy) g.minBuy = buy
      if (g.maxBuy === null || buy > g.maxBuy) g.maxBuy = buy
    }

    // nearest exp + nearest buy iba z NEEXPIROVANÝCH šarží
    if (!isExpired(r.expiracia)) {
      if (!g.nearestExp || (r.expiracia && r.expiracia < g.nearestExp)) {
        g.nearestExp = r.expiracia
        g.nearestBuy = Number.isFinite(Number(r.nakupna_cena)) ? Number(r.nakupna_cena) : null
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.sklad_id - b.sklad_id)
}

export function getRecommendedSklad(skladSummary) {
  if (!skladSummary?.length) return null

  const valid = skladSummary.filter(g => g.nearestExp)
  if (valid.length === 0) return null

  let best = valid[0]
  for (const g of valid) {
    const a = g.nearestExp || '9999-12-31'
    const b = best.nearestExp || '9999-12-31'
    if (a < b) best = g
  }
  return best
}

export function getChosenSklad(skladSummary, overrideSkladId, recommended) {
  const sid = Number(overrideSkladId)
  if (sid) return (skladSummary ?? []).find(x => x.sklad_id === sid) ?? null
  return recommended
}

export async function fefoDeduct({ produktId, skladId, qty }) {
  const { data, error } = await supabase
    .from('zasoby')
    .select('id, expiracia, mnozstvo')
    .eq('produkt_id', produktId)
    .eq('sklad_id', skladId)
    .eq('aktivne', true)
    .gt('mnozstvo', 0)
    .order('expiracia', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  const list = (data ?? []).filter(r => !isExpired(r.expiracia))
  const available = list.reduce((sum, r) => sum + (Number(r.mnozstvo) || 0), 0)

  if (available < qty) {
    throw new Error(`Nedostatok neexpirovaných zásob (Sklad ${skladId}). Dostupné: ${available} ks, chceš: ${qty} ks.`)
  }

  let remaining = qty
  const taken = []

  for (const r of list) {
    if (remaining <= 0) break

    const have = Number(r.mnozstvo) || 0
    const take = Math.min(have, remaining)
    const newQty = have - take

    remaining -= take

    const upd = await supabase
      .from('zasoby')
      .update({ mnozstvo: newQty, aktivne: newQty > 0 })
      .eq('id', r.id)

    if (upd.error) throw upd.error

    taken.push({
      mnozstvo: take,
      expiracia: r.expiracia ?? null,
    })
  }

  return taken
}

export async function deductExactBatch({ zasobaId, qty, canBuyExpired }) {
  const { data, error } = await supabase
    .from('zasoby')
    .select('id, expiracia, mnozstvo')
    .eq('id', zasobaId)
    .eq('aktivne', true)
    .single()

  if (error) throw error

  if (isExpired(data?.expiracia) && !canBuyExpired) {
    throw new Error(`Zvolená šarža je expirovaná (EXP ${formatExp(data?.expiracia)}). Predaj EXP je povolený iba vybraným zákazníkom.`)
  }

  const have = Number(data?.mnozstvo) || 0
  if (have < qty) {
    throw new Error(`V zvolenej šarži je už len ${have} ks, chceš ${qty} ks.`)
  }

  const newQty = have - qty

  const upd = await supabase
    .from('zasoby')
    .update({ mnozstvo: newQty, aktivne: newQty > 0 })
    .eq('id', zasobaId)

  if (upd.error) throw upd.error

  return [{
    mnozstvo: qty,
    expiracia: data.expiracia ?? null,
  }]
}
