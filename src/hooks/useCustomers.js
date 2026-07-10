import { useEffect, useMemo, useState } from 'react'
import { canCustomerBuyExpired, createCustomer, findCustomerById, loadCustomers, sortCustomers } from '../services/customerService'

export default function useCustomers(setMsg) {
  const [zakaznici, setZakaznici] = useState([])
  const [zakaznikId, setZakaznikId] = useState('')
  const [newCustOpen, setNewCustOpen] = useState(false)
  const [newNazov, setNewNazov] = useState('')
  const [newTelefon, setNewTelefon] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const loadZakaznici = async () => {
    try { setZakaznici(await loadCustomers()) }
    catch (e) { setMsg(e?.message ?? 'Chyba pri načítaní zákazníkov') }
  }

  useEffect(() => { loadZakaznici() }, [])

  const selectedCustomer = useMemo(
    () => findCustomerById(zakaznici, zakaznikId),
    [zakaznikId, zakaznici]
  )
  const canBuyExpired = canCustomerBuyExpired(selectedCustomer)

  const createCustomerQuick = async () => {
    setMsg('')
    try {
      const created = await createCustomer({ nazov: newNazov, telefon: newTelefon, email: newEmail })
      setZakaznici(prev => sortCustomers([...(prev ?? []), created]))
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

  return { zakaznici, zakaznikId, setZakaznikId, selectedCustomer, canBuyExpired, loadZakaznici, newCustOpen, setNewCustOpen, newNazov, setNewNazov, newTelefon, setNewTelefon, newEmail, setNewEmail, createCustomerQuick }
}
