import { Routes, Route } from 'react-router-dom'
import RequireAuth from '../components/RequireAuth'
import VercelLayout from '../components/VercelLayout'
import Login from '../pages/Login'

import Predaj from '../pages/Predaj.jsx'
import Zakaznici from '../pages/Zakaznici.jsx'
import Produkty from '../pages/Produkty.jsx'
import Naskladnit from '../pages/Naskladnit.jsx'
import Historia from '../pages/Historia.jsx'
import Sklad from '../pages/Sklad.jsx'

export default function App() {
  return (
    <Routes>
      {/* Login bez menu */}
      <Route path="/login" element={<Login />} />

      {/* Všetko ostatné je v Layoute + vyžaduje login */}
      <Route
        element={
          <RequireAuth>
            <VercelLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Predaj />} />
        <Route path="/zakaznici" element={<Zakaznici />} />
        <Route path="/produkty" element={<Produkty />} />
        <Route path="/naskladnit" element={<Naskladnit />} />
        <Route path="/historia" element={<Historia />} />
        <Route path="/sklad" element={<Sklad />} />
      </Route>
    </Routes>
  )
}