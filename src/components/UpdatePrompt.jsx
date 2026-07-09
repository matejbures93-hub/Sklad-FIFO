import { useEffect, useState } from 'react'
import { checkForPWAUpdate, getPWAUpdateSW, subscribePWA } from '../pwa/pwaStore'

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    return subscribePWA((event) => {
      if (event.type === 'need-refresh') setNeedRefresh(true)
      if (event.type === 'offline-ready') setOfflineReady(true)
    })
  }, [])

  const handleUpdate = () => {
    const updateSW = getPWAUpdateSW()
    if (updateSW) updateSW(true)
    else window.location.reload()
  }

  const handleManualCheck = async () => {
    setChecking(true)
    try {
      await checkForPWAUpdate()
      setTimeout(() => setChecking(false), 800)
    } catch (e) {
      setChecking(false)
    }
  }

  return (
    <>
      {needRefresh && (
        <div className="fixed bottom-20 left-3 right-3 z-[9999] max-w-md mx-auto">
          <div className="border rounded-2xl bg-white shadow-2xl p-4">
            <div className="text-base font-bold">🆕 Dostupná nová verzia</div>
            <div className="text-sm opacity-70 mt-1">
              Aplikácia má novú aktualizáciu. Klikni na aktualizovať, keď chceš načítať najnovšie zmeny.
            </div>

            <button
              className="w-full border rounded-xl py-3 font-semibold mt-3"
              onClick={handleUpdate}
            >
              Aktualizovať aplikáciu
            </button>

            <button
              className="w-full text-sm underline mt-3"
              onClick={() => setNeedRefresh(false)}
            >
              Neskôr
            </button>
          </div>
        </div>
      )}

      {!needRefresh && offlineReady && (
        <div className="fixed bottom-20 left-3 right-3 z-[9999] max-w-md mx-auto">
          <div className="border rounded-2xl bg-white shadow-2xl p-4">
            <div className="text-base font-bold">✅ Aplikácia je pripravená offline</div>
            <button
              className="w-full text-sm underline mt-3"
              onClick={() => setOfflineReady(false)}
            >
              Zavrieť
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="fixed bottom-3 right-3 z-[9998] border rounded-full bg-white shadow-lg px-3 py-2 text-xs"
        onClick={handleManualCheck}
        title="Skontrolovať aktualizáciu"
      >
        {checking ? 'Kontrolujem…' : '🔄 Update'}
      </button>
    </>
  )
}
