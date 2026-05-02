import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import BulkMove from '../components/BulkMove'
import MergeBatches from '../components/MergeBatches'
import { formatExp, fmtEur, parseEur, parseIntSafe, expStatus } from '../utils/skladUtils'
import EditPriceModal from '../components/sklad/EditPriceModal'
import InventoryModal from '../components/sklad/InventoryModal'
import MoveBatchModal from '../components/sklad/MoveBatchModal'
import SkladFilters from '../components/sklad/SkladFilters'
import ProductCard from '../components/sklad/ProductCard'
import useSkladGrouped from '../hooks/useSkladGrouped'

export default function Sklad() {
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [q, setQ] = useState('')
  const [letter, setLetter] = useState('')
  const [skladFilter, setSkladFilter] = useState('')
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [showExpired, setShowExpired] = useState(true)
  const [openKey, setOpenKey] = useState('')

  // ✏️ edit cena modal
  const [editOpen, setEditOpen] = useState(false)
  const [editRowId, setEditRowId] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editErr, setEditErr] = useState('')

  // ↔️ presun šarže modal
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveRow, setMoveRow] = useState(null)
  const [moveTargetSkladId, setMoveTargetSkladId] = useState('')
  const [moveQty, setMoveQty] = useState('')
  const [moveSaving, setMoveSaving] = useState(false)
  const [moveErr, setMoveErr] = useState('')

  // 🧮 inventúra modal
  const [invOpen, setInvOpen] = useState(false)
  const [invRow, setInvRow] = useState(null)
  const [invQty, setInvQty] = useState('')
  const [invSaving, setInvSaving] = useState(false)
  const [invErr, setInvErr] = useState('')

  // 🔥 hromadný presun skladu
  const [bulkFrom, setBulkFrom] = useState('')
  const [bulkTo, setBulkTo] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  const load = async () => {
    setLoading(true)
    setMsg('')
    const { data, error } = await supabase
      .from('zasoby')
      .select(`
        id,
        expiracia,
        mnozstvo,
        nakupna_cena,
        produkty ( id, nazov ),
        sklady ( id, nazov )
      `)
      .eq('aktivne', true)
      .order('expiracia', { ascending: true })
      .order('id', { ascending: true })

    if (error) setMsg(error.message)
    else setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const skladyList = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const id = r.sklady?.id
      const nazov = r.sklady?.nazov
      if (id && nazov) map.set(id, nazov)
    }
    return Array.from(map.entries())
      .map(([id, nazov]) => ({ id: Number(id), nazov }))
      .sort((a, b) => (a.nazov ?? '').localeCompare(b.nazov ?? '', 'sk'))
  }, [rows])

  const skladyOptions = useMemo(() => {
    const set = new Set()
    for (const r of rows) {
      const n = r.sklady?.nazov
      if (n) set.add(n)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'sk'))
  }, [rows])

  const grouped = useSkladGrouped({
   rows,
    q,
    letter,
    skladFilter,
    onlyCritical,
    showExpired,
 })

  const topSummary = useMemo(() => {
    const totalProducts = grouped.length
    const totalQty = grouped.reduce((s, g) => s + (Number(g.totalQty) || 0), 0)
    const criticalCount = grouped.filter(g => g.hasCritical).length
    return { totalProducts, totalQty, criticalCount }
  }, [grouped])

  useEffect(() => {
    setOpenKey('')
  }, [q, letter, skladFilter, onlyCritical, showExpired])

  // ✏️ EDIT CENA
  const openEdit = (row) => {
    setEditErr('')
    setEditRowId(row?.id ?? null)
    const cur = row?.nakupna_cena
    setEditPrice(cur === null || cur === undefined ? '' : String(cur).replace('.', ','))
    setEditOpen(true)
  }

  const closeEdit = () => {
    if (editSaving) return
    setEditOpen(false)
    setEditRowId(null)
    setEditPrice('')
    setEditErr('')
  }

  const saveEdit = async () => {
    setEditErr('')
    const id = Number(editRowId)
    if (!id) return setEditErr('Chýba ID záznamu.')

    const val = parseEur(editPrice)
    if (!Number.isFinite(val) || val <= 0) return setEditErr('Zadaj platnú cenu (napr. 2,30).')

    setEditSaving(true)
    try {
      const { error } = await supabase
        .from('zasoby')
        .update({ nakupna_cena: val })
        .eq('id', id)

      if (error) throw error

      setRows(prev => (prev ?? []).map(r => (r.id === id ? { ...r, nakupna_cena: val } : r)))
      setEditOpen(false)
      setEditRowId(null)
      setEditPrice('')
    } catch (e) {
      setEditErr(e?.message ?? 'Chyba pri ukladaní ceny')
    } finally {
      setEditSaving(false)
    }
  }

  // ↔️ PRESUN ŠARŽE
  const openMove = (row) => {
    setMoveErr('')
    setMoveRow(row ?? null)
    setMoveQty('')
    const curId = Number(row?.sklady?.id)
    const firstOther = skladyList.find(s => Number(s.id) !== curId)
    setMoveTargetSkladId(firstOther ? String(firstOther.id) : '')
    setMoveOpen(true)
  }

  const closeMove = () => {
    if (moveSaving) return
    setMoveOpen(false)
    setMoveRow(null)
    setMoveTargetSkladId('')
    setMoveQty('')
    setMoveErr('')
  }

  const saveMove = async () => {
    setMoveErr('')
    const r = moveRow
    const rowId = Number(r?.id)
    const fromSkladId = Number(r?.sklady?.id)
    const toSkladId = Number(moveTargetSkladId)
    const have = Number(r?.mnozstvo) || 0
    const qty = parseIntSafe(moveQty)

    const produktId = Number(r?.produkty?.id)
    if (!rowId) return setMoveErr('Chýba ID šarže.')
    if (!produktId) return setMoveErr('Chýba produkt ID.')
    if (!fromSkladId) return setMoveErr('Chýba zdrojový sklad.')
    if (!toSkladId) return setMoveErr('Vyber cieľový sklad.')
    if (toSkladId === fromSkladId) return setMoveErr('Cieľový sklad musí byť iný.')
    if (!Number.isFinite(qty) || qty <= 0) return setMoveErr('Zadaj množstvo (ks).')
    if (qty > have) return setMoveErr(`Nemôžeš presunúť viac než ${have} ks.`)

    const targetName = skladyList.find(s => Number(s.id) === toSkladId)?.nazov ?? `Sklad ${toSkladId}`

    setMoveSaving(true)
    try {
      if (qty === have) {
        const { error } = await supabase
          .from('zasoby')
          .update({ sklad_id: toSkladId })
          .eq('id', rowId)

        if (error) throw error

        setRows(prev => (prev ?? []).map(x => (
          x.id === rowId ? { ...x, sklady: { id: toSkladId, nazov: targetName } } : x
        )))

        setMsg('Presunuté ✅')
        closeMove()
        return
      }

      const left = have - qty

      const upd = await supabase
        .from('zasoby')
        .update({ mnozstvo: left, aktivne: left > 0 })
        .eq('id', rowId)
      if (upd.error) throw upd.error

      const ins = await supabase
        .from('zasoby')
        .insert({
          produkt_id: produktId,
          sklad_id: toSkladId,
          expiracia: r?.expiracia ?? null,
          mnozstvo: qty,
          nakupna_cena: r?.nakupna_cena ?? null,
          aktivne: true,
        })
        .select('id')
        .single()
      if (ins.error) throw ins.error

      const newId = ins.data?.id
      if (!newId) throw new Error('Nepodarilo sa vytvoriť novú šaržu.')

      setRows(prev => {
        const list = [...(prev ?? [])]
        const idx = list.findIndex(x => x.id === rowId)
        if (idx >= 0) list[idx] = { ...list[idx], mnozstvo: left, aktivne: left > 0 }

        list.push({
          ...r,
          id: newId,
          mnozstvo: qty,
          sklady: { id: toSkladId, nazov: targetName },
        })
        return list
      })

      setMsg('Presunuté ✅')
      closeMove()
    } catch (e) {
      setMoveErr(e?.message ?? 'Chyba pri presune')
    } finally {
      setMoveSaving(false)
    }
  }

  // 🧮 INVENTÚRA ŠARŽE
  const openInv = (row) => {
    setInvErr('')
    setInvRow(row ?? null)
    setInvQty(String(row?.mnozstvo ?? ''))
    setInvOpen(true)
  }

  const closeInv = () => {
    if (invSaving) return
    setInvOpen(false)
    setInvRow(null)
    setInvQty('')
    setInvErr('')
  }

  const saveInv = async () => {
    setInvErr('')

    const id = Number(invRow?.id)
    const qty = parseIntSafe(invQty)

    if (!id) return setInvErr('Chýba ID šarže.')
    if (!Number.isFinite(qty) || qty < 0) return setInvErr('Zadaj platné množstvo.')
    if (qty > 999999) return setInvErr('Množstvo je príliš vysoké.')

    setInvSaving(true)
    try {
      const { error } = await supabase
        .from('zasoby')
        .update({
          mnozstvo: qty,
          aktivne: qty > 0,
        })
        .eq('id', id)

      if (error) throw error

      setRows(prev => (prev ?? [])
        .map(r => (r.id === id ? { ...r, mnozstvo: qty, aktivne: qty > 0 } : r))
        .filter(r => r.aktivne !== false)
      )

      setMsg('Inventúra uložená ✅')
      closeInv()
    } catch (e) {
      setInvErr(e?.message ?? 'Chyba pri inventúre')
    } finally {
      setInvSaving(false)
    }
  }

  // 🔥 HROMADNÝ PRESUN SKLADU
  const handleBulkMove = async () => {
    setMsg('')

    const fromId = Number(bulkFrom)
    const toId = Number(bulkTo)

    if (!fromId || !toId) {
      setMsg('Vyber sklad odkiaľ aj kam.')
      return
    }

    if (fromId === toId) {
      setMsg('Sklady musia byť rozdielne.')
      return
    }

    const fromName = skladyList.find(s => Number(s.id) === fromId)?.nazov ?? `Sklad ${fromId}`
    const toName = skladyList.find(s => Number(s.id) === toId)?.nazov ?? `Sklad ${toId}`

    const countRows = rows.filter(r =>
      Number(r.sklady?.id) === fromId &&
      Number(r.mnozstvo) > 0
    )

    const countQty = countRows.reduce((sum, r) => sum + (Number(r.mnozstvo) || 0), 0)

    if (countRows.length === 0) {
      setMsg(`V sklade "${fromName}" nie sú aktívne zásoby na presun.`)
      return
    }

    const ok = window.confirm(
      `Naozaj chceš presunúť všetko zo skladu "${fromName}" do skladu "${toName}"?\n\n` +
      `Počet šarží: ${countRows.length}\n` +
      `Spolu kusov: ${countQty} ks\n\n` +
      `Množstvá, ceny a expirácie ostanú nezmenené.`
    )

    if (!ok) return

    setBulkLoading(true)
    try {
      const { error } = await supabase
        .from('zasoby')
        .update({ sklad_id: toId })
        .eq('sklad_id', fromId)
        .eq('aktivne', true)
        .gt('mnozstvo', 0)

      if (error) throw error

      setRows(prev => (prev ?? []).map(r => (
        Number(r.sklady?.id) === fromId && Number(r.mnozstvo) > 0
          ? { ...r, sklady: { id: toId, nazov: toName } }
          : r
      )))

      setBulkFrom('')
      setBulkTo('')
      setMsg(`Presun zo skladu "${fromName}" do skladu "${toName}" dokončený ✅`)
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri hromadnom presune skladu')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Sklad</h1>
        <button className="text-sm underline" onClick={load}>Obnoviť</button>
      </div>

      {/* 🔥 HROMADNÝ PRESUN */}
      <BulkMove skladyList={skladyList} onDone={load} />
      <MergeBatches skladyList={skladyList} onDone={load} />

      {msg && <div className="text-sm border rounded-xl p-3 mb-3 bg-white">{msg}</div>}
      {loading && <div className="text-sm opacity-70 mb-2">Načítavam…</div>}

<SkladFilters
  letters={letters}
  letter={letter}
  setLetter={setLetter}
  q={q}
  setQ={setQ}
  skladFilter={skladFilter}
  setSkladFilter={setSkladFilter}
  skladyOptions={skladyOptions}
  onlyCritical={onlyCritical}
  setOnlyCritical={setOnlyCritical}
  showExpired={showExpired}
  setShowExpired={setShowExpired}
  topSummary={topSummary}
/>

<div className="space-y-3">
  {grouped.length === 0 && !loading ? (
    <div className="text-sm opacity-70">Nič sa nenašlo.</div>
  ) : (
    grouped.map(g => (
      <ProductCard
        key={g.key}
        g={g}
        isOpen={openKey === g.key}
        setOpenKey={setOpenKey}
        openEdit={openEdit}
        openMove={openMove}
        openInv={openInv}
      />
    ))
  )}
</div>

      <EditPriceModal
  editOpen={editOpen}
  editSaving={editSaving}
  editErr={editErr}
  editPrice={editPrice}
  setEditPrice={setEditPrice}
  closeEdit={closeEdit}
  saveEdit={saveEdit}
/>

     <MoveBatchModal
  moveOpen={moveOpen}
  moveSaving={moveSaving}
  moveErr={moveErr}
  moveRow={moveRow}
  moveQty={moveQty}
  setMoveQty={setMoveQty}
  moveTargetSkladId={moveTargetSkladId}
  setMoveTargetSkladId={setMoveTargetSkladId}
  skladyList={skladyList}
  closeMove={closeMove}
  saveMove={saveMove}
/>

      <InventoryModal
        invOpen={invOpen}
        invSaving={invSaving}
        invErr={invErr}
        invRow={invRow}
        invQty={invQty}
        setInvQty={setInvQty}
        closeInv={closeInv}
        saveInv={saveInv}
      />
    </div>
  )
}