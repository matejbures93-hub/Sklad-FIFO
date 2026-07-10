import { useMemo, useState } from 'react'
import { addItemToCart, clearCartState, getCartTotal, removeCartItem } from '../services/cartService'

export default function useCart({ produkty, produktId, zakaznikId, selectedBatch, batchOptions, overrideSkladId, canBuyExpired, setMsg }) {
  const [cart, setCart] = useState([])
  const [cenaKs, setCenaKs] = useState('')
  const [qtyInput, setQtyInput] = useState('')

  const cartTotal = useMemo(() => getCartTotal(cart), [cart])

  const addToCart = (qty) => {
    setMsg('')
    const result = addItemToCart({ cart, qty, produktId, zakaznikId, cenaKs, selectedBatch, batchOptions, overrideSkladId, canBuyExpired, products: produkty, setMsg })
    if (!result.added) return
    setCart(result.cart)
    setQtyInput('')
    setMsg('Pridané do predajky ✅')
  }

  const removeItem = (index) => setCart(prev => removeCartItem(prev, index))

  const resetCart = () => {
    const cleared = clearCartState()
    setCart(cleared.cart)
    setQtyInput(cleared.qtyInput)
    setCenaKs(cleared.cenaKs)
  }

  return { cart, setCart, cartTotal, cenaKs, setCenaKs, qtyInput, setQtyInput, addToCart, removeItem, resetCart }
}
