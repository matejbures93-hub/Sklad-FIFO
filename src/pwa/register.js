import { registerSW } from 'virtual:pwa-register'
import { emitPWAEvent, setPWAUpdateSW } from './pwaStore'

export function registerPWA() {
  const updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      emitPWAEvent({ type: 'need-refresh' })
    },

    onOfflineReady() {
      emitPWAEvent({ type: 'offline-ready' })
    },

    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      registration.update()

      setInterval(() => {
        registration.update()
      }, 5 * 60 * 1000)
    },
  })

  setPWAUpdateSW(updateSW)
}
