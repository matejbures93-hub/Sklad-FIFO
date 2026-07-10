import { supabase } from './supabase'

export async function loadProducts() {
  const { data, error } = await supabase
    .from('produkty')
    .select('id, nazov')
    .order('nazov', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function filterProducts(products, letter, query) {
  const pick = String(letter ?? '').trim().toUpperCase()
  const q = String(query ?? '').trim().toLowerCase()

  return (products ?? []).filter(p => {
    const name = String(p.nazov ?? '')
    if (pick && !name.toUpperCase().startsWith(pick)) return false
    if (q && !name.toLowerCase().includes(q)) return false
    return true
  })
}

export function findProductNameById(products, productId) {
  const id = Number(productId)
  return (products ?? []).find(p => Number(p.id) === id)?.nazov ?? '—'
}
