import { Routes, Route, Outlet } from 'react-router-dom'
import RequireAuth from '../components/RequireAuth'
import TopMenu from '../components/TopMenu'
import Login from '../pages/Login'

import Predaj from '../pages/Predaj.jsx'
import Zakaznici from '../pages/Zakaznici.jsx'
import Produkty from '../pages/Produkty.jsx'
import Naskladnit from '../pages/Naskladnit.jsx'
import Historia from '../pages/Historia.jsx'
import Sklad from '../pages/Sklad.jsx'

function AuthedLayout() {
  return (
    <div>
      <TopMenu />

      {/* obsah: na mobile odsadenie zhora kvôli hamburgeru,
         na desktope odsadenie zľava kvôli ľavému menu */}
      <div className="pt-16 lg:pt-0 lg:ml-64">
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth><AuthedLayout /></RequireAuth>}>
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