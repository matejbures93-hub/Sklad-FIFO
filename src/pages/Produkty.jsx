import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

export default function Produkty() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [novy, setNovy] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // edit režim
  const [editId, setEditId] = useState(null)
  const [editValue, setEditValue] = useState('')

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

      const { error } = await supabase.from('produkty').insert({ nazov: name })
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

  const startEdit = (r) => {
    setMsg('')
    setEditId(r.id)
    setEditValue(r.nazov ?? '')
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    const id = Number(editId)
    const name = (editValue ?? '').trim()

    if (!id) return
    if (!name) return setMsg('Názov nemôže byť prázdny')

    setLoading(true)
    setMsg('')
    try {
      // kontrola duplicity (okrem aktuálneho produktu)
      const { data: exist, error: e1 } = await supabase
        .from('produkty')
        .select('id')
        .ilike('nazov', name)

      if (e1) throw e1
      const dup = (exist ?? []).some(x => Number(x.id) !== id)
      if (dup) throw new Error('Takýto produkt už existuje')

      const { error } = await supabase
        .from('produkty')
        .update({ nazov: name })
        .eq('id', id)

      if (error) throw error

      await load()
      cancelEdit()
      setMsg('Názov upravený ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Produkty</h1>
        <button className="text-sm underline" onClick={load}>Obnoviť</button>
      </div>

      <input
        className="w-full border rounded-xl px-3 py-2 mb-3"
        placeholder="Hľadať produkt…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="border rounded-xl p-3 mb-3 bg-white">
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

      {msg && <div className="text-sm border rounded-xl p-3 mb-3 bg-white">{msg}</div>}

      <div className="font-semibold mb-2">Zoznam</div>

      {filtered.length === 0 ? (
        <div className="text-sm opacity-70">Zatiaľ tu nič nie je.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const isEditing = Number(editId) === Number(r.id)

            return (
              <div key={r.id} className="border rounded-xl p-3 bg-white">
                {!isEditing ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-lg font-semibold">{r.nazov}</div>
                    <button
                      className="text-sm underline"
                      onClick={() => startEdit(r)}
                    >
                      Upraviť
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Upraviť názov</div>
                    <input
                      className="w-full border rounded-xl px-3 py-2"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                    />

                    <div className="flex gap-2">
                      <button
                        className="flex-1 border rounded-xl py-2 font-semibold"
                        onClick={saveEdit}
                        disabled={loading}
                      >
                        {loading ? 'Ukladám…' : 'Uložiť'}
                      </button>
                      <button
                        className="flex-1 border rounded-xl py-2"
                        onClick={cancelEdit}
                        disabled={loading}
                      >
                        Zrušiť
                      </button>
                    </div>

                    <div className="text-xs opacity-70">
                      Pozn.: zmena názvu sa prejaví všade (Predaj, Naskladniť, Sklad).
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}