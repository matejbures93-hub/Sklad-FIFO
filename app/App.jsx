import { Routes, Route } from 'react-router-dom'
import RequireAuth from '../components/RequireAuth'
import BottomNav from '../components/BottomNav'
import Login from '../pages/Login'
import Sklad from '../pages/Sklad'
import Predaj from '../pages/Predaj'
import Naskladnit from '../pages/Naskladnit'
import Historia from '../pages/Historia'
import Produkty from '../pages/Produkty'

export default function App() {
  return (
    <div className="pb-16">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<RequireAuth><Sklad /></RequireAuth>} />
        <Route path="/predaj" element={<RequireAuth><Predaj /></RequireAuth>} />
        <Route path="/produkty" element={<RequireAuth><Produkty /></RequireAuth>} />
        <Route path="/naskladnit" element={<RequireAuth><Naskladnit /></RequireAuth>} />
        <Route path="/historia" element={<RequireAuth><Historia /></RequireAuth>} />
      </Routes>

      <BottomNav />
    </div>
  )
}
