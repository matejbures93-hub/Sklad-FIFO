import { supabase } from './supabase'

export async function listProdukty() {
  const { data, error } = await supabase
    .from('produkty')
    .select('id, nazov')
    .order('nazov', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addProdukt(nazov) {
  const clean = (nazov ?? '').trim()
  if (!clean) throw new Error('Zadaj názov produktu')

  // jednoduchá ochrana proti duplicitám (case-insensitive) – najprv skús nájsť
  const { data: exist, error: e1 } = await supabase
    .from('produkty')
    .select('id, nazov')
    .ilike('nazov', clean)
    .limit(1)

  if (e1) throw e1
  if (exist && exist.length) throw new Error('Takýto produkt už existuje')

  const { data, error } = await supabase
    .from('produkty')
    .insert({ nazov: clean })
    .select('id, nazov')
    .single()

  if (error) throw error
  return data
}
