import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { deleteDraftById, draftItemsToCart, loadDraftItems, loadDraftList, saveDraftData } from '../services/draftService'

export default function useDrafts({ cart, setCart, zakaznikId, setZakaznikId, selectedCustomer, currentDraftId, setCurrentDraftId, setMsg, resetProductAndStock, resetCartInputs }) {
  const [drafts, setDrafts] = useState([])
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftName, setDraftName] = useState('')

  const loadDrafts = async () => {
    try { setDrafts(await loadDraftList()) }
    catch (e) { setMsg(e?.message ?? 'Chyba pri načítaní rozpracovaných predajok') }
  }

  useEffect(() => { loadDrafts() }, [])

  const defaultDraftName = () => {
    const name = selectedCustomer?.nazov || 'Rozpracovaná predajka'
    const d = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `${name} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const saveDraft = async (refreshReservations) => {
    setMsg('')
    const zid = Number(zakaznikId)
    if (!zid) return setMsg('Vyber zákazníka pred uložením rozpracovanej predajky.')
    if (cart.length === 0) return setMsg('Košík je prázdny – nie je čo uložiť.')
    setDraftLoading(true)
    try {
      const { data: sess, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const name = draftName.trim() || defaultDraftName()
      const draftId = await saveDraftData({ currentDraftId, name, zakaznikId: zid, cart, user: sess?.session?.user })
      setCurrentDraftId(draftId)
      setDraftName(name)
      await loadDrafts()
      if (refreshReservations) await refreshReservations()
      setDraftOpen(true)
      setMsg('Rozpracovaná predajka uložená a zásoby rezervované ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní rozpracovanej predajky')
    } finally { setDraftLoading(false) }
  }

  const loadDraft = async (draft, refreshReservations) => {
    setMsg('')
    setDraftLoading(true)
    try {
      const items = await loadDraftItems(draft.id)
      setZakaznikId(draft.zakaznik_id ? String(draft.zakaznik_id) : '')
      setCart(draftItemsToCart(items))
      resetProductAndStock()
      resetCartInputs()
      setCurrentDraftId(draft.id)
      setDraftName(draft.nazov ?? '')
      if (refreshReservations) await refreshReservations()
      setDraftOpen(false)
      setMsg('Rozpracovaná predajka načítaná ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri načítaní rozpracovanej predajky')
    } finally { setDraftLoading(false) }
  }

  const deleteDraft = async (draftId, refreshReservations) => {
    if (!window.confirm('Naozaj vymazať túto rozpracovanú predajku?')) return
    setMsg('')
    setDraftLoading(true)
    try {
      await deleteDraftById(draftId)
      if (Number(currentDraftId) === Number(draftId)) { setCurrentDraftId(null); setDraftName('') }
      await loadDrafts()
      if (refreshReservations) await refreshReservations()
      setMsg('Rozpracovaná predajka vymazaná a rezervácie uvoľnené ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri mazaní rozpracovanej predajky')
    } finally { setDraftLoading(false) }
  }

  const resetCurrentDraft = () => { setCurrentDraftId(null); setDraftName('') }

  return { drafts, draftOpen, setDraftOpen, draftLoading, draftName, setDraftName, loadDrafts, saveDraft, loadDraft, deleteDraft, resetCurrentDraft }
}
