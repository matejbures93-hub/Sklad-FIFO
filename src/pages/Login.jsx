import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signIn } from '../app/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  const navigate = useNavigate()
  const location = useLocation()

  // správa z RequireAuth (napr. nepovolený účet)
  const authError = location.state?.authError || ''

  const submit = async (e) => {
    e.preventDefault()
    setMsg('')

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/')
    } catch (err) {
      setMsg(err?.message ?? 'Chyba pri prihlásení')
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-3">Prihlásenie</h1>

      {/* hláška z bezpečnostného bloku */}
      {authError && (
        <div className="text-sm border rounded-xl p-3 mb-3 bg-white">
          {authError}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Heslo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {msg && (
          <div className="text-sm border rounded-xl p-2">
            {msg}
          </div>
        )}

        <button className="w-full border rounded-xl py-2 font-semibold">
          Prihlásiť sa
        </button>
      </form>
    </div>
  )
}