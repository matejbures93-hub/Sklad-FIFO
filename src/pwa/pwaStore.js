let updateSW = null

const listeners = new Set()

export function setPWAUpdateSW(fn) {
  updateSW = fn
}

export function getPWAUpdateSW() {
  return updateSW
}

export function emitPWAEvent(event) {
  for (const listener of listeners) {
    listener(event)
  }
}

export function subscribePWA(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function checkForPWAUpdate() {
  if (!('serviceWorker' in navigator)) return false

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false

  await registration.update()
  return true
}
