import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const links = [
  { to: '/', label: 'Predaj', icon: '⚡' },
  { to: '/zakaznici', label: 'Zákazníci', icon: '👥' },
  { to: '/produkty', label: 'Produkty', icon: '📦' },
  { to: '/naskladnit', label: 'Naskladniť', icon: '➕' },
  { to: '/historia', label: 'História', icon: '🕒' },
  { to: '/sklad', label: 'Sklad', icon: '🏬' },
]

export default function TopMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* DESKTOP/TABLET: klasické ľavé menu */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-64 overflow-y-auto p-6">
        <nav className="space-y-6">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-4 text-4xl font-bold underline decoration-2 ${
                  isActive ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                }`
              }
            >
              <span className="text-4xl">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* MOBIL: plávajúce tlačidlo + drawer menu */}
      <div className="md:hidden">
        {/* tlačidlo */}
        <button
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-[60] border bg-white rounded-2xl px-3 py-2 shadow"
          aria-label="Otvoriť menu"
        >
          <span className="text-xl">☰</span>
        </button>

        {/* overlay */}
        {open && (
          <div
            className="fixed inset-0 z-[59] bg-black/30"
            onClick={() => setOpen(false)}
          />
        )}

        {/* drawer */}
        <div
          className={`fixed left-0 top-0 bottom-0 z-[60] w-72 bg-white border-r p-5 transform transition-transform ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-bold">Menu</div>
            <button className="text-sm underline" onClick={() => setOpen(false)}>
              Zavrieť
            </button>
          </div>

          <nav className="space-y-4">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 text-xl font-semibold underline ${
                    isActive ? 'opacity-100' : 'opacity-90'
                  }`
                }
              >
                <span className="text-2xl">{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* odsadenie obsahu, aby nebol pod sidebarom na desktop/tablet */}
      <div className="md:pl-64" />
    </>
  )
}