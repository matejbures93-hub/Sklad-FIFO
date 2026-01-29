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
      {/* ================= DESKTOP ================= */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 overflow-y-auto p-6">
        <nav className="space-y-6">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-4 text-4xl font-bold underline ${
                  isActive ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                }`
              }
            >
              <span className="text-4xl">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ================= MOBILE / TABLET ================= */}
      <div className="lg:hidden">
        {/* hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-[60] bg-white border rounded-xl px-3 py-2 shadow"
        >
          ☰
        </button>

        {/* overlay */}
        {open && (
          <div
            className="fixed inset-0 bg-black/30 z-[59]"
            onClick={() => setOpen(false)}
          />
        )}

        {/* drawer */}
        <div
          className={`fixed left-0 top-0 bottom-0 w-72 bg-white border-r z-[60] p-5 transform transition-transform ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-bold">Menu</div>
            <button onClick={() => setOpen(false)} className="underline text-sm">
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
                    isActive ? 'opacity-100' : 'opacity-80'
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
    </>
  )
}