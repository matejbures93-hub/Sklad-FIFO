import { NavLink, Outlet, useLocation } from 'react-router-dom'

export default function VercelLayout() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  const linkStyle = (active) => ({
    display: 'block',
    textDecoration: 'underline',
    color: '#5b21b6',
    fontWeight: active ? '700' : '400',
    marginBottom: '14px',
    fontSize: '26px',
    lineHeight: '1.1',
  })

  const iconStyle = {
    display: 'inline-block',
    width: '34px',
    marginRight: '10px',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '24px',
        padding: '12px',
        height: '100vh',        // celé okno
        overflow: 'hidden',     // ne-scrolluj celé telo stránky
      }}
    >
      {/* Ľavé menu – stále viditeľné */}
      <nav
        style={{
          minWidth: '220px',
          height: '100%',
          overflow: 'auto',     // ak by bolo menu dlhšie, vie sa scrollovať samo
        }}
      >
        <NavLink to="/" end style={linkStyle(isActive('/'))}>
          <span style={iconStyle}>⚡</span>Predaj
        </NavLink>

        <NavLink to="/zakaznici" style={linkStyle(isActive('/zakaznici'))}>
          <span style={iconStyle}>👥</span>Zákazníci
        </NavLink>

        <NavLink to="/produkty" style={linkStyle(isActive('/produkty'))}>
          <span style={iconStyle}>📦</span>Produkty
        </NavLink>

        <NavLink to="/naskladnit" style={linkStyle(isActive('/naskladnit'))}>
          <span style={iconStyle}>➕</span>Naskladniť
        </NavLink>

        <NavLink to="/historia" style={linkStyle(isActive('/historia'))}>
          <span style={iconStyle}>🕒</span>História
        </NavLink>

        <NavLink to="/sklad" style={linkStyle(isActive('/sklad'))}>
          <span style={iconStyle}>🏬</span>Sklad
        </NavLink>
      </nav>

      {/* Pravý obsah – SCROLLUJE SA LEN TOTO */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingRight: '8px',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}