import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

function lastDayOfMonthISO(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return null
  const [y, m] = monthStr.split('-').map(Number)
  const last = new Date(y, m, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

export default function Naskladnit() {
  const [produkty, setProdukty] = useState([])
  const [sklady, setSklady] = useState([])

  const [letter, setLetter] = useState('') // 🔠 písmeno
  const [produktId, setProduktId] = useState('')
  const [skladId, setSkladId] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [mnozstvo, setMnozstvo] = useState('')
  const [nakupnaCena, setNakupnaCena] = useState('')

  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: 13 }, (_, i) => String(now - 2 + i))
  }, [])

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  const load = async () => {
    const p = await supabase.from('produkty').select('id, nazov').order('nazov')
    const s = await supabase.from('sklady').select('id, nazov').order('id')
    if (p.error) return setMsg(p.error.message)
    if (s.error) return setMsg(s.error.message)
    setProdukty(p.data ?? [])
    setSklady(s.data ?? [])
  }

  useEffect(() => { load() }, [])

  // 🔠 filtrované produkty podľa písmena
  const filteredProdukty = useMemo(() => {
    if (!letter) return produkty
    return produkty.filter(p =>
      (p.nazov ?? '').toUpperCase().startsWith(letter)
    )
  }, [produkty, letter])

  const submit = async () => {
    setMsg('')

    const pid = Number(produktId)
    const sid = Number(skladId)
    const qty = Number(mnozstvo)
    const buy = Number(String(nakupnaCena).replace(',', '.'))

    if (!pid) return setMsg('Vyber produkt')
    if (!sid) return setMsg('Vyber sklad')
    if (!expMonth || !expYear) return setMsg('Vyber expiráciu')
    if (!qty || qty <= 0) return setMsg('Zadaj množstvo')
    if (!buy || buy <= 0) return setMsg('Zadaj cenu')

    const expiracia = lastDayOfMonthISO(`${expYear}-${expMonth}`)
    if (!expiracia) return setMsg('Neplatná expirácia')

    setLoading(true)
    try {
      const { error } = await supabase.from('zasoby').insert({
        produkt_id: pid,
        sklad_id: sid,
        expiracia,
        mnozstvo: qty,
        nakupna_cena: buy,
        aktivne: true,
      })
      if (error) throw error

      // 🔥 TURBO reset – produkt + sklad OSTÁVAJÚ
      setExpMonth('')
      setExpYear('')
      setMnozstvo('')
      setNakupnaCena('')

      setMsg('Naskladnené ✅ môžeš pokračovať')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold mb-3">Naskladniť (TURBO)</h1>

      {msg && <div className="border rounded-xl p-2 mb-3 bg-white">{msg}</div>}

      {/* 🔠 výber písmena */}
      <div className="flex flex-wrap gap-1 mb-3">
        {letters.map(l => (
          <button
            key={l}
            className={`px-2 py-1 rounded-lg text-sm font-semibold border ${
              letter === l ? 'bg-black text-white' : 'bg-white'
            }`}
            onClick={() => {
              setLetter(l)
              setProduktId('')
            }}
          >
            {l}
          </button>
        ))}
        <button
          className="px-2 py-1 rounded-lg text-sm border"
          onClick={() => {
            setLetter('')
            setProduktId('')
          }}
        >
          ✕
        </button>
      </div>

      <div className="border rounded-xl p-4 bg-white space-y-3">
        <div>
          <div className="font-semibold mb-1">Produkt</div>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={produktId}
            onChange={e => setProduktId(e.target.value)}
          >
            <option value="">Vyber…</option>
            {filteredProdukty.map(p => (
              <option key={p.id} value={p.id}>{p.nazov}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="font-semibold mb-1">Sklad</div>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={skladId}
            onChange={e => setSkladId(e.target.value)}
          >
            <option value="">Vyber…</option>
            {sklady.map(s => (
              <option key={s.id} value={s.id}>{s.nazov}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <select className="flex-1 border rounded-xl px-3 py-2" value={expMonth} onChange={e => setExpMonth(e.target.value)}>
            <option value="">Mesiac</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select className="flex-1 border rounded-xl px-3 py-2" value={expYear} onChange={e => setExpYear(e.target.value)}>
            <option value="">Rok</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Množstvo (ks)"
          value={mnozstvo}
          onChange={e => setMnozstvo(e.target.value.replace(/[^\d]/g, ''))}
        />

        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Nákupná cena €/ks"
          value={nakupnaCena}
          onChange={e => setNakupnaCena(e.target.value)}
        />

        <button
          className="w-full border rounded-xl py-3 font-semibold"
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'Ukladám…' : 'Uložiť a pokračovať'}
        </button>
      </div>
    </div>
  )
}