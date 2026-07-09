import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { formatExp, parseEur, round2, isExpired } from '../utils/predajUtils'
import CustomerSection from '../components/predaj/CustomerSection'
import ProductSection from '../components/predaj/ProductSection'
import CartSection from '../components/predaj/CartSection'
import {
  getReservations,
  getReservationSummaryByDraftIds,
  replaceReservationsForDraft,
} from '../services/reservations.service'

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
    const d = await supabase
      .from('predajky_drafty')
      .select('id, created_at, updated_at, nazov, zakaznik_id, user_email')
      .order('updated_at', { ascending: false })
      .limit(30)

    if (d.error) return setMsg(d.error.message)

    const list = d.data ?? []
    const ids = list.map(x => x.id)

    if (ids.length === 0) {
      setDrafts([])
      return
    }

    const items = await supabase
      .from('predajky_draft_polozky')
      .select('draft_id')
      .in('draft_id', ids)

    const reservedQty = await getReservationSummaryByDraftIds(ids)

    const counts = new Map()
    for (const it of items.data ?? []) {
      counts.set(it.draft_id, (counts.get(it.draft_id) ?? 0) + 1)
    }

    setDrafts(list.map(x => ({
      ...x,
      itemsCount: counts.get(x.id) ?? 0,
      reservedQty: reservedQty.get(x.id) ?? 0,
    })))
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

    const pid = Number(produktId)
    if (!pid) return

    const { data, error } = await supabase
      .from('zasoby')
      .select('id, sklad_id, expiracia, mnozstvo, nakupna_cena, aktivne, sklady(nazov), produkty(nazov)')
      .eq('produkt_id', pid)
      .eq('aktivne', true)
      .gt('mnozstvo', 0)
      .order('expiracia', { ascending: true })
      .order('id', { ascending: true })

    if (error) return setMsg(error.message)
    setStockRows(data ?? [])
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

  const reservedByZasoba = useMemo(() => {
    const map = new Map()
    const activeDraftId = currentDraftId ? Number(currentDraftId) : null

    for (const r of reservations) {
      // Vlastná načítaná rozpracovaná predajka si svoje rezervácie necháva dostupné.
      if (activeDraftId && Number(r.draft_id) === activeDraftId) continue

      const key = Number(r.zasoba_id)
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + (Number(r.mnozstvo) || 0))
    }

    return map
  }, [reservations, currentDraftId])

  const availableStockRows = useMemo(() => {
    return (stockRows ?? [])
      .map(r => {
        const reserved = reservedByZasoba.get(Number(r.id)) ?? 0
        const originalQty = Number(r.mnozstvo) || 0
        const freeQty = Math.max(0, originalQty - reserved)

        return {
          ...r,
          povodne_mnozstvo: originalQty,
          rezervovane_mnozstvo: reserved,
          mnozstvo: freeQty,
        }
      })
      .filter(r => (Number(r.mnozstvo) || 0) > 0)
  }, [stockRows, reservedByZasoba])

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

  const batchOptions = useMemo(() => {
    return [...availableStockRows].sort((a, b) => {
      const ax = isExpired(a.expiracia) ? 1 : 0
      const bx = isExpired(b.expiracia) ? 1 : 0
      if (ax !== bx) return ax - bx

      const ae = a.expiracia || '9999-12-31'
      const be = b.expiracia || '9999-12-31'
      if (ae !== be) return ae < be ? -1 : 1

      return Number(a.id) - Number(b.id)
    })
  }, [availableStockRows])

  const selectedBatch = useMemo(() => {
    const id = Number(selectedBatchId)
    if (!id) return null
    return availableStockRows.find(r => Number(r.id) === id) ?? null
  }, [selectedBatchId, availableStockRows])

  const pickAutoBatch = (qty) => {
    const good = batchOptions.filter(r => !isExpired(r.expiracia))

    // Preferuj jednu šaržu, ktorá má dosť kusov, aby zákazník nedostal mix EXP.
    const enoughOneBatch = good.find(r => (Number(r.mnozstvo) || 0) >= qty)
    if (enoughOneBatch) return enoughOneBatch

    // Ak jedna šarža nestačí, vyber najbližšiu neexpirovanú.
    return good[0] ?? null
  }

  // zoskup podľa skladu pre vybraný produkt + aj nákupné ceny
  const skladSummary = useMemo(() => {
    const map = new Map()

    for (const r of availableStockRows) {
      const sid = r.sklad_id

      if (!map.has(sid)) {
        map.set(sid, {
          sklad_id: sid,
          sklad_nazov: r.sklady?.nazov ?? `Sklad ${sid}`,
          total: 0,
          nearestExp: null,
          nearestBuy: null,
          minBuy: null,
          maxBuy: null,
          produkt_nazov: r.produkty?.nazov ?? '',
        })
      }

      const g = map.get(sid)

      const qty = Number(r.mnozstvo) || 0
      g.total += qty

      const buy = Number(r.nakupna_cena)
      if (Number.isFinite(buy)) {
        if (g.minBuy === null || buy < g.minBuy) g.minBuy = buy
        if (g.maxBuy === null || buy > g.maxBuy) g.maxBuy = buy
      }

      // nearest exp + nearest buy iba z NEEXPIROVANÝCH šarží
      if (!isExpired(r.expiracia)) {
        if (!g.nearestExp || (r.expiracia && r.expiracia < g.nearestExp)) {
          g.nearestExp = r.expiracia
          g.nearestBuy = Number.isFinite(Number(r.nakupna_cena)) ? Number(r.nakupna_cena) : null
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.sklad_id - b.sklad_id)
  }, [availableStockRows])

  const recommended = useMemo(() => {
    if (!skladSummary.length) return null

    const valid = skladSummary.filter(g => g.nearestExp)
    if (valid.length === 0) return null

    let best = valid[0]
    for (const g of valid) {
      const a = g.nearestExp || '9999-12-31'
      const b = best.nearestExp || '9999-12-31'
      if (a < b) best = g
    }
    return best
  }, [skladSummary])

  const chosenSklad = useMemo(() => {
    const sid = Number(overrideSkladId)
    if (sid) return skladSummary.find(x => x.sklad_id === sid) ?? null
    return recommended
  }, [overrideSkladId, recommended, skladSummary])

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
      const user = sess?.session?.user

      const name = draftName.trim() || defaultDraftName()
      let draftId = currentDraftId

      if (draftId) {
        const upd = await supabase
          .from('predajky_drafty')
          .update({
            nazov: name,
            zakaznik_id: zid,
            user_id: user?.id ?? null,
            user_email: user?.email ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draftId)

        if (upd.error) throw upd.error

        const del = await supabase
          .from('predajky_draft_polozky')
          .delete()
          .eq('draft_id', draftId)

        if (del.error) throw del.error

      } else {
        const ins = await supabase
          .from('predajky_drafty')
          .insert({
            nazov: name,
            zakaznik_id: zid,
            user_id: user?.id ?? null,
            user_email: user?.email ?? null,
          })
          .select('id')
          .single()

        if (ins.error) throw ins.error
        draftId = ins.data?.id
        if (!draftId) throw new Error('Nepodarilo sa vytvoriť rozpracovanú predajku.')
        setCurrentDraftId(draftId)
      }

      const rows = cart.map(item => ({
        draft_id: draftId,
        produkt_id: item.produkt_id,
        produkt_nazov: item.produkt_nazov,
        zasoba_id: item.zasoba_id ?? null,
        sklad_id: item.sklad_id,
        sklad_nazov: item.sklad_nazov,
        mnozstvo: item.qty,
        cena_ks: item.cena_ks,
        suma: item.suma,
        expiracia: item.expiracia ?? null,
      }))

      const insItems = await supabase
        .from('predajky_draft_polozky')
        .insert(rows)

      if (insItems.error) throw insItems.error

      await replaceReservationsForDraft({
        draftId,
        cart,
        user,
      })

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
      const { data, error } = await supabase
        .from('predajky_draft_polozky')
        .select('*')
        .eq('draft_id', draft.id)
        .order('id', { ascending: true })

      if (error) throw error

      setZakaznikId(draft.zakaznik_id ? String(draft.zakaznik_id) : '')
      setCart((data ?? []).map(it => ({
        produkt_id: it.produkt_id,
        produkt_nazov: it.produkt_nazov ?? '—',
        zasoba_id: it.zasoba_id,
        sklad_id: it.sklad_id,
        sklad_nazov: it.sklad_nazov ?? '—',
        expiracia: it.expiracia ?? null,
        qty: Number(it.mnozstvo) || 0,
        cena_ks: Number(it.cena_ks) || 0,
        suma: Number(it.suma) || 0,
      })))
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
      const { error } = await supabase
        .from('predajky_drafty')
        .delete()
        .eq('id', draftId)

      if (error) throw error

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

    let batch = selectedBatch ?? pickAutoBatch(q)

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

  // FEFO odpočet zásob pre konkrétny produkt+sklad
  const fefoDeduct = async (pid, sid, qty) => {
    const { data, error } = await supabase
      .from('zasoby')
      .select('id, expiracia, mnozstvo')
      .eq('produkt_id', pid)
      .eq('sklad_id', sid)
      .eq('aktivne', true)
      .gt('mnozstvo', 0)
      .order('expiracia', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw error

    const list = (data ?? []).filter(r => !isExpired(r.expiracia))
    const available = list.reduce((sum, r) => sum + (Number(r.mnozstvo) || 0), 0)

    if (available < qty) {
      throw new Error(`Nedostatok neexpirovaných zásob (Sklad ${sid}). Dostupné: ${available} ks, chceš: ${qty} ks.`)
    }

    let remaining = qty
    const taken = []

    for (const r of list) {
      if (remaining <= 0) break

      const have = Number(r.mnozstvo) || 0
      const take = Math.min(have, remaining)
      const newQty = have - take

      remaining -= take

      const patch = { mnozstvo: newQty, aktivne: newQty > 0 }

      const upd = await supabase
        .from('zasoby')
        .update(patch)
        .eq('id', r.id)

      if (upd.error) throw upd.error

      taken.push({
        mnozstvo: take,
        expiracia: r.expiracia ?? null,
      })
    }

    return taken
  }

  const deductExactBatch = async (zasobaId, qty) => {
    const { data, error } = await supabase
      .from('zasoby')
      .select('id, expiracia, mnozstvo')
      .eq('id', zasobaId)
      .eq('aktivne', true)
      .single()

    if (error) throw error

    if (isExpired(data?.expiracia) && !canBuyExpired) {
      throw new Error(`Zvolená šarža je expirovaná (EXP ${formatExp(data?.expiracia)}). Predaj EXP je povolený iba vybraným zákazníkom.`)
    }

    const have = Number(data?.mnozstvo) || 0
    if (have < qty) {
      throw new Error(`V zvolenej šarži je už len ${have} ks, chceš ${qty} ks.`)
    }

    const newQty = have - qty

    const upd = await supabase
      .from('zasoby')
      .update({ mnozstvo: newQty, aktivne: newQty > 0 })
      .eq('id', zasobaId)

    if (upd.error) throw upd.error

    return [{
      mnozstvo: qty,
      expiracia: data.expiracia ?? null,
    }]
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
      const { data: sess, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const user = sess?.session?.user

      const custName = (zakaznici.find(z => Number(z.id) === zid)?.nazov ?? '').trim() || null

      // 1) hlavička predajky
      const insHead = await supabase
        .from('predajky')
        .insert({
          // nech sa ti nič nerozbije v histórii – uložíme názov zákazníka aj do "komu"
          komu: custName,
          suma: cartTotal,
          zakaznik_id: zid,
          user_id: user?.id ?? null,
          user_email: user?.email ?? null,
        })
        .select('id')
        .single()

      if (insHead.error) throw insHead.error
      const predajkaId = insHead.data?.id
      if (!predajkaId) throw new Error('Nepodarilo sa vytvoriť predajku')

      // 2) položky: presný odpočet šarže + insert
      for (const item of cart) {
        const taken = item.zasoba_id
          ? await deductExactBatch(item.zasoba_id, item.qty)
          : await fefoDeduct(item.produkt_id, item.sklad_id, item.qty)

        for (const t of taken) {
          const partSum = round2(Number(item.cena_ks) * Number(t.mnozstvo))

          const insItem = await supabase.from('predajky_polozky').insert({
            predajka_id: predajkaId,
            produkt_id: item.produkt_id,
            sklad_id: item.sklad_id,
            mnozstvo: t.mnozstvo,
            cena_ks: item.cena_ks,
            suma: partSum,
            expiracia: t.expiracia,
          })

          if (insItem.error) throw insItem.error
        }
      }

      if (currentDraftId) {
        const delDraft = await supabase
          .from('predajky_drafty')
          .delete()
          .eq('id', currentDraftId)

        if (delDraft.error) throw delDraft.error
        setCurrentDraftId(null)
        setDraftName('')
        await loadDrafts()
        await loadReservations()
      }

      // reset košíka a výberov
      setCart([])
      setProduktId('')
      setOverrideSkladId('')
      setSelectedBatchId('')
      setQtyInput('')
      setCenaKs('')
      // zákazníka necháme vybraného (príjemné pri viacerých predajoch)
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
