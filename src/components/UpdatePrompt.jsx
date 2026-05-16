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
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return

        const interval = setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)

        return () => clearInterval(interval)
      },
    })

    setUpdateSW(() => update)
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[9999] max-w-md mx-auto">
      <div className="border rounded-2xl bg-white shadow-2xl p-4">
        <div className="font-bold">🔄 Dostupná nová verzia</div>
        <div className="text-sm opacity-70 mt-1">
          Klikni na aktualizovať a appka načíta najnovšie zmeny.
        </div>

        <button
          className="w-full border rounded-xl py-3 font-semibold mt-3"
          onClick={() => updateSW?.(true)}
        >
          Aktualizovať appku
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