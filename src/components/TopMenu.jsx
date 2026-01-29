import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'

const links = [
  { to: '/', label: 'Predaj', icon: '⚡' },
  { to: '/zakaznici', label: 'Zákazníci', icon: '👥' },
  { to: '/produkty', label: 'Produkty', icon: '📦' },
  { to: '/naskladnit', label: 'Naskladniť', icon: '➕' },
  { to: '/historia', label: 'História', icon: '🕒' },
  { to: '/sklad', label: 'Sklad', icon: '🏬' },
]

function useIsDesktop(minWidth = 1024) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= minWidth : false
  )

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= minWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [minWidth])

  return isDesktop
}

export default function TopMenu() {
  const isDesktop = useIsDesktop(1024) // 1024px = "desktop"
  const [open, setOpen] = useState(false)

  // ak prejdeš na desktop, zavri drawer
  useEffect(() => {
    if (isDesktop) setOpen(false)
  }, [isDesktop])

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontSize: isDesktop ? '44px' : '22px',
    fontWeight: 800,
    textDecoration: 'underline',
    opacity: isActive ? 1 : 0.9,
    padding: isDesktop ? '8px 0' : '8px 0',
  })

  if (isDesktop) {
    // DESKTOP: ľavý panel (scrolluje spolu so stránkou)
    return (
      <div style={{ padding: '24px 24px 0 24px' }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} style={linkStyle}>
              <span style={{ fontSize: '44px' }}>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    )
  }

  // MOBILE / TABLET: hamburger + drawer
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          left: 12,
          top: 12,
          zIndex: 9999,
          padding: '10px 14px',
          borderRadius: 14,
          border: '1px solid #ddd',
          background: '#fff',
        }}
        aria-label="Otvoriť menu"
      >
        ☰
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.25)',
            zIndex: 9998,
          }}
        />
      )}

      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 280,
          background: '#fff',
          borderRight: '1px solid #ddd',
          padding: 16,
          zIndex: 9999,
          transform: open ? 'translateX(0)' : 'translateX(-110%)',
          transition: 'transform 180ms ease',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Menu</div>
          <button onClick={() => setOpen(false)} style={{ textDecoration: 'underline', border: 'none', background: 'transparent' }}>
            Zavrieť
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              style={linkStyle}
            >
              <span style={{ fontSize: 26 }}>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}