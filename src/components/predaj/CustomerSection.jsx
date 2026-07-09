export default function CustomerSection({
  zakaznici,
  zakaznikId,
  setZakaznikId,
  selectedCustomer,
  loadZakaznici,
  newCustOpen,
  setNewCustOpen,
  newNazov,
  setNewNazov,
  newTelefon,
  setNewTelefon,
  newEmail,
  setNewEmail,
  createCustomerQuick,
}) {
  return (
    <div className="space-y-2 mb-3">
      <div>
        <div className="text-sm font-semibold mb-1">Zákazník (karta) *</div>
        <select
          className="w-full border rounded-xl px-3 py-3 text-lg"
          value={zakaznikId}
          onChange={(e) => setZakaznikId(e.target.value)}
        >
          <option value="">— Vyber zákazníka —</option>
          {zakaznici.map(z => (
            <option key={z.id} value={z.id}>{z.nazov}</option>
          ))}
        </select>

        {selectedCustomer?.moze_kupit_expir && (
          <div className="text-xs border rounded-xl p-2 mt-2 bg-white">
            ✅ Tento zákazník môže kúpiť aj ručne vybrané expirované šarže.
          </div>
        )}

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
  )
}
