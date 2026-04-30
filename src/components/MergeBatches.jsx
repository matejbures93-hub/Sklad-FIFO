import { useState } from 'react'
import { supabase } from '../services/supabase'

function fmtEur(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${n.toFixed(2)} €`
}

export default function MergeBatches({ skladyList, onDone }) {
  const [skladId, setSkladId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const merge = async () => {
    setMsg('')

    const sid = Number(skladId)
    if (!sid) return setMsg('Vyber sklad.')

    const skladName = skladyList.find(s => Number(s.id) === sid)?.nazov ?? `Sklad ${sid}`

    const ok = window.confirm(
      `Naozaj zlúčiť duplicitné šarže v sklade "${skladName}"?\n\n` +
      `Zlučujú sa iba rovnaké položky:\n` +
      `produkt + sklad + EXP + nákupná cena.`
    )

    if (!ok) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('zasoby')
        .select('id, produkt_id, sklad_id, expiracia, mnozstvo, nakupna_cena, aktivne')
        .eq('sklad_id', sid)
        .eq('aktivne', true)
        .gt('mnozstvo', 0)
        .order('produkt_id', { ascending: true })
        .order('expiracia', { ascending: true })
        .order('nakupna_cena', { ascending: true })
        .order('id', { ascending: true })

      if (error) throw error

      const rows = data ?? []
      const groups = new Map()

      for (const r of rows) {
        const key = [
          r.produkt_id ?? 'x',
          r.sklad_id ?? 'x',
          r.expiracia ?? '',
          r.nakupna_cena === null || r.nakupna_cena === undefined ? '' : Number(r.nakupna_cena).toFixed(2),
        ].join('|')

        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(r)
      }

      const duplicates = Array.from(groups.values()).filter(g => g.length > 1)

      if (duplicates.length === 0) {
        setMsg('Žiadne duplicitné šarže na zlúčenie.')
        return
      }

      let mergedGroups = 0
      let disabledRows = 0

      for (const group of duplicates) {
        const keep = group[0]
        const totalQty = group.reduce((sum, r) => sum + (Number(r.mnozstvo) || 0), 0)
        const removeIds = group.slice(1).map(r => r.id)

        const updKeep = await supabase
          .from('zasoby')
          .update({ mnozstvo: totalQty, aktivne: totalQty > 0 })
          .eq('id', keep.id)

        if (updKeep.error) throw updKeep.error

        const updRemove = await supabase
          .from('zasoby')
          .update({ mnozstvo: 0, aktivne: false })
          .in('id', removeIds)

        if (updRemove.error) throw updRemove.error

        mergedGroups += 1
        disabledRows += removeIds.length
      }

      setMsg(`Zlúčené ✅ Skupiny: ${mergedGroups}, deaktivované riadky: ${disabledRows}`)
      onDone?.()
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri zlúčení šarží')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-2xl bg-white shadow-sm p-3 mb-3">
      <div className="text-sm font-semibold mb-2">Zlúčenie šarží</div>

      <select
        className="w-full border rounded-xl px-3 py-2"
        value={skladId}
        onChange={(e) => setSkladId(e.target.value)}
        disabled={loading}
      >
        <option value="">Vyber sklad</option>
        {skladyList.map(s => (
          <option key={s.id} value={s.id}>{s.nazov}</option>
        ))}
      </select>

      <button
        className="w-full border rounded-xl py-2 mt-2 font-semibold"
        onClick={merge}
        disabled={loading}
      >
        {loading ? 'Zlučujem…' : 'Zlúčiť duplicitné šarže'}
      </button>

      <div className="text-xs opacity-60 mt-2">
        Zlúči iba rovnaký produkt, sklad, EXP a nákupnú cenu.
      </div>

      {msg && (
        <div className="text-sm border rounded-xl p-2 mt-3 bg-white">
          {msg}
        </div>
      )}
    </div>
  )
}