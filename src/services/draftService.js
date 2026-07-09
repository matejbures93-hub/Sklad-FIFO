import { supabase } from './supabase'
import { getReservationSummaryByDraftIds, replaceReservationsForDraft } from './reservations.service'

export async function loadDraftList() {
  const { data, error } = await supabase
    .from('predajky_drafty')
    .select('id, created_at, updated_at, nazov, zakaznik_id, user_email')
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error) throw error

  const list = data ?? []
  const ids = list.map(x => x.id)

  if (ids.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('predajky_draft_polozky')
    .select('draft_id')
    .in('draft_id', ids)

  if (itemsError) throw itemsError

  const reservedQty = await getReservationSummaryByDraftIds(ids)

  const counts = new Map()
  for (const it of items ?? []) {
    counts.set(it.draft_id, (counts.get(it.draft_id) ?? 0) + 1)
  }

  return list.map(x => ({
    ...x,
    itemsCount: counts.get(x.id) ?? 0,
    reservedQty: reservedQty.get(x.id) ?? 0,
  }))
}

export async function saveDraftData({ currentDraftId, name, zakaznikId, cart, user }) {
  let draftId = currentDraftId

  if (draftId) {
    const { error: updateError } = await supabase
      .from('predajky_drafty')
      .update({
        nazov: name,
        zakaznik_id: zakaznikId,
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)

    if (updateError) throw updateError

    await deleteDraftItems(draftId)
  } else {
    const { data, error } = await supabase
      .from('predajky_drafty')
      .insert({
        nazov: name,
        zakaznik_id: zakaznikId,
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
      })
      .select('id')
      .single()

    if (error) throw error
    draftId = data?.id
    if (!draftId) throw new Error('Nepodarilo sa vytvoriť rozpracovanú predajku.')
  }

  await saveDraftItems({ draftId, cart })
  await replaceReservationsForDraft({ draftId, cart, user })

  return draftId
}

export async function deleteDraftItems(draftId) {
  const { error } = await supabase
    .from('predajky_draft_polozky')
    .delete()
    .eq('draft_id', draftId)

  if (error) throw error
}

export async function saveDraftItems({ draftId, cart }) {
  const rows = (cart ?? []).map(item => ({
    draft_id: draftId,
    produkt_id: item.produkt_id,
    produkt_nazov: item.produkt_nazov,
    zasoba_id: item.zasoba_id ?? null,
    sklad_id: item.sklad_id,
    sklad_nazov: item.sklad_nazov,
    mnozstvo: item.qty,
    cena_ks: item.cena_ks,
    suma: item.suma,
    expiracia: item.expiracia ?? null,
  }))

  if (rows.length === 0) return

  const { error } = await supabase
    .from('predajky_draft_polozky')
    .insert(rows)

  if (error) throw error
}

export async function loadDraftItems(draftId) {
  const { data, error } = await supabase
    .from('predajky_draft_polozky')
    .select('*')
    .eq('draft_id', draftId)
    .order('id', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function draftItemsToCart(items) {
  return (items ?? []).map(it => ({
    produkt_id: it.produkt_id,
    produkt_nazov: it.produkt_nazov ?? '—',
    zasoba_id: it.zasoba_id,
    sklad_id: it.sklad_id,
    sklad_nazov: it.sklad_nazov ?? '—',
    expiracia: it.expiracia ?? null,
    qty: Number(it.mnozstvo) || 0,
    cena_ks: Number(it.cena_ks) || 0,
    suma: Number(it.suma) || 0,
  }))
}

export async function deleteDraftById(draftId) {
  const { error } = await supabase
    .from('predajky_drafty')
    .delete()
    .eq('id', draftId)

  if (error) throw error
}
