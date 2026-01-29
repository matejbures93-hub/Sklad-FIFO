import { NavLink } from 'react-router-dom'

export default function TopMenu() {
  const linkStyle = ({ isActive }) => ({
    display: 'block',           // kľúč: každý link na nový riadok
    textDecoration: 'underline',
    color: 'purple',
    fontWeight: isActive ? '700' : '400',
    marginBottom: '8px',
    fontSize: '20px',
  })

  return (
    <nav style={{ padding: '16px' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        <li>
          <NavLink to="/" end style={linkStyle}>⚡ Predaj</NavLink>
        </li>
        <li>
          <NavLink to="/zakaznici" style={linkStyle}>👥 Zákazníci</NavLink>
        </li>
        <li>
          <NavLink to="/produkty" style={linkStyle}>📦 Produkty</NavLink>
        </li>
        <li>
          <NavLink to="/naskladnit" style={linkStyle}>➕ Naskladniť</NavLink>
        </li>
        <li>
          <NavLink to="/historia" style={linkStyle}>🕒 História</NavLink>
        </li>
        <li>
          <NavLink to="/sklad" style={linkStyle}>🏬 Sklad</NavLink>
        </li>
      </ul>
    </nav>
  )
}