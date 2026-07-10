import { useEffect, useMemo, useState } from 'react'
import { getReservations } from '../services/reservations.service'
import { getAvailableStockRows, getBatchOptions, getChosenSklad, getRecommendedSklad, getReservedByZasoba, getSelectedBatch, getSkladSummary, getStockForProduct } from '../services/stockService'

export default function useStock({ produktId, currentDraftId, setMsg }) {
  const [stockRows, setStockRows] = useState([])
  const [reservations, setReservations] = useState([])
  const [overrideSkladId, setOverrideSkladId] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState('')

  const loadReservations = async () => {
    try { setReservations(await getReservations()) }
    catch (e) { setMsg(e?.message ?? 'Chyba pri načítaní rezervácií') }
  }

  const loadStock = async () => {
    setMsg('')
    setStockRows([])
    setOverrideSkladId('')
    setSelectedBatchId('')
    try { setStockRows(await getStockForProduct(produktId)) }
    catch (e) { setMsg(e?.message ?? 'Chyba pri načítaní skladu') }
  }

  useEffect(() => { loadReservations() }, [])
  useEffect(() => { loadStock() }, [produktId])

  const reservedByZasoba = useMemo(() => getReservedByZasoba(reservations, currentDraftId), [reservations, currentDraftId])
  const availableStockRows = useMemo(() => getAvailableStockRows(stockRows, reservedByZasoba), [stockRows, reservedByZasoba])
  const batchOptions = useMemo(() => getBatchOptions(availableStockRows), [availableStockRows])
  const selectedBatch = useMemo(() => getSelectedBatch(availableStockRows, selectedBatchId), [selectedBatchId, availableStockRows])
  const skladSummary = useMemo(() => getSkladSummary(availableStockRows), [availableStockRows])
  const recommended = useMemo(() => getRecommendedSklad(skladSummary), [skladSummary])
  const chosenSklad = useMemo(() => getChosenSklad(skladSummary, overrideSkladId, recommended), [overrideSkladId, recommended, skladSummary])

  const resetStockSelection = () => { setOverrideSkladId(''); setSelectedBatchId('') }
  const refreshStock = async () => { await Promise.all([loadStock(), loadReservations()]) }

  return { stockRows: availableStockRows, overrideSkladId, setOverrideSkladId, selectedBatchId, setSelectedBatchId, batchOptions, selectedBatch, skladSummary, chosenSklad, loadStock, loadReservations, refreshStock, resetStockSelection }
}
