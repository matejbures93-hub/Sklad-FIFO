import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatExp, parseEur, round2, isExpired } from '../utils/predajUtils'
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
  pickAutoBatch,
} from '../services/stockService'
import { finishSale } from '../services/salesService'

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
    const p = await supabase.from('produkty').select('id, nazov').order('nazov', { ascending: true })
    if (p.error) return setMsg(p.error.message)
    setProdukty(p.data ?? [])
  }

  const loadZakaznici = async () => {
    const z = await supabase.from('zakaznici').select('id, nazov, moze_kupit_expir').order('nazov', { ascending: true })
    if (!z.error) setZakaznici(z.data ?? [])
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

  // produkty podľa písmena + hľadania
  const filteredProdukty = useMemo(() => {
    const pick = (letter || '').trim().toUpperCase()
    const query = (qProd || '').trim().toLowerCase()

    return (produkty ?? []).filter(p => {
      const name = String(p.nazov ?? '')
      if (pick && !name.toUpperCase().startsWith(pick)) return false
      if (query && !name.toLowerCase().includes(query)) return false
      return true
    })
  }, [produkty, letter, qProd])

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
    () => round2(cart.reduce((sum, i) => sum + (Number(i.suma) || 0), 0)),
    [cart]
  )

  const selectedCustomer = useMemo(() => {
    const id = Number(zakaznikId)
    if (!id) return null
    return zakaznici.find(z => Number(z.id) === id) ?? null
  }, [zakaznikId, zakaznici])

  const canBuyExpired = !!selectedCustomer?.moze_kupit_expir

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

    setCart([])
    setProduktId('')
    setOverrideSkladId('')
    setSelectedBatchId('')
    setQtyInput('')
    setCenaKs('')
    setCurrentDraftId(null)
    setDraftName('')
    setMsg('Košík vymazaný ✅')
  }

  const addToCart = (qty) => {
    setMsg('')

    const pid = Number(produktId)
    const q = Number(qty)
    const price = parseEur(cenaKs)

    // ✅ povinný zákazník (verzia A)
    const zid = Number(zakaznikId)
    if (!zid) return setMsg('Vyber zákazníka (karta)')

    if (!pid) return setMsg('Vyber produkt')
    if (!q || q <= 0) return setMsg('Zadaj množstvo')
    if (!price || price <= 0) return setMsg('Zadaj cenu (€/ks)')

    let batch = selectedBatch ?? pickAutoBatch(batchOptions, q)

    // Ak je ručne vybraný sklad, automatická šarža sa vyberie iba z toho skladu.
    if (!selectedBatch && overrideSkladId) {
      const sid = Number(overrideSkladId)
      const goodInSklad = batchOptions.filter(r => Number(r.sklad_id) === sid && !isExpired(r.expiracia))
      batch = goodInSklad.find(r => (Number(r.mnozstvo) || 0) >= q) ?? goodInSklad[0] ?? null
    }

    if (!batch?.id) return setMsg('Nie je dostupná neexpirovaná šarža pre tento produkt.')

    const manuallySelectedExpired = selectedBatch && isExpired(selectedBatch.expiracia)

    // automatika nesmie brať expirované
    if (!manuallySelectedExpired && isExpired(batch.expiracia)) {
      return setMsg('Automatický predaj nepovoľuje expirované šarže')
    }

    // ručný predaj expirovaných šarží je povolený iba vybraným zákazníkom
    if (manuallySelectedExpired && !canBuyExpired) {
      return setMsg('Expirované šarže môžeš predať iba zákazníkovi s povolením EXP, napr. Matej alebo Ingrid.')
    }

    const available = Number(batch.mnozstvo) || 0
    const batchSkladName = batch.sklady?.nazov ?? `Sklad ${batch.sklad_id}`

    if (available < q) {
      return setMsg(
        `V tejto šarži je dostupné iba ${available} ks (${batchSkladName}, EXP ${formatExp(batch.expiracia)}).`
      )
    }

    const produktNazov = produkty.find(p => Number(p.id) === pid)?.nazov ?? '—'
    const suma = round2(price * q)

    setCart(prev => {
      const idx = prev.findIndex(i =>
        i.produkt_id === pid &&
        i.zasoba_id === batch.id &&
        Number(i.cena_ks) === Number(price)
      )

      if (idx >= 0) {
        const next = [...prev]
        const newQty = Number(next[idx].qty) + q

        if (newQty > available) {
          setMsg(
            `V tejto šarži je dostupné iba ${available} ks (${batchSkladName}, EXP ${formatExp(batch.expiracia)}).`
          )
          return prev
        }

        next[idx] = {
          ...next[idx],
          qty: newQty,
          suma: round2(Number(next[idx].cena_ks) * newQty),
        }
        return next
      }

      return [
        ...prev,
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
      ]
    })

    setQtyInput('')
    setMsg('Pridané do predajky ✅')
  }

  const removeItem = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const createCustomerQuick = async () => {
    setMsg('')
    if (!newNazov.trim()) return setMsg('Zadaj názov zákazníka')

    try {
      const ins = await supabase
        .from('zakaznici')
        .insert({
          nazov: newNazov.trim(),
          telefon: newTelefon.trim() || null,
          email: newEmail.trim() || null,
        })
        .select('id, nazov, moze_kupit_expir')
        .single()

      if (ins.error) throw ins.error

      const created = ins.data
      setZakaznici(prev => {
        const next = [...(prev ?? []), created]
        next.sort((a, b) => (a.nazov ?? '').localeCompare(b.nazov ?? ''))
        return next
      })

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
