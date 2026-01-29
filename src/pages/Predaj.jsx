import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

function formatExp(exp) {
  if (!exp) return ''
  const [y, m] = exp.split('-')
  return `${m}/${y}`
}

function parseEur(s) {
  const n = Number(String(s ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

function round2(n) {
  return Math.round(n * 100) / 100
}

export default function Predaj() {
  const [produkty, setProdukty] = useState([])
  const [produktId, setProduktId] = useState('')

  const [stockRows, setStockRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // predajka
  const [komu, setKomu] = useState('')
  const [cenaKs, setCenaKs] = useState('')
  const [qtyInput, setQtyInput] = useState('')

  // sklad výber (default odporúčaný)
  const [overrideSkladId, setOverrideSkladId] = useState('')

  // košík
  const [cart, setCart] = useState([])

  // ZÁKAZNÍCI
  const [zakaznici, setZakaznici] = useState([])
  const [zakaznikId, setZakaznikId] = useState('') // vybraný zákazník (id)

  // rýchly nový zákazník pri predaji
  const [newCustOpen, setNewCustOpen] = useState(false)
  const [newNazov, setNewNazov] = useState('')
  const [newTelefon, setNewTelefon] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const loadProdukty = async () => {
    setMsg('')
    const p = await supabase.from('produkty').select('id, nazov').order('nazov', { ascending: true })
    if (p.error) return setMsg(p.error.message)
    setProdukty(p.data ?? [])
  }

  const loadZakaznici = async () => {
    const z = await supabase.from('zakaznici').select('id, nazov').order('nazov', { ascending: true })
    if (!z.error) setZakaznici(z.data ?? [])
  }

  const loadStock = async () => {
    setMsg('')
    setStockRows([])
    setOverrideSkladId('')
    const pid = Number(produktId)
    if (!pid) return

    const { data, error } = await supabase
      .from('zasoby')
      .select('id, sklad_id, expiracia, mnozstvo, aktivne, sklady(nazov), produkty(nazov)')
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
  }, [])
  useEffect(() => { loadStock() }, [produktId])

  // zoskup podľa skladu pre vybraný produkt
  const skladSummary = useMemo(() => {
    const map = new Map()
    for (const r of stockRows) {
      const sid = r.sklad_id
      if (!map.has(sid)) {
        map.set(sid, {
          sklad_id: sid,
          sklad_nazov: r.sklady?.nazov ?? `Sklad ${sid}`,
          total: 0,
          nearestExp: r.expiracia ?? null,
          produkt_nazov: r.produkty?.nazov ?? '',
        })
      }
      const g = map.get(sid)
      g.total += Number(r.mnozstvo) || 0
      if (!g.nearestExp || (r.expiracia && r.expiracia < g.nearestExp)) g.nearestExp = r.expiracia
    }
    return Array.from(map.values()).sort((a, b) => a.sklad_id - b.sklad_id)
  }, [stockRows])

  const recommended = useMemo(() => {
    if (!skladSummary.length) return null
    let best = skladSummary[0]
    for (const g of skladSummary) {
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

  const addToCart = (qty) => {
    setMsg('')
    const pid = Number(produktId)
    const q = Number(qty)
    const price = parseEur(cenaKs)

    if (!komu.trim()) return setMsg('Zadaj komu bolo predané (predajka)')
    if (!pid) return setMsg('Vyber produkt')
    if (!chosenSklad?.sklad_id) return setMsg('Nie je dostupný sklad pre tento produkt')
    if (!q || q <= 0) return setMsg('Zadaj množstvo')
    if (!price || price <= 0) return setMsg('Zadaj cenu (€/ks)')

    const available = Number(chosenSklad.total) || 0
    if (available < q) return setMsg(`Nedostatok na sklade. Dostupné v "${chosenSklad.sklad_nazov}": ${available} ks.`)

    const produktNazov = produkty.find(p => Number(p.id) === pid)?.nazov ?? '—'
    const suma = round2(price * q)

    setCart(prev => {
      const idx = prev.findIndex(i =>
        i.produkt_id === pid &&
        i.sklad_id === chosenSklad.sklad_id &&
        Number(i.cena_ks) === Number(price)
      )
      if (idx >= 0) {
        const next = [...prev]
        const newQty = Number(next[idx].qty) + q
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
          sklad_id: chosenSklad.sklad_id,
          sklad_nazov: chosenSklad.sklad_nazov,
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
    const list = data ?? []

    const available = list.reduce((sum, r) => sum + (Number(r.mnozstvo) || 0), 0)
    if (available < qty) throw new Error(`Nedostatok na sklade (Sklad ${sid}). Dostupné: ${available} ks, chceš: ${qty} ks.`)

    let remaining = qty
    for (const r of list) {
      if (remaining <= 0) break
      const have = Number(r.mnozstvo) || 0
      const take = Math.min(have, remaining)
      const newQty = have - take
      remaining -= take

      const patch = { mnozstvo: newQty, aktivne: newQty > 0 }
      const upd = await supabase.from('zasoby').update(patch).eq('id', r.id)
      if (upd.error) throw upd.error
    }
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
        .select('id, nazov')
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
    if (!komu.trim()) return setMsg('Zadaj komu bolo predané')
    if (cart.length === 0) return setMsg('Košík je prázdny')

    setLoading(true)
    try {
      const { data: sess, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw sessErr
      const user = sess?.session?.user

      // vybraný zákazník (voliteľné)
      const zid = Number(zakaznikId) || null

      // 1) vytvor hlavičku predajky + zakaznik_id
      const insHead = await supabase
        .from('predajky')
        .insert({
          komu: komu.trim(),
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

      // 2) pre každú položku: FEFO odpočet + insert položky
      for (const item of cart) {
        await fefoDeduct(item.produkt_id, item.sklad_id, item.qty)

        const insItem = await supabase.from('predajky_polozky').insert({
          predajka_id: predajkaId,
          produkt_id: item.produkt_id,
          sklad_id: item.sklad_id,
          mnozstvo: item.qty,
          cena_ks: item.cena_ks,
          suma: item.suma,
        })
        if (insItem.error) throw insItem.error
      }

      setCart([])
      setProduktId('')
      setOverrideSkladId('')
      setQtyInput('')
      setCenaKs('')
      setZakaznikId('')
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
        <button className="text-sm underline" onClick={loadStock}>Obnoviť</button>
      </div>

      {msg && <div className="text-base border rounded-xl p-3 mb-3">{msg}</div>}

      {/* Predajka údaje */}
      <div className="space-y-2 mb-3">
        <div>
          <div className="text-sm font-semibold mb-1">Komu bolo predané</div>
          <input
            className="w-full border rounded-xl px-3 py-3 text-lg"
            placeholder="napr. Ján Novák / Firma..."
            value={komu}
            onChange={(e) => setKomu(e.target.value)}
          />
        </div>

        <div>
          <div className="text-sm font-semibold mb-1">Zákazník (karta)</div>
          <select
            className="w-full border rounded-xl px-3 py-3 text-lg"
            value={zakaznikId}
            onChange={(e) => setZakaznikId(e.target.value)}
          >
            <option value="">— Nepriradiť (len text “komu”) —</option>
            {zakaznici.map(z => (
              <option key={z.id} value={z.id}>{z.nazov}</option>
            ))}
          </select>

          <div className="flex items-center justify-between mt-2">
            <button className="text-sm underline" onClick={loadZakaznici}>Obnoviť zákazníkov</button>
            <button className="text-sm underline" onClick={() => setNewCustOpen(v => !v)}>
              {newCustOpen ? 'Zrušiť' : '+ Nový zákazník'}
            </button>
          </div>

          {newCustOpen && (
            <div className="border rounded-xl p-3 mt-2 space-y-2">
              <div className="text-sm font-semibold">Rýchlo pridať zákazníka</div>
              <input
                className="w-full border rounded-xl px-3 py-3 text-lg"
                placeholder="Názov / Meno*"
                value={newNazov}
                onChange={(e) => setNewNazov(e.target.value)}
              />
              <input
                className="w-full border rounded-xl px-3 py-3 text-lg"
                placeholder="Telefón (voliteľné)"
                value={newTelefon}
                onChange={(e) => setNewTelefon(e.target.value)}
              />
              <input
                className="w-full border rounded-xl px-3 py-3 text-lg"
                placeholder="Email (voliteľné)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <button className="w-full border rounded-xl py-3 text-lg font-semibold" onClick={createCustomerQuick}>
                Uložiť zákazníka
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Výber produktu */}
      <div className="space-y-3">
        <div>
          <div className="text-base font-semibold mb-1">Produkt</div>
          <select
            className="w-full border rounded-xl px-3 py-3 text-lg"
            value={produktId}
            onChange={(e) => setProduktId(e.target.value)}
          >
            <option value="">Vyber…</option>
            {produkty.map(p => <option key={p.id} value={p.id}>{p.nazov}</option>)}
          </select>
        </div>

        <div>
          <div className="text-sm font-semibold mb-1">Cena (€/ks)</div>
          <input
            inputMode="decimal"
            className="w-full border rounded-xl px-3 py-3 text-lg"
            placeholder="napr. 3,90"
            value={cenaKs}
            onChange={(e) => setCenaKs(e.target.value)}
          />
        </div>

        {produktId && skladSummary.length > 0 && (
          <div className="border rounded-xl p-3">
            <div className="text-sm opacity-70">Sklad pre tento produkt</div>

            <div className="mt-2">
              <div className="text-sm font-semibold mb-1">Vybrať sklad (voliteľné)</div>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={overrideSkladId}
                onChange={(e) => setOverrideSkladId(e.target.value)}
              >
                <option value="">Odporúčaný (najbližší EXP)</option>
                {skladSummary.map(s => (
                  <option key={s.sklad_id} value={s.sklad_id}>
                    {s.sklad_nazov} — {s.total} ks — EXP {s.nearestExp ? formatExp(s.nearestExp) : '—'}
                  </option>
                ))}
              </select>
            </div>

            {chosenSklad && (
              <div className="mt-3">
                <div className="text-base font-semibold">{chosenSklad.sklad_nazov}</div>
                <div className="text-sm opacity-80">
                  Dostupné: <span className="font-semibold">{chosenSklad.total}</span> ks · Najbližší EXP: <span className="font-semibold">{chosenSklad.nearestExp ? formatExp(chosenSklad.nearestExp) : '—'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pridanie do košíka */}
        <div className="border rounded-xl p-3">
          <div className="text-base font-semibold mb-2">Pridať do predajky</div>

          <div className="grid grid-cols-2 gap-2">
            <button className="border rounded-xl py-3 text-lg font-semibold" onClick={() => addToCart(1)}>+1</button>
            <button className="border rounded-xl py-3 text-lg font-semibold" onClick={() => addToCart(5)}>+5</button>
          </div>

          <div className="flex gap-2 mt-2">
            <input
              inputMode="numeric"
              className="flex-1 border rounded-xl px-3 py-3 text-lg"
              placeholder="vlastné (ks)"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value.replace(/[^\d]/g, ''))}
            />
            <button className="border rounded-xl px-4 py-3 text-lg font-semibold" onClick={() => addToCart(qtyInput)}>
              Pridať
            </button>
          </div>

          <div className="text-xs opacity-60 mt-2">
            Tip: Predajka = košík. Pridaj viac produktov a potom klikni „Dokončiť predaj“.
          </div>
        </div>

        {/* Košík */}
        <div className="border rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">Predajka (košík)</div>
            <div className="text-base font-semibold">Spolu: {cartTotal.toFixed(2)} €</div>
          </div>

          {cart.length === 0 ? (
            <div className="text-sm opacity-70 mt-2">Zatiaľ prázdne.</div>
          ) : (
            <div className="space-y-2 mt-2">
              {cart.map((i, idx) => (
                <div key={idx} className="border rounded-xl p-3">
                  <div className="text-lg font-bold">{i.produkt_nazov}</div>
                  <div className="text-sm opacity-80">{i.sklad_nazov}</div>
                  <div className="text-base mt-1">
                    {i.qty} ks × {Number(i.cena_ks).toFixed(2)} € = <span className="font-semibold">{Number(i.suma).toFixed(2)} €</span>
                  </div>
                  <button className="text-sm underline mt-2" onClick={() => removeItem(idx)}>Odstrániť</button>
                </div>
              ))}
            </div>
          )}

          <button
            className="w-full border rounded-xl py-3 text-lg font-semibold mt-3"
            onClick={dokonciPredajku}
            disabled={loading}
          >
            {loading ? 'Ukladám…' : 'Dokončiť predaj'}
          </button>
        </div>
      </div>
    </div>
  )
}
