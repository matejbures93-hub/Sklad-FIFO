import { supabase } from '../../../services/supabase'
import { round2 } from '../../../utils/predajUtils'
import { deductExactBatch } from '../../../services/stockService'

export async function loadSpotrebaUsers() {
  const { data, error } = await supabase.from('zakaznici').select('id, nazov').in('nazov', ['Matej Bureš', 'Ingrid Valková']).order('nazov')
  if (error) throw error
  return data ?? []
}

export async function loadRecentSpotreby(limit = 20) {
  const { data, error } = await supabase.from('spotreby').select('id, created_at, komu_nazov, dovod, poznamka, spotreby_polozky(id, mnozstvo, suma_nakup)').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []).map(row => ({
    ...row,
    itemsCount: row.spotreby_polozky?.length ?? 0,
    totalQty: (row.spotreby_polozky ?? []).reduce((s, x) => s + (Number(x.mnozstvo) || 0), 0),
    totalBuy: round2((row.spotreby_polozky ?? []).reduce((s, x) => s + (Number(x.suma_nakup) || 0), 0)),
  }))
}

export async function finishSpotreba({ cart, komu, dovod, poznamka, currentDraftId }) {
  if (!komu?.id) throw new Error('Vyber, komu bolo vydané.')
  if (!cart?.length) throw new Error('Košík spotreby je prázdny.')
  const { data: sess, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) throw sessErr
  const user = sess?.session?.user
  const { data: head, error: headError } = await supabase.from('spotreby').insert({
    komu_zakaznik_id: komu.id, komu_nazov: komu.nazov,
    dovod: String(dovod ?? '').trim() || null,
    poznamka: String(poznamka ?? '').trim() || null,
    user_id: user?.id ?? null, user_email: user?.email ?? null,
  }).select('id').single()
  if (headError) throw headError
  const spotrebaId = head?.id
  if (!spotrebaId) throw new Error('Nepodarilo sa vytvoriť spotrebu.')
  for (const item of cart) {
    await deductExactBatch({ zasobaId: item.zasoba_id, qty: item.qty, canBuyExpired: true })
    const { error } = await supabase.from('spotreby_polozky').insert({
      spotreba_id: spotrebaId, produkt_id: item.produkt_id, zasoba_id: item.zasoba_id,
      sklad_id: item.sklad_id, produkt_nazov: item.produkt_nazov, sklad_nazov: item.sklad_nazov,
      mnozstvo: item.qty, expiracia: item.expiracia ?? null, nakupna_cena: item.nakupna_cena ?? null,
      suma_nakup: item.nakupna_cena == null ? null : round2(Number(item.nakupna_cena) * Number(item.qty)),
    })
    if (error) throw error
  }
  if (currentDraftId) {
    const { error } = await supabase.from('spotreby_drafty').delete().eq('id', currentDraftId)
    if (error) throw error
  }
  return spotrebaId
}

export async function loadSpotrebaDrafts() {
  const { data, error } = await supabase.from('spotreby_drafty').select('id, created_at, updated_at, nazov, komu_zakaznik_id, komu_nazov, dovod, poznamka').order('updated_at', { ascending: false }).limit(30)
  if (error) throw error
  const list = data ?? []
  if (!list.length) return []
  const { data: items, error: itemsError } = await supabase.from('spotreby_draft_polozky').select('draft_id').in('draft_id', list.map(x => x.id))
  if (itemsError) throw itemsError
  const counts = new Map()
  for (const item of items ?? []) counts.set(item.draft_id, (counts.get(item.draft_id) ?? 0) + 1)
  return list.map(d => ({ ...d, itemsCount: counts.get(d.id) ?? 0 }))
}

export async function saveSpotrebaDraft({ currentDraftId, nazov, komu, dovod, poznamka, cart }) {
  if (!komu?.id) throw new Error('Vyber, komu bolo vydané.')
  if (!cart?.length) throw new Error('Košík spotreby je prázdny.')
  const { data: sess, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) throw sessErr
  const user = sess?.session?.user
  let draftId = currentDraftId
  const payload = {
    nazov: String(nazov ?? '').trim() || 'Rozpracovaná spotreba',
    komu_zakaznik_id: komu.id, komu_nazov: komu.nazov,
    dovod: String(dovod ?? '').trim() || null,
    poznamka: String(poznamka ?? '').trim() || null,
    user_id: user?.id ?? null, user_email: user?.email ?? null,
    updated_at: new Date().toISOString(),
  }
  if (draftId) {
    const { error } = await supabase.from('spotreby_drafty').update(payload).eq('id', draftId)
    if (error) throw error
    const { error: delError } = await supabase.from('spotreby_draft_polozky').delete().eq('draft_id', draftId)
    if (delError) throw delError
  } else {
    const { updated_at, ...insertPayload } = payload
    const { data, error } = await supabase.from('spotreby_drafty').insert(insertPayload).select('id').single()
    if (error) throw error
    draftId = data?.id
  }
  const rows = cart.map(item => ({
    draft_id: draftId, produkt_id: item.produkt_id, zasoba_id: item.zasoba_id, sklad_id: item.sklad_id,
    produkt_nazov: item.produkt_nazov, sklad_nazov: item.sklad_nazov, mnozstvo: item.qty,
    expiracia: item.expiracia ?? null, nakupna_cena: item.nakupna_cena ?? null,
    suma_nakup: item.nakupna_cena == null ? null : round2(Number(item.nakupna_cena) * Number(item.qty)),
  }))
  const { error: itemError } = await supabase.from('spotreby_draft_polozky').insert(rows)
  if (itemError) throw itemError
  return draftId
}

export async function loadSpotrebaDraftItems(draftId) {
  const { data, error } = await supabase.from('spotreby_draft_polozky').select('*').eq('draft_id', draftId).order('id')
  if (error) throw error
  return (data ?? []).map(item => ({
    produkt_id: item.produkt_id, produkt_nazov: item.produkt_nazov ?? '—', zasoba_id: item.zasoba_id,
    sklad_id: item.sklad_id, sklad_nazov: item.sklad_nazov ?? '—', expiracia: item.expiracia ?? null,
    qty: Number(item.mnozstvo) || 0, nakupna_cena: item.nakupna_cena == null ? null : Number(item.nakupna_cena),
  }))
}

export async function deleteSpotrebaDraft(draftId) {
  const { error } = await supabase.from('spotreby_drafty').delete().eq('id', draftId)
  if (error) throw error
}
