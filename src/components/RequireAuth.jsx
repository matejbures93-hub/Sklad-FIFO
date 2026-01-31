import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'

// ✅ sem daj povolené emaily (malé písmená)
const ALLOWED_EMAILS = [
  'matej.bures.93@gmail.com',
  'valkasro@gmail.com',
].map(e => e.toLowerCase())

export default function RequireAuth({ children }) {
  const [checking, setChecking] = useState(true)
  const [ok, setOk] = useState(false)
  const [reason, setReason] = useState('')
  const location = useLocation()

  useEffect(() => {
    let alive = true

    const run = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!alive) return

      const session = data?.session
      const email = (session?.user?.email ?? '').toLowerCase()

      if (error || !session) {
        setOk(false)
        setChecking(false)
        return
      }

      // ✅ whitelist kontrola
      if (!ALLOWED_EMAILS.includes(email)) {
        setOk(false)
        setReason('Tento účet nemá povolený prístup do aplikácie.')
        setChecking(false)
        return
      }

      setOk(true)
      setChecking(false)
    }

    run()
    return () => { alive = false }
  }, [])

  if (checking) return null

  // ak nie je ok, pošli na login (a pribal správu)
  if (!ok) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          authError: reason || undefined,
        }}
      />
    )
  }

  return children
}