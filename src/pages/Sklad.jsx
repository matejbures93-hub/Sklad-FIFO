import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import BulkMove from '../components/BulkMove'
import MergeBatches from '../components/MergeBatches'
import { formatExp, fmtEur, parseEur, parseIntSafe, expStatus } from '../utils/skladUtils'

function expStatus(exp) {
  const d = daysUntil(exp)
  if (d === null) return { dot: 'bg-gray-400', label: '—' }
  if (d < 0) return { dot: 'bg-red-500', label: 'EXPIROVANÉ' }
  if (d <= 60) return { dot: 'bg-orange-500', label: 'Do 2 mesiacov' }
  return { dot: 'bg-green-500', label: 'OK' }
}

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

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase()
    const pick = (letter || '').trim().toUpperCase()

    const filtered = rows.filter(r => {
      const nazovRaw = r.produkty?.nazov ?? ''
      const nazov = nazovRaw.toLowerCase()
      const nazovUpper = nazovRaw.toUpperCase()

      const skladN = r.sklady?.nazov ?? ''
      const st = expStatus(r.expiracia)

      if (pick && !nazovUpper.startsWith(pick)) return false
      if (query && !nazov.includes(query)) return false
      if (skladFilter && skladN !== skladFilter) return false
      if (!showExpired && st.label === 'EXPIROVANÉ') return false
      if (onlyCritical && !(st.label === 'EXPIROVANÉ' || st.label === 'Do 2 mesiacov')) return false

      return true
    })

    const map = new Map()

    for (const r of filtered) {
      const pid = r.produkty?.id ?? 'x'
      const pName = r.produkty?.nazov ?? '—'
      const key = `${pid}:${pName}`

      const qty = Number(r.mnozstvo) || 0
      const buy = Number(r.nakupna_cena)
      const value = Number.isFinite(buy) ? Math.round(buy * qty * 100) / 100 : null

      if (!map.has(key)) {
        map.set(key, {
          key,
          produkt_id: pid,
          produkt_nazov: pName,
          totalQty: 0,
          nearestExp: null,
          hasExpired: false,
          hasCritical: false,
          totalValue: 0,
          valueKnown: true,
          bySklad: new Map(),
        })
      }

      const g = map.get(key)
      g.totalQty += qty

      if (r.expiracia && (!g.nearestExp || r.expiracia < g.nearestExp)) g.nearestExp = r.expiracia

      const st = expStatus(r.expiracia)
      if (st.label === 'EXPIROVANÉ') g.hasExpired = true
      if (st.label === 'EXPIROVANÉ' || st.label === 'Do 2 mesiacov') g.hasCritical = true

      if (value === null) g.valueKnown = false
      else g.totalValue = Math.round((g.totalValue + value) * 100) / 100

      const sid = r.sklady?.id ?? 'x'
      const sName = r.sklady?.nazov ?? '—'
      const sKey = `${sid}:${sName}`

      if (!g.bySklad.has(sKey)) {
        g.bySklad.set(sKey, {
          sklad_id: sid,
          sklad_nazov: sName,
          totalQty: 0,
          nearestExp: null,
          rows: [],
        })
      }

      const sg = g.bySklad.get(sKey)
      sg.totalQty += qty
      if (r.expiracia && (!sg.nearestExp || r.expiracia < sg.nearestExp)) sg.nearestExp = r.expiracia
      sg.rows.push(r)
    }

    const arr = Array.from(map.values()).map(g => ({
      ...g,
      bySkladArr: Array.from(g.bySklad.values()).sort((a, b) =>
        (a.sklad_nazov ?? '').localeCompare(b.sklad_nazov ?? '', 'sk')
      ),
    }))

    arr.sort((a, b) => {
      const ac = a.hasCritical ? 0 : 1
      const bc = b.hasCritical ? 0 : 1
      if (ac !== bc) return ac - bc
      const ae = a.nearestExp || '9999-12-31'
      const be = b.nearestExp || '9999-12-31'
      if (ae !== be) return ae < be ? -1 : 1
      return a.produkt_nazov.localeCompare(b.produkt_nazov, 'sk')
    })

    return arr
  }, [rows, q, letter, skladFilter, onlyCritical, showExpired])

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

      <div className="border rounded-2xl bg-white shadow-sm p-3 mb-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {letters.map(l => (
              <button
                key={l}
                className={`px-2 py-1 rounded-lg text-sm font-semibold border ${
                  letter === l ? 'bg-black text-white' : 'bg-white'
                }`}
                onClick={() => setLetter(l)}
              >
                {l}
              </button>
            ))}
            <button
              className="px-2 py-1 rounded-lg text-sm border bg-white"
              onClick={() => setLetter('')}
              title="Zrušiť písmeno"
            >
              ✕
            </button>
          </div>

          <input
            className="w-full border rounded-xl px-3 py-2"
            placeholder="🔍 Vyhľadať produkt…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="flex-1 border rounded-xl px-3 py-2"
              value={skladFilter}
              onChange={(e) => setSkladFilter(e.target.value)}
            >
              <option value="">Všetky sklady</option>
              {skladyOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button
              className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                onlyCritical ? 'bg-orange-50' : 'bg-white'
              }`}
              onClick={() => setOnlyCritical(v => !v)}
            >
              Kritické
            </button>

            <button
              className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                showExpired ? 'bg-white' : 'bg-gray-50'
              }`}
              onClick={() => setShowExpired(v => !v)}
            >
              EXP
            </button>
          </div>

          <div className="text-xs opacity-70">
            Produkty: <b>{topSummary.totalProducts}</b> · Spolu ks: <b>{topSummary.totalQty}</b> · Kritické: <b>{topSummary.criticalCount}</b>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {grouped.length === 0 && !loading ? (
          <div className="text-sm opacity-70">Nič sa nenašlo.</div>
        ) : (
          grouped.map(g => {
            const isOpen = openKey === g.key

            const st = isOpen
              ? (g.hasExpired
                  ? { dot: 'bg-red-500', label: 'EXPIROVANÉ' }
                  : g.hasCritical
                    ? { dot: 'bg-orange-500', label: 'Do 2 mesiacov' }
                    : { dot: 'bg-green-500', label: 'OK' })
              : null

            return (
              <div key={g.key} className="border rounded-2xl p-4 bg-white">
                <button className="w-full text-left" onClick={() => setOpenKey(isOpen ? '' : g.key)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-bold truncate">{g.produkt_nazov}</div>
                      <div className="text-sm opacity-70 mt-1">
                        Spolu: <b>{g.totalQty} ks</b> · Najbližší EXP: <b>{g.nearestExp ? formatExp(g.nearestExp) : '—'}</b>
                      </div>
                      <div className="text-sm opacity-70 mt-1">
                        Cena spolu: <b>{g.valueKnown ? fmtEur(g.totalValue) : '—'}</b>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end">
                      {st ? (
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full ${st.dot}`} />
                          <div className="text-xs font-semibold">{st.label}</div>
                        </div>
                      ) : (
                        <div className="h-[14px]" />
                      )}
                      <div className="text-xs opacity-60 mt-2">{isOpen ? 'Skryť' : 'Detail'}</div>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-3">
                    {g.bySkladArr.map(sg => (
                      <div key={`${sg.sklad_id}:${sg.sklad_nazov}`} className="border rounded-xl p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{sg.sklad_nazov}</div>
                          <div className="text-sm">
                            <b>{sg.totalQty} ks</b> · EXP <b>{sg.nearestExp ? formatExp(sg.nearestExp) : '—'}</b>
                          </div>
                        </div>

                        <div className="mt-2 space-y-2">
                          {sg.rows.map(r => {
                            const st2 = expStatus(r.expiracia)
                            const qty = Number(r.mnozstvo) || 0
                            const buy = Number(r.nakupna_cena)
                            const total = Number.isFinite(buy) ? Math.round(buy * qty * 100) / 100 : null

                            return (
                              <div key={r.id} className="border rounded-xl p-3 bg-white">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${st2.dot}`} />
                                      <div className="text-sm font-semibold">
                                        EXP {formatExp(r.expiracia) || '—'}
                                      </div>
                                    </div>
                                    <div className="text-xs opacity-70 mt-1">{st2.label}</div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div className="text-sm font-semibold">{qty} ks</div>
                                    <div className="flex flex-wrap items-center justify-end gap-3 mt-1">
                                      <button
                                        className="text-xs underline"
                                        onClick={() => openEdit(r)}
                                        title="Upraviť nákupnú cenu"
                                      >
                                        ✏️ Cena
                                      </button>
                                      <button
                                        className="text-xs underline"
                                        onClick={() => openMove(r)}
                                        title="Presunúť šaržu do iného skladu"
                                      >
                                        ↔ Presunúť
                                      </button>
                                      <button
                                        className="text-xs underline"
                                        onClick={() => openInv(r)}
                                        title="Inventúra šarže"
                                      >
                                        🧮 Inventúra
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-sm opacity-80 mt-2">
                                  Nákup: <b>{fmtEur(buy)}</b> / ks · Hodnota: <b>{total !== null ? fmtEur(total) : '—'}</b>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-[80]">
          <button className="absolute inset-0 bg-black/40" onClick={closeEdit} aria-label="Zavrieť" />
          <div className="absolute left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white border rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Upraviť nákupnú cenu</div>
              <button className="text-sm underline" onClick={closeEdit} disabled={editSaving}>Zavrieť</button>
            </div>

            <div className="text-sm opacity-70 mb-2">
              Zadaj cenu za kus (€/ks). Môžeš písať aj s čiarkou (napr. 2,30).
            </div>

            <input
              inputMode="decimal"
              className="w-full border rounded-xl px-3 py-3 text-lg"
              placeholder="napr. 2,30"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              disabled={editSaving}
            />

            {editErr && <div className="text-sm border rounded-xl p-2 mt-2 bg-white">{editErr}</div>}

            <button className="w-full border rounded-xl py-3 text-lg font-semibold mt-3" onClick={saveEdit} disabled={editSaving}>
              {editSaving ? 'Ukladám…' : 'Uložiť'}
            </button>
          </div>
        </div>
      )}

      {moveOpen && (
        <div className="fixed inset-0 z-[80]">
          <button className="absolute inset-0 bg-black/40" onClick={closeMove} aria-label="Zavrieť" />
          <div className="absolute left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white border rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Presunúť šaržu</div>
              <button className="text-sm underline" onClick={closeMove} disabled={moveSaving}>Zavrieť</button>
            </div>

            <div className="text-sm opacity-70">
              Produkt: <b>{moveRow?.produkty?.nazov ?? '—'}</b><br />
              Zo skladu: <b>{moveRow?.sklady?.nazov ?? '—'}</b><br />
              EXP: <b>{formatExp(moveRow?.expiracia) || '—'}</b> · Dostupné: <b>{Number(moveRow?.mnozstvo) || 0} ks</b>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold mb-1">Cieľový sklad</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={moveTargetSkladId}
                onChange={(e) => setMoveTargetSkladId(e.target.value)}
                disabled={moveSaving}
              >
                <option value="">— vyber —</option>
                {skladyList
                  .filter(s => Number(s.id) !== Number(moveRow?.sklady?.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.nazov}</option>
                  ))}
              </select>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold mb-1">Množstvo (ks)</div>
              <input
                inputMode="numeric"
                className="w-full border rounded-xl px-3 py-3 text-lg"
                placeholder="napr. 5"
                value={moveQty}
                onChange={(e) => setMoveQty(e.target.value.replace(/[^\d]/g, ''))}
                disabled={moveSaving}
              />
              <div className="text-xs opacity-60 mt-1">
                Tip: ak zadáš celé množstvo, šarža sa len “presunie”. Ak zadáš menej, šarža sa rozdelí.
              </div>
            </div>

            {moveErr && <div className="text-sm border rounded-xl p-2 mt-3 bg-white">{moveErr}</div>}

            <button className="w-full border rounded-xl py-3 text-lg font-semibold mt-3" onClick={saveMove} disabled={moveSaving}>
              {moveSaving ? 'Presúvam…' : 'Presunúť'}
            </button>
          </div>
        </div>
      )}

      {invOpen && (
        <div className="fixed inset-0 z-[80]">
          <button className="absolute inset-0 bg-black/40" onClick={closeInv} aria-label="Zavrieť" />
          <div className="absolute left-1/2 top-1/2 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white border rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Inventúra šarže</div>
              <button className="text-sm underline" onClick={closeInv} disabled={invSaving}>Zavrieť</button>
            </div>

            <div className="text-sm opacity-70">
              Produkt: <b>{invRow?.produkty?.nazov ?? '—'}</b><br />
              Sklad: <b>{invRow?.sklady?.nazov ?? '—'}</b><br />
              EXP: <b>{formatExp(invRow?.expiracia) || '—'}</b><br />
              Aktuálne v systéme: <b>{Number(invRow?.mnozstvo) || 0} ks</b>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold mb-1">Reálne množstvo (ks)</div>
              <input
                inputMode="numeric"
                className="w-full border rounded-xl px-3 py-3 text-lg"
                placeholder="napr. 5"
                value={invQty}
                onChange={(e) => setInvQty(e.target.value.replace(/[^\d]/g, ''))}
                disabled={invSaving}
              />
              <div className="text-xs opacity-60 mt-1">
                Ak zadáš 0, šarža sa deaktivuje a zmizne zo skladu.
              </div>
            </div>

            {invErr && <div className="text-sm border rounded-xl p-2 mt-3 bg-white">{invErr}</div>}

            <button className="w-full border rounded-xl py-3 text-lg font-semibold mt-3" onClick={saveInv} disabled={invSaving}>
              {invSaving ? 'Ukladám…' : 'Uložiť inventúru'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
