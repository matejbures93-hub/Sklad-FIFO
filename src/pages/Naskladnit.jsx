import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

function lastDayOfMonthISO(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return null
  const [y, m] = monthStr.split('-').map(Number)
  const last = new Date(y, m, 0)
  const yyyy = last.getFullYear()
  const mm = String(last.getMonth() + 1).padStart(2, '0')
  const dd = String(last.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function Naskladnit() {
  const [produkty, setProdukty] = useState([])
  const [sklady, setSklady] = useState([])

  const [produktId, setProduktId] = useState('')
  const [skladId, setSkladId] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [mnozstvo, setMnozstvo] = useState('')
  const [nakupnaCena, setNakupnaCena] = useState('')

  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // ✅ NOVÉ: zbaliteľný formulár
  const [showForm, setShowForm] = useState(false)

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear()
    const start = now - 2
    const count = 13 // -2..+10
    return Array.from({ length: count }, (_, i) => String(start + i))
  }, [])

  const load = async () => {
    setMsg('')
    const p = await supabase.from('produkty').select('id, nazov').order('nazov', { ascending: true })
    const s = await supabase.from('sklady').select('id, nazov').order('id', { ascending: true })
    if (p.error) return setMsg(p.error.message)
    if (s.error) return setMsg(s.error.message)
    setProdukty(p.data ?? [])
    setSklady(s.data ?? [])
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    setMsg('')

    const pid = Number(produktId)
    const sid = Number(skladId)
    const qty = Number(mnozstvo)
    const buy = Number(String(nakupnaCena).replace(',', '.'))

    if (!pid) return setMsg('Vyber produkt')
    if (!sid) return setMsg('Vyber sklad')
    if (!expMonth || !expYear) return setMsg('Vyber expiráciu (mesiac/rok)')
    if (!qty || qty <= 0) return setMsg('Zadaj množstvo (kladné číslo)')
    if (!buy || buy <= 0) return setMsg('Zadaj nákupnú cenu (€/ks)')

    const norm = `${expYear}-${expMonth}`
    const expiracia = lastDayOfMonthISO(norm)
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

      // reset polí
      setProduktId('')
      setSkladId('')
      setExpMonth('')
      setExpYear('')
      setMnozstvo('')
      setNakupnaCena('')

      // ✅ NOVÉ: po uložení formulár zavri
      setShowForm(false)

      setMsg('Naskladnené ✅')
    } catch (e) {
      setMsg(e?.message ?? 'Chyba pri ukladaní')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Naskladniť</h1>
        <button className="text-sm underline" onClick={load}>Obnoviť</button>
      </div>

      {msg && <div className="text-sm border rounded-xl p-2 mb-3 bg-white">{msg}</div>}

      {/* ✅ NOVÉ: tlačidlo na zbalenie/rozbalenie */}
      <button
        className="w-full border rounded-xl py-3 font-semibold bg-white"
        onClick={() => setShowForm(v => !v)}
      >
        {showForm ? '➖ Skryť formulár' : '➕ Naskladniť produkt'}
      </button>

      {/* ✅ NOVÉ: formulár sa zobrazí len keď showForm=true */}
      {showForm && (
        <div className="mt-3 border rounded-xl p-4 bg-white">
          <div className="space-y-3">
            <div>
              <div className="text-base font-semibold mb-1">Produkt</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={produktId}
                onChange={(e) => setProduktId(e.target.value)}
              >
                <option value="">Vyber…</option>
                {produkty.map(p => <option key={p.id} value={p.id}>{p.nazov}</option>)}
              </select>
            </div>

            <div>
              <div className="text-sm font-semibold mb-1">Sklad</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={skladId}
                onChange={(e) => setSkladId(e.target.value)}
              >
                <option value="">Vyber…</option>
                {sklady.map(s => <option key={s.id} value={s.id}>{s.nazov}</option>)}
              </select>
            </div>

            <div>
              <div className="text-sm font-semibold mb-1">Expirácia (mesiac/rok)</div>
              <div className="flex gap-2">
                <select
                  className="flex-1 border rounded-xl px-3 py-2"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                >
                  <option value="">Mesiac…</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select
                  className="flex-1 border rounded-xl px-3 py-2"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                >
                  <option value="">Rok…</option>
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs opacity-70 mt-1">
                Ukladá sa ako posledný deň mesiaca (kvôli FEFO).
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold mb-1">Množstvo (ks)</div>
              <input
                inputMode="numeric"
                className="w-full border rounded-xl px-3 py-2"
                placeholder="napr. 120"
                value={mnozstvo}
                onChange={(e) => setMnozstvo(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>

            <div>
              <div className="text-sm font-semibold mb-1">Nákupná cena (€/ks)</div>
              <input
                inputMode="decimal"
                className="w-full border rounded-xl px-3 py-2"
                placeholder="napr. 2,30"
                value={nakupnaCena}
                onChange={(e) => setNakupnaCena(e.target.value)}
              />
            </div>

            <button
              className="w-full border rounded-xl py-3 font-semibold"
              onClick={submit}
              disabled={loading}
            >
              {loading ? 'Ukladám…' : 'Uložiť'}
            </button>
          </div>
        </div>
      )}

      {/* miesto pre históriu */}
      <div className="mt-4 border rounded-xl p-4 bg-white">
        <div className="text-base font-semibold">História naskladnenia</div>
        <div className="text-sm opacity-70 mt-1">
          (Ďalší krok: napojíme sem výpis posledných naskladnení.)
        </div>
      </div>
    </div>
  )
}
