import { supabase } from './supabase'

async function mergeSameBatch({ produktId, skladId, expiracia, nakupna_cena }) {
  let query = supabase
    .from('zasoby')
    .select('id, mnozstvo')
    .eq('produkt_id', produktId)
    .eq('sklad_id', skladId)
    .eq('aktivne', true)
    .gt('mnozstvo', 0)
    .order('id', { ascending: true })

  if (expiracia === null || expiracia === undefined) {
    query = query.is('expiracia', null)
  } else {
    query = query.eq('expiracia', expiracia)
  }

  if (nakupna_cena === null || nakupna_cena === undefined) {
    query = query.is('nakupna_cena', null)
  } else {
    query = query.eq('nakupna_cena', Number(nakupna_cena))
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data ?? []
  if (rows.length <= 1) return { merged: false }

  const keep = rows[0]
  const removeIds = rows.slice(1).map(r => r.id)
  const totalQty = rows.reduce((sum, r) => sum + (Number(r.mnozstvo) || 0), 0)

  const updKeep = await supabase
    .from('zasoby')
    .update({ mnozstvo: totalQty, aktivne: true })
    .eq('id', keep.id)

  if (updKeep.error) throw updKeep.error

  const updRemove = await supabase
    .from('zasoby')
    .update({ mnozstvo: 0, aktivne: false })
    .in('id', removeIds)

  if (updRemove.error) throw updRemove.error

  return {
    merged: true,
    keptId: keep.id,
    disabled: removeIds.length,
    totalQty,
  }
}

export default mergeSameBatch