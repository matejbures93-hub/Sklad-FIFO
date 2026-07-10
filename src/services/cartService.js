import { formatExp, isExpired, parseEur, round2 } from '../utils/predajUtils'
import { findProductNameById } from './productService'
import { pickAutoBatch } from './stockService'

export function getCartTotal(cart) {
  return round2((cart ?? []).reduce((sum, i) => sum + (Number(i.suma) || 0), 0))
}

export function removeCartItem(cart, index) {
  return (cart ?? []).filter((_, i) => i !== index)
}

export function clearCartState() {
  return {
    cart: [],
    produktId: '',
    overrideSkladId: '',
    selectedBatchId: '',
    qtyInput: '',
    cenaKs: '',
    currentDraftId: null,
    draftName: '',
  }
}

export function addItemToCart({
  cart,
  qty,
  produktId,
  zakaznikId,
  cenaKs,
  selectedBatch,
  batchOptions,
  overrideSkladId,
  canBuyExpired,
  products,
  setMsg,
}) {
  const pid = Number(produktId)
  const q = Number(qty)
  const price = parseEur(cenaKs)
  const zid = Number(zakaznikId)

  if (!zid) {
    setMsg('Vyber zákazníka (karta)')
    return { cart, added: false }
  }

  if (!pid) {
    setMsg('Vyber produkt')
    return { cart, added: false }
  }

  if (!q || q <= 0) {
    setMsg('Zadaj množstvo')
    return { cart, added: false }
  }

  if (!price || price <= 0) {
    setMsg('Zadaj cenu (€/ks)')
    return { cart, added: false }
  }

  let batch = selectedBatch ?? pickAutoBatch(batchOptions, q)

  if (!selectedBatch && overrideSkladId) {
    const sid = Number(overrideSkladId)
    const goodInSklad = (batchOptions ?? []).filter(r => Number(r.sklad_id) === sid && !isExpired(r.expiracia))
    batch = goodInSklad.find(r => (Number(r.mnozstvo) || 0) >= q) ?? goodInSklad[0] ?? null
  }

  if (!batch?.id) {
    setMsg('Nie je dostupná neexpirovaná šarža pre tento produkt.')
    return { cart, added: false }
  }

  const manuallySelectedExpired = selectedBatch && isExpired(selectedBatch.expiracia)

  if (!manuallySelectedExpired && isExpired(batch.expiracia)) {
    setMsg('Automatický predaj nepovoľuje expirované šarže')
    return { cart, added: false }
  }

  if (manuallySelectedExpired && !canBuyExpired) {
    setMsg('Expirované šarže môžeš predať iba zákazníkovi s povolením EXP, napr. Matej alebo Ingrid.')
    return { cart, added: false }
  }

  const available = Number(batch.mnozstvo) || 0
  const batchSkladName = batch.sklady?.nazov ?? `Sklad ${batch.sklad_id}`

  if (available < q) {
    setMsg(`V tejto šarži je dostupné iba ${available} ks (${batchSkladName}, EXP ${formatExp(batch.expiracia)}).`)
    return { cart, added: false }
  }

  const produktNazov = findProductNameById(products, pid)
  const suma = round2(price * q)

  const idx = (cart ?? []).findIndex(i =>
    i.produkt_id === pid &&
    i.zasoba_id === batch.id &&
    Number(i.cena_ks) === Number(price)
  )

  if (idx >= 0) {
    const next = [...cart]
    const newQty = Number(next[idx].qty) + q

    if (newQty > available) {
      setMsg(`V tejto šarži je dostupné iba ${available} ks (${batchSkladName}, EXP ${formatExp(batch.expiracia)}).`)
      return { cart, added: false }
    }

    next[idx] = {
      ...next[idx],
      qty: newQty,
      suma: round2(Number(next[idx].cena_ks) * newQty),
    }

    return { cart: next, added: true }
  }

  return {
    cart: [
      ...(cart ?? []),
      {
        produkt_id: pid,
        produkt_nazov: produktNazov,
        zasoba_id: batch.id,
        sklad_id: batch.sklad_id,
        sklad_nazov: batchSkladName,
        expiracia: batch.expiracia ?? null,
        qty: q,
        cena_ks: price,
        suma,
      },
    ],
    added: true,
  }
}
