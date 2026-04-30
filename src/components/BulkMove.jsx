import { useState } from 'react'
import { supabase } from '../services/supabase'

export default function BulkMove({ skladyList, onDone }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMove = async () => {
    if (!from || !to) return alert('Vyber oba sklady')
    if (from === to) return alert('Sklady musia byť rozdielne')

    if (!confirm('Naozaj presunúť všetky zásoby?')) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('zasoby')
        .update({ sklad_id: Number(to) })
        .eq('sklad_id', Number(from))
        .eq('aktivne', true)
        .gt('mnozstvo', 0)

      if (error) throw error

      alert('Presunuté ✅')
      onDone?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-2xl bg-white shadow-sm p-3 mb-3">
      <div className="text-sm font-semibold mb-2">Hromadný presun skladu</div>

      <div className="flex gap-2">
        <select
          className="flex-1 border rounded-xl px-3 py-2"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        >
          <option value="">Zo skladu</option>
          {skladyList.map(s => (
            <option key={s.id} value={s.id}>{s.nazov}</option>
          ))}
        </select>

        <select
          className="flex-1 border rounded-xl px-3 py-2"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        >
          <option value="">Do skladu</option>
          {skladyList.map(s => (
            <option key={s.id} value={s.id}>{s.nazov}</option>
          ))}
        </select>
      </div>

      <button
        className="w-full border rounded-xl py-2 mt-2 font-semibold"
        onClick={handleMove}
        disabled={loading}
      >
        {loading ? 'Presúvam…' : 'Presunúť všetko'}
      </button>
    </div>
  )
}