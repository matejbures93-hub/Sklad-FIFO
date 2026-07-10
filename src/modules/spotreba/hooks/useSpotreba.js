import { useEffect, useMemo, useState } from 'react'
import { filterProducts, loadProducts } from '../../../services/productService'
import { getBatchOptions, getStockForProduct } from '../../../services/stockService'
import { deleteSpotrebaDraft, finishSpotreba, loadRecentSpotreby, loadSpotrebaDraftItems, loadSpotrebaDrafts, loadSpotrebaUsers, saveSpotrebaDraft } from '../services/spotrebaService'

export default function useSpotreba() {
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [komuId, setKomuId] = useState('')
  const [products, setProducts] = useState([])
  const [produktId, setProduktId] = useState('')
  const [letter, setLetter] = useState('')
  const [query, setQuery] = useState('')
  const [stockRows, setStockRows] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [qty, setQty] = useState('')
  const [dovod, setDovod] = useState('')
  const [poznamka, setPoznamka] = useState('')
  const [cart, setCart] = useState([])
  const [drafts, setDrafts] = useState([])
  const [draftName, setDraftName] = useState('')
  const [draftOpen, setDraftOpen] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [recent, setRecent] = useState([])
  const selectedUser = useMemo(() => users.find(u => Number(u.id) === Number(komuId)) ?? null, [users, komuId])
  const filteredProducts = useMemo(() => filterProducts(products, letter, query), [products, letter, query])
  const batchOptions = useMemo(() => getBatchOptions(stockRows), [stockRows])
  const selectedBatch = useMemo(() => stockRows.find(r => Number(r.id) === Number(selectedBatchId)) ?? null, [stockRows, selectedBatchId])
  const totalBuy = useMemo(() => cart.reduce((s, i) => s + (i.nakupna_cena == null ? 0 : Number(i.nakupna_cena) * Number(i.qty)), 0), [cart])
  useEffect(() => { (async()=>{ try { const [u,p,d,r]=await Promise.all([loadSpotrebaUsers(),loadProducts(),loadSpotrebaDrafts(),loadRecentSpotreby()]); setUsers(u); setProducts(p); setDrafts(d); setRecent(r) } catch(e){ setMsg(e?.message ?? 'Chyba pri načítaní spotreby') } })() }, [])
  useEffect(() => { (async()=>{ setStockRows([]); setSelectedBatchId(''); if (!produktId) return; try { setStockRows(await getStockForProduct(produktId)) } catch(e){ setMsg(e?.message ?? 'Chyba pri načítaní šarží') } })() }, [produktId])
  const addToCart = () => {
    setMsg('')
    const amount=Number(qty)
    if (!selectedUser) return setMsg('Vyber, komu bolo vydané.')
    if (!produktId) return setMsg('Vyber produkt.')
    if (!selectedBatch) return setMsg('Ručne vyber šaržu / EXP.')
    if (!amount || amount<=0) return setMsg('Zadaj množstvo.')
    const available=Number(selectedBatch.mnozstvo)||0
    if (available<amount) return setMsg(`V zvolenej šarži je iba ${available} ks.`)
    const productName=products.find(p=>Number(p.id)===Number(produktId))?.nazov ?? '—'
    const skladName=selectedBatch.sklady?.nazov ?? `Sklad ${selectedBatch.sklad_id}`
    setCart(prev=>{
      const idx=prev.findIndex(i=>Number(i.zasoba_id)===Number(selectedBatch.id))
      if (idx>=0) { const next=[...prev]; const nq=Number(next[idx].qty)+amount; if(nq>available){setMsg(`V zvolenej šarži je iba ${available} ks.`); return prev} next[idx]={...next[idx],qty:nq}; return next }
      return [...prev,{produkt_id:Number(produktId),produkt_nazov:productName,zasoba_id:selectedBatch.id,sklad_id:selectedBatch.sklad_id,sklad_nazov:skladName,expiracia:selectedBatch.expiracia??null,qty:amount,nakupna_cena:selectedBatch.nakupna_cena==null?null:Number(selectedBatch.nakupna_cena)}]
    })
    setQty(''); setMsg('Pridané do spotreby ✅')
  }
  const removeItem=index=>setCart(prev=>prev.filter((_,i)=>i!==index))
  const resetForm=()=>{setProduktId('');setSelectedBatchId('');setStockRows([]);setQty('');setDovod('');setPoznamka('');setCart([]);setDraftName('');setCurrentDraftId(null)}
  const saveDraft=async()=>{setLoading(true);setMsg('');try{const id=await saveSpotrebaDraft({currentDraftId,nazov:draftName,komu:selectedUser,dovod,poznamka,cart});setCurrentDraftId(id);setDrafts(await loadSpotrebaDrafts());setDraftOpen(true);setMsg('Rozpracovaná spotreba uložená ✅')}catch(e){setMsg(e?.message??'Chyba pri ukladaní draftu spotreby')}finally{setLoading(false)}}
  const loadDraft=async draft=>{setLoading(true);setMsg('');try{setKomuId(String(draft.komu_zakaznik_id));setDovod(draft.dovod??'');setPoznamka(draft.poznamka??'');setCart(await loadSpotrebaDraftItems(draft.id));setDraftName(draft.nazov??'');setCurrentDraftId(draft.id);setDraftOpen(false);setProduktId('');setSelectedBatchId('');setMsg('Rozpracovaná spotreba načítaná ✅')}catch(e){setMsg(e?.message??'Chyba pri načítaní draftu spotreby')}finally{setLoading(false)}}
  const deleteDraft=async id=>{if(!window.confirm('Naozaj vymazať rozpracovanú spotrebu?'))return;setLoading(true);try{await deleteSpotrebaDraft(id);if(Number(currentDraftId)===Number(id)){setCurrentDraftId(null);setDraftName('')}setDrafts(await loadSpotrebaDrafts());setMsg('Rozpracovaná spotreba vymazaná ✅')}catch(e){setMsg(e?.message??'Chyba pri mazaní draftu spotreby')}finally{setLoading(false)}}
  const finish=async()=>{setLoading(true);setMsg('');try{await finishSpotreba({cart,komu:selectedUser,dovod,poznamka,currentDraftId});resetForm();setDrafts(await loadSpotrebaDrafts());setRecent(await loadRecentSpotreby());setMsg('Spotreba uložená a sklad odpočítaný ✅')}catch(e){setMsg(e?.message??'Chyba pri dokončení spotreby')}finally{setLoading(false)}}
  return {msg,loading,users,komuId,setKomuId,products,produktId,setProduktId,letters:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),letter,setLetter,query,setQuery,filteredProducts,stockRows,batchOptions,selectedBatchId,setSelectedBatchId,selectedBatch,qty,setQty,dovod,setDovod,poznamka,setPoznamka,cart,totalBuy,addToCart,removeItem,drafts,draftName,setDraftName,draftOpen,setDraftOpen,currentDraftId,saveDraft,loadDraft,deleteDraft,finish,recent}
}
