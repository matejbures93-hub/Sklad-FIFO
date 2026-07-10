import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import CustomerSection from '../components/predaj/CustomerSection'
import ProductSection from '../components/predaj/ProductSection'
import CartSection from '../components/predaj/CartSection'
import { getReservations } from '../services/reservations.service'
import {
  deleteDraftById,
  draftItemsToCart,
  loadDraftItems,
  loadDraftList,
  saveDraftData,
} from '../services/draftService'
import {
  getAvailableStockRows,
  getBatchOptions,
  getChosenSklad,
  getRecommendedSklad,
  getReservedByZasoba,
  getSelectedBatch,
  getSkladSummary,
  getStockForProduct,
} from '../services/stockService'
import { finishSale } from '../services/salesService'
import {
  canCustomerBuyExpired,
  createCustomer,
  findCustomerById,
  loadCustomers,
  sortCustomers,
} from '../services/customerService'
import { filterProducts, loadProducts } from '../services/productService'
import { addItemToCart, clearCartState, getCartTotal, removeCartItem } from '../services/cartService'

export default function Predaj() {
  const [produkty, setProdukty] = useState([])
  const [produktId, setProduktId] = useState('')

  const [stockRows, setStockRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // predajka
  const [cenaKs, setCenaKs] = useState('')
  const [qtyInput, setQtyInput] = useState('')

  // sklad výber (default odporúčaný)
  const [overrideSkladId, setOverrideSkladId] = useState('')

  // konkrétna šarža / EXP výber
  const [selectedBatchId, setSelectedBatchId] = useState('')

  // košík
  const [cart, setCart] = useState([])

  // rozpracované predajky
  const [drafts, setDrafts] = useState([])
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [reservations, setReservations] = useState([])

  // ZÁKAZNÍCI
  const [zakaznici, setZakaznici] = useState([])
  const [zakaznikId, setZakaznikId] = useState('') // povinný

  // rýchly nový zákazník pri predaji
  const [newCustOpen, setNewCustOpen] = useState(false)
  const [newNazov, setNewNazov] = useState('')
  const [newTelefon, setNewTelefon] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // A–Z filter produktov
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const [letter, setLetter] = useState('') // vybrané písmeno
  const [qProd, setQProd] = useState('') // voliteľné vyhľadávanie v produktoch

  const loadProdukty = async () => {
    setMsg('')
    try {
      setProdukty(await loadProducts())
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní produktov')
    }
  }


  const loadZakaznici = async () => {
    try {
      setZakaznici(await loadCustomers())
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní zákazníkov')
    }
  }


  const loadDrafts = async () => {
    try {
      setDrafts(await loadDraftList())
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní rozpracovaných predajok')
    }
  }

  const loadReservations = async () => {
    try {
      setReservations(await getReservations())
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní rezervácií')
    }
  }

  const loadStock = async () => {
    setMsg('')
    setStockRows([])
    setOverrideSkladId('')
    setSelectedBatchId('')

    try {
      setStockRows(await getStockForProduct(produktId))
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní skladu')
    }
  }

  useEffect(() => {
    loadProdukty()
    loadZakaznici()
    loadDrafts()
    loadReservations()
  }, [])

  useEffect(() => {
    loadStock()
  }, [produktId])

  const reservedByZasoba = useMemo(
    () => getReservedByZasoba(reservations, currentDraftId),
    [reservations, currentDraftId]
  )

  const availableStockRows = useMemo(
    () => getAvailableStockRows(stockRows, reservedByZasoba),
    [stockRows, reservedByZasoba]
  )

  const filteredProdukty = useMemo(
    () => filterProducts(produkty, letter, qProd),
    [produkty, letter, qProd]
  )

  const batchOptions = useMemo(
    () => getBatchOptions(availableStockRows),
    [availableStockRows]
  )

  const selectedBatch = useMemo(
    () => getSelectedBatch(availableStockRows, selectedBatchId),
    [selectedBatchId, availableStockRows]
  )

  const skladSummary = useMemo(
    () => getSkladSummary(availableStockRows),
    [availableStockRows]
  )

  const recommended = useMemo(
    () => getRecommendedSklad(skladSummary),
    [skladSummary]
  )

  const chosenSklad = useMemo(
    () => getChosenSklad(skladSummary, overrideSkladId, recommended),
    [overrideSkladId, recommended, skladSummary]
  )

  const cartTotal = useMemo(
    () => getCartTotal(cart),
    [cart]
  )

  const selectedCustomer = useMemo(
    () => findCustomerById(zakaznici, zakaznikId),
    [zakaznikId, zakaznici]
  )

  const canBuyExpired = canCustomerBuyExpired(selectedCustomer)

  const defaultDraftName = () => {
    const name = selectedCustomer?.nazov || 'Rozpracovaná predajka'
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${name} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const saveDraft = async () => {
    setMsg('')

    const zid = Number(zakaznikId)
    if (!zid) return setMsg('Vyber zákazníka pred uložením rozpracovanej predajky.')
    if (cart.length === 0) return setMsg('Košík je prázdny – nie je čo uložiť.')

    setDraftLoading(true)
    try {
      const { data: sess, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr

      const name = draftName.trim() || defaultDraftName()
      const draftId = await saveDraftData({
        currentDraftId,
        name,
        zakaznikId: zid,
        cart,
        user: sess?.session?.user,
      })

      setCurrentDraftId(draftId)
      setDraftName(name)
      await loadDrafts()
      await loadReservations()
      setDraftOpen(true)
      setMsg('Rozpracovaná predajka uložená a zásoby rezervované ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní rozpracovanej predajky')
    } finally {
      setDraftLoading(false)
    }
  }

  const loadDraft = async (draft) => {
    setMsg('')
    setDraftLoading(true)
    try {
      const items = await loadDraftItems(draft.id)

      setZakaznikId(draft.zakaznik_id ? String(draft.zakaznik_id) : '')
      setCart(draftItemsToCart(items))
      setProduktId('')
      setOverrideSkladId('')
      setSelectedBatchId('')
      setQtyInput('')
      setCenaKs('')
      setCurrentDraftId(draft.id)
      setDraftName(draft.nazov ?? '')
      await loadReservations()
      setDraftOpen(false)
      setMsg('Rozpracovaná predajka načítaná ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní rozpracovanej predajky')
    } finally {
      setDraftLoading(false)
    }
  }

  const deleteDraft = async (draftId) => {
    const ok = window.confirm('Naozaj vymazať túto rozpracovanú predajku?')
    if (!ok) return

    setMsg('')
    setDraftLoading(true)
    try {
      await deleteDraftById(draftId)

      if (Number(currentDraftId) === Number(draftId)) {
        setCurrentDraftId(null)
        setDraftName('')
      }

      await loadDrafts()
      await loadReservations()
      setMsg('Rozpracovaná predajka vymazaná a rezervácie uvoľnené ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri mazaní rozpracovanej predajky')
    } finally {
      setDraftLoading(false)
    }
  }

  const clearCurrentCart = () => {
    const ok = window.confirm('Vymazať aktuálny košík?')
    if (!ok) return

    const cleared = clearCartState()
    setCart(cleared.cart)
    setProduktId(cleared.produktId)
    setOverrideSkladId(cleared.overrideSkladId)
    setSelectedBatchId(cleared.selectedBatchId)
    setQtyInput(cleared.qtyInput)
    setCenaKs(cleared.cenaKs)
    setCurrentDraftId(cleared.currentDraftId)
    setDraftName(cleared.draftName)
    setMsg('Košík vymazaný ✅')
  }


  const addToCart = (qty) => {
    setMsg('')

    const result = addItemToCart({
      cart,
      qty,
      produktId,
      zakaznikId,
      cenaKs,
      selectedBatch,
      batchOptions,
      overrideSkladId,
      canBuyExpired,
      products: produkty,
      setMsg,
    })

    if (!result.added) return

    setCart(result.cart)
    setQtyInput('')
    setMsg('Pridané do predajky ✅')
  }


  const removeItem = (index) => {
    setCart(prev => removeCartItem(prev, index))
  }

  const createCustomerQuick = async () => {
    setMsg('')

    try {
      const created = await createCustomer({
        nazov: newNazov,
        telefon: newTelefon,
        email: newEmail,
      })

      setZakaznici(prev => sortCustomers([...(prev ?? []), created]))
      setZakaznikId(String(created.id))
      setNewCustOpen(false)
      setNewNazov('')
      setNewTelefon('')
      setNewEmail('')
      setMsg('Zákazník pridaný ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní zákazníka')
    }
  }


  const dokonciPredajku = async () => {
    setMsg('')

    const zid = Number(zakaznikId)
    if (!zid) return setMsg('Vyber zákazníka (karta)')
    if (cart.length === 0) return setMsg('Košík je prázdny')

    setLoading(true)
    try {
      const custName = (zakaznici.find(z => Number(z.id) === zid)?.nazov ?? '').trim() || null

      await finishSale({
        cart,
        customerId: zid,
        customerName: custName,
        cartTotal,
        currentDraftId,
        canBuyExpired,
      })

      if (currentDraftId) {
        setCurrentDraftId(null)
        setDraftName('')
        await loadDrafts()
        await loadReservations()
      }

      setCart([])
      setProduktId('')
      setOverrideSkladId('')
      setSelectedBatchId('')
      setQtyInput('')
      setCenaKs('')
      setMsg(`Predajka uložená ✅ (Spolu ${cartTotal.toFixed(2)} €)`)
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri dokončení predajky')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Predaj (Predajka)</h1>
        <button className="text-sm underline" onClick={() => { loadStock(); loadReservations() }}>Obnoviť</button>
      </div>

      {msg && <div className="text-base border rounded-xl p-3 mb-3">{msg}</div>}

      <CustomerSection
        zakaznici={zakaznici}
        zakaznikId={zakaznikId}
        setZakaznikId={setZakaznikId}
        selectedCustomer={selectedCustomer}
        loadZakaznici={loadZakaznici}
        newCustOpen={newCustOpen}
        setNewCustOpen={setNewCustOpen}
        newNazov={newNazov}
        setNewNazov={setNewNazov}
        newTelefon={newTelefon}
        setNewTelefon={setNewTelefon}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        createCustomerQuick={createCustomerQuick}
      />

      <div className="space-y-3">
        <ProductSection
          letters={letters}
          letter={letter}
          setLetter={setLetter}
          qProd={qProd}
          setQProd={setQProd}
          produktId={produktId}
          setProduktId={setProduktId}
          filteredProdukty={filteredProdukty}
          stockRows={availableStockRows}
          overrideSkladId={overrideSkladId}
          setOverrideSkladId={setOverrideSkladId}
          selectedBatchId={selectedBatchId}
          setSelectedBatchId={setSelectedBatchId}
          skladSummary={skladSummary}
          batchOptions={batchOptions}
          selectedBatch={selectedBatch}
          chosenSklad={chosenSklad}
          cenaKs={cenaKs}
          setCenaKs={setCenaKs}
          qtyInput={qtyInput}
          setQtyInput={setQtyInput}
          addToCart={addToCart}
        />

        <CartSection
          cart={cart}
          cartTotal={cartTotal}
          currentDraftId={currentDraftId}
          draftName={draftName}
          removeItem={removeItem}
          dokonciPredajku={dokonciPredajku}
          loading={loading}
          drafts={drafts}
          draftOpen={draftOpen}
          setDraftOpen={setDraftOpen}
          draftLoading={draftLoading}
          setDraftName={setDraftName}
          zakaznici={zakaznici}
          loadDrafts={loadDrafts}
          saveDraft={saveDraft}
          clearCurrentCart={clearCurrentCart}
          loadDraft={loadDraft}
          deleteDraft={deleteDraft}
        />
      </div>
    </div>
  )
}
