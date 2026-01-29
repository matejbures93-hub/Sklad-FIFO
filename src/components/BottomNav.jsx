import { Routes, Route } from 'react-router-dom'
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
  return (
    <div>
      <TopMenu />

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
  )
}