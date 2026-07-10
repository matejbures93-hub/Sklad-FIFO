import { useEffect, useMemo, useState } from 'react'
import { filterProducts, loadProducts } from '../services/productService'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function useProducts(setMsg) {
  const [produkty, setProdukty] = useState([])
  const [produktId, setProduktId] = useState('')
  const [letter, setLetter] = useState('')
  const [qProd, setQProd] = useState('')

  const loadProdukty = async () => {
    setMsg('')
    try { setProdukty(await loadProducts()) }
    catch (e) { setMsg(e?.message ?? 'Chyba pri načítaní produktov') }
  }

  useEffect(() => { loadProdukty() }, [])

  const filteredProdukty = useMemo(
    () => filterProducts(produkty, letter, qProd),
    [produkty, letter, qProd]
  )

  const resetProduct = () => setProduktId('')

  return { letters: LETTERS, produkty, produktId, setProduktId, letter, setLetter, qProd, setQProd, filteredProdukty, loadProdukty, resetProduct }
}
