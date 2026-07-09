import { supabase } from './supabase'

export async function getReservations() {
  const { data, error } = await supabase
    .from('rezervacie_zasob')
    .select('id, draft_id, zasoba_id, mnozstvo')

  if (error) throw error
  return data ?? []
}

export async function getReservationSummaryByDraftIds(draftIds) {
  if (!draftIds?.length) return new Map()

  const { data, error } = await supabase
    .from('rezervacie_zasob')
    .select('draft_id, mnozstvo')
    .in('draft_id', draftIds)

  if (error) throw error

  const reservedQty = new Map()
  for (const r of data ?? []) {
    reservedQty.set(r.draft_id, (reservedQty.get(r.draft_id) ?? 0) + (Number(r.mnozstvo) || 0))
  }

  return reservedQty
}

export async function deleteReservationsForDraft(draftId) {
  if (!draftId) return

  const { error } = await supabase
    .from('rezervacie_zasob')
    .delete()
    .eq('draft_id', draftId)

  if (error) throw error
}

export async function replaceReservationsForDraft({ draftId, cart, user }) {
  if (!draftId) throw new Error('Chýba ID rozpracovanej predajky pre rezervácie.')

  await deleteReservationsForDraft(draftId)

  const rows = (cart ?? [])
    .filter(item => item.zasoba_id)
    .map(item => ({
      draft_id: draftId,
      zasoba_id: item.zasoba_id,
      produkt_id: item.produkt_id,
      sklad_id: item.sklad_id,
      mnozstvo: item.qty,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
    }))

  if (rows.length === 0) return

  const { error } = await supabase
    .from('rezervacie_zasob')
    .insert(rows)

  if (error) throw error
}
