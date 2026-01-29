import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'

export default function RequireAuth({ children }) {
  const [checking, setChecking] = useState(true)
  const [ok, setOk] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let alive = true

    const run = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!alive) return
      setOk(!error && !!data?.session)
      setChecking(false)
    }

    run()
    return () => {
      alive = false
    }
  }, [])

  if (checking) return null
  if (!ok) return <Navigate to="/login" replace state={{ from: location }} />

  return children
}