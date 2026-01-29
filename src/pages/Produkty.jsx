import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

export default function Produkty() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [novy, setNovy] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setMsg('')
    const { data, error } = await supabase
      .from('produkty')
      .select('id, nazov')
      .order('nazov', { ascending: true })

    if (error) return setMsg(error.message)
    setRows(data ?? [])
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r => (r.nazov ?? '').toLowerCase().includes(s))
  }, [rows, q])

  const add = async () => {
    const name = (novy ?? '').trim()
    if (!name) return setMsg('Zadaj názov produktu')

    setLoading(true)
    setMsg('')
    try {
      const { data: exist, error: e1 } = await supabase
        .from('produkty')
        .select('id')
        .ilike('nazov', name)
        .limit(1)

      if (e1) throw e1
      if (exist && exist.length) throw new Error('Takýto produkt už existuje')

      const { error } = await supabase
        .from('produkty')
        .insert({ nazov: name })

      if (error) throw error

      setNovy('')
      await load()
      setMsg('Produkt pridaný ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold mb-4">Produkty</h1>

      <input
        className="w-full border rounded-xl px-3 py-2 mb-3"
        placeholder="Hľadať produkt…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="border rounded-xl p-3 mb-3">
        <div className="font-semibold mb-2">➕ Pridať produkt</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-xl px-3 py-2"
            placeholder="Názov produktu"
            value={novy}
            onChange={(e) => setNovy(e.target.value)}
          />
          <button
            className="border rounded-xl px-3 py-2 font-semibold"
            onClick={add}
            disabled={loading}
          >
            {loading ? '…' : 'Uložiť'}
          </button>
        </div>
      </div>

      {msg && <div className="text-sm border rounded-xl p-2 mb-3">{msg}</div>}

      <div className="font-semibold mb-2">Zoznam</div>
      {filtered.length === 0 ? (
        <div className="text-sm opacity-70">Zatiaľ tu nič nie je.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="border rounded-xl p-3 text-lg font-semibold">
  {r.nazov}
</div>
          ))}
        </div>
      )}
    </div>
  )
}
