import { supabase } from './supabase'

export async function loadCustomers() {
  const { data, error } = await supabase
    .from('zakaznici')
    .select('id, nazov, moze_kupit_expir')
    .order('nazov', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createCustomer({ nazov, telefon, email }) {
  const name = String(nazov ?? '').trim()
  if (!name) throw new Error('Zadaj názov zákazníka')

  const { data, error } = await supabase
    .from('zakaznici')
    .insert({
      nazov: name,
      telefon: String(telefon ?? '').trim() || null,
      email: String(email ?? '').trim() || null,
    })
    .select('id, nazov, moze_kupit_expir')
    .single()

  if (error) throw error
  return data
}

export function findCustomerById(customers, customerId) {
  const id = Number(customerId)
  if (!id) return null
  return (customers ?? []).find(z => Number(z.id) === id) ?? null
}

export function sortCustomers(customers) {
  return [...(customers ?? [])].sort((a, b) => (a.nazov ?? '').localeCompare(b.nazov ?? ''))
}

export function canCustomerBuyExpired(customer) {
  return !!customer?.moze_kupit_expir
}
