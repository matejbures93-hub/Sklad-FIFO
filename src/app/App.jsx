import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'

import RequireAuth from '../components/RequireAuth'
import TopMenu from '../components/TopMenu'
import Login from '../pages/Login'

import Predaj from '../pages/Predaj.jsx'
import Zakaznici from '../pages/Zakaznici.jsx'
import Produkty from '../pages/Produkty.jsx'
import Naskladnit from '../pages/Naskladnit.jsx'
import Historia from '../pages/Historia.jsx'
import Sklad from '../pages/Sklad.jsx'

export default function App() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ĽAVÉ MENU */}
      <TopMenu />

      {/* HLAVNÝ OBSAH */}
      <div
        style={{
          flex: 1,
          paddingRight: 16,
          paddingLeft: isDesktop ? 0 : 64, // 👈 POSUN NA MOBILE (aby text nešiel pod ☰)
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<RequireAuth><Predaj /></RequireAuth>} />
          <Route path="/zakaznici" element={<RequireAuth><Zakaznici /></RequireAuth>} />
          <Route path="/produkty" element={<RequireAuth><Produkty /></RequireAuth>} />
          <Route path="/naskladnit" element={<RequireAuth><Naskladnit /></RequireAuth>} />
          <Route path="/historia" element={<RequireAuth><Historia /></RequireAuth>} />
          <Route path="/sklad" element={<RequireAuth><Sklad /></RequireAuth>} />
        </Routes>
      </div>
    </div>
  )
}