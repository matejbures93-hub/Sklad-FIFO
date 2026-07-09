import { supabase } from './supabase'
import { round2 } from '../utils/predajUtils'
import { deductExactBatch, fefoDeduct } from './stockService'
import { deleteDraftById } from './draftService'

export async function finishSale({
  cart,
  customerId,
  customerName,
  cartTotal,
  currentDraftId,
  canBuyExpired,
}) {
  if (!Number(customerId)) {
    throw new Error('Vyber zákazníka (karta)')
  }

  if (!cart?.length) {
    throw new Error('Košík je prázdny')
  }

  const { data: sess, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) throw sessErr
  const user = sess?.session?.user

  const { data: head, error: headError } = await supabase
    .from('predajky')
    .insert({
      komu: customerName || null,
      suma: cartTotal,
      zakaznik_id: Number(customerId),
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
    })
    .select('id')
    .single()

  if (headError) throw headError

  const predajkaId = head?.id
  if (!predajkaId) throw new Error('Nepodarilo sa vytvoriť predajku')

  for (const item of cart) {
    const taken = item.zasoba_id
      ? await deductExactBatch({
          zasobaId: item.zasoba_id,
          qty: item.qty,
          canBuyExpired,
        })
      : await fefoDeduct({
          produktId: item.produkt_id,
          skladId: item.sklad_id,
          qty: item.qty,
        })

    for (const t of taken) {
      const partSum = round2(Number(item.cena_ks) * Number(t.mnozstvo))

      const { error: itemError } = await supabase
        .from('predajky_polozky')
        .insert({
          predajka_id: predajkaId,
          produkt_id: item.produkt_id,
          sklad_id: item.sklad_id,
          mnozstvo: t.mnozstvo,
          cena_ks: item.cena_ks,
          suma: partSum,
          expiracia: t.expiracia,
        })

      if (itemError) throw itemError
    }
  }

  if (currentDraftId) {
    await deleteDraftById(currentDraftId)
  }

  return {
    predajkaId,
    total: cartTotal,
  }
}
