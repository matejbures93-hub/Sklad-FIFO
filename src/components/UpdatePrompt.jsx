import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState(null)

  useEffect(() => {
    const update = registerSW({
      immediate: true,

      onNeedRefresh() {
        setNeedRefresh(true)
      },

      onOfflineReady() {
        console.log('Aplikácia je pripravená offline')
      },

      onRegisteredSW(_swUrl, registration) {
        if (!registration) return

        setInterval(() => {
          registration.update()
        }, 5 * 60 * 1000)
      },
    })

    setUpdateSW(() => update)
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[9999] max-w-md mx-auto">
      <div className="border rounded-2xl bg-white shadow-2xl p-4">
        <div className="text-base font-bold">🆕 Dostupná nová verzia</div>
        <div className="text-sm opacity-70 mt-1">
          Aplikácia má novú aktualizáciu. Klikni na aktualizovať, keď chceš načítať najnovšie zmeny.
        </div>

        <button
          className="w-full border rounded-xl py-3 font-semibold mt-3"
          onClick={() => updateSW?.(true)}
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
  )
}