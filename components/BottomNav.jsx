import { NavLink } from 'react-router-dom'

const Item = ({ to, label, icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex-1 py-2 text-center ${isActive ? 'font-semibold' : ''}`
    }
  >
    <div>{icon}</div>
    <div className="text-xs">{label}</div>
  </NavLink>
)

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t bg-white">
      <div className="max-w-md mx-auto flex">
        <Item to="/" label="Sklad" icon="🏠" />
        <Item to="/predaj" label="Predaj" icon="⚡" />
        <Item to="/produkty" label="Produkty" icon="🧾" />
        <Item to="/naskladnit" label="Naskladniť" icon="➕" />
        <Item to="/historia" label="História" icon="📊" />
      </div>
    </nav>
  )
}
