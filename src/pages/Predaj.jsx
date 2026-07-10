import { useState } from 'react'
import CustomerSection from '../components/predaj/CustomerSection'
import ProductSection from '../components/predaj/ProductSection'
import CartSection from '../components/predaj/CartSection'
import { finishSale } from '../services/salesService'
import useCustomers from '../hooks/useCustomers'
import useProducts from '../hooks/useProducts'
import useStock from '../hooks/useStock'
import useCart from '../hooks/useCart'
import useDrafts from '../hooks/useDrafts'

export default function Predaj() {
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState(null)

  const customers = useCustomers(setMsg)
  const products = useProducts(setMsg)
  const stock = useStock({ produktId: products.produktId, currentDraftId, setMsg })
  const cart = useCart({ produkty: products.produkty, produktId: products.produktId, zakaznikId: customers.zakaznikId, selectedBatch: stock.selectedBatch, batchOptions: stock.batchOptions, overrideSkladId: stock.overrideSkladId, canBuyExpired: customers.canBuyExpired, setMsg })

  const drafts = useDrafts({
    cart: cart.cart,
    setCart: cart.setCart,
    zakaznikId: customers.zakaznikId,
    setZakaznikId: customers.setZakaznikId,
    selectedCustomer: customers.selectedCustomer,
    currentDraftId,
    setCurrentDraftId,
    setMsg,
    resetProductAndStock: () => { products.resetProduct(); stock.resetStockSelection() },
    resetCartInputs: () => { cart.setQtyInput(''); cart.setCenaKs('') },
  })

  const clearCurrentCart = () => {
    if (!window.confirm('Vymazať aktuálny košík?')) return
    cart.resetCart()
    products.resetProduct()
    stock.resetStockSelection()
    drafts.resetCurrentDraft()
    setMsg('Košík vymazaný ✅')
  }

  const dokonciPredajku = async () => {
    setMsg('')
    const zid = Number(customers.zakaznikId)
    if (!zid) return setMsg('Vyber zákazníka (karta)')
    if (cart.cart.length === 0) return setMsg('Košík je prázdny')
    setLoading(true)
    try {
      await finishSale({ cart: cart.cart, customerId: zid, customerName: customers.selectedCustomer?.nazov ?? null, cartTotal: cart.cartTotal, currentDraftId, canBuyExpired: customers.canBuyExpired })
      if (currentDraftId) {
        drafts.resetCurrentDraft()
        await drafts.loadDrafts()
        await stock.loadReservations()
      }
      cart.resetCart()
      products.resetProduct()
      stock.resetStockSelection()
      setMsg(`Predajka uložená ✅ (Spolu ${cart.cartTotal.toFixed(2)} €)`)
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri dokončení predajky')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Predaj (Predajka)</h1>
        <button className="text-sm underline" onClick={stock.refreshStock}>Obnoviť</button>
      </div>
      {msg && <div className="text-base border rounded-xl p-3 mb-3">{msg}</div>}

      <CustomerSection
        zakaznici={customers.zakaznici}
        zakaznikId={customers.zakaznikId}
        setZakaznikId={customers.setZakaznikId}
        selectedCustomer={customers.selectedCustomer}
        loadZakaznici={customers.loadZakaznici}
        newCustOpen={customers.newCustOpen}
        setNewCustOpen={customers.setNewCustOpen}
        newNazov={customers.newNazov}
        setNewNazov={customers.setNewNazov}
        newTelefon={customers.newTelefon}
        setNewTelefon={customers.setNewTelefon}
        newEmail={customers.newEmail}
        setNewEmail={customers.setNewEmail}
        createCustomerQuick={customers.createCustomerQuick}
      />

      <div className="space-y-3">
        <ProductSection
          letters={products.letters}
          letter={products.letter}
          setLetter={products.setLetter}
          qProd={products.qProd}
          setQProd={products.setQProd}
          produktId={products.produktId}
          setProduktId={products.setProduktId}
          filteredProdukty={products.filteredProdukty}
          stockRows={stock.stockRows}
          overrideSkladId={stock.overrideSkladId}
          setOverrideSkladId={stock.setOverrideSkladId}
          selectedBatchId={stock.selectedBatchId}
          setSelectedBatchId={stock.setSelectedBatchId}
          skladSummary={stock.skladSummary}
          batchOptions={stock.batchOptions}
          selectedBatch={stock.selectedBatch}
          chosenSklad={stock.chosenSklad}
          cenaKs={cart.cenaKs}
          setCenaKs={cart.setCenaKs}
          qtyInput={cart.qtyInput}
          setQtyInput={cart.setQtyInput}
          addToCart={cart.addToCart}
        />

        <CartSection
          cart={cart.cart}
          cartTotal={cart.cartTotal}
          currentDraftId={currentDraftId}
          draftName={drafts.draftName}
          removeItem={cart.removeItem}
          dokonciPredajku={dokonciPredajku}
          loading={loading}
          drafts={drafts.drafts}
          draftOpen={drafts.draftOpen}
          setDraftOpen={drafts.setDraftOpen}
          draftLoading={drafts.draftLoading}
          setDraftName={drafts.setDraftName}
          zakaznici={customers.zakaznici}
          loadDrafts={drafts.loadDrafts}
          saveDraft={() => drafts.saveDraft(stock.loadReservations)}
          clearCurrentCart={clearCurrentCart}
          loadDraft={(draft) => drafts.loadDraft(draft, stock.loadReservations)}
          deleteDraft={(draftId) => drafts.deleteDraft(draftId, stock.loadReservations)}
        />
      </div>
    </div>
  )
}
