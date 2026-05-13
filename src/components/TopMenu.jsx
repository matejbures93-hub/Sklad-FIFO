import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const items = [
  { to: '/', label: 'Predaj', icon: '🛒' },
  { to: '/zakaznici', label: 'Zákazníci', icon: '👥' },
  { to: '/produkty', label: 'Produkty', icon: '📦' },
  { to: '/naskladnit', label: 'Naskladniť', icon: '➕' },
  { to: '/historia', label: 'História', icon: '🕒' },
  { to: '/sklad', label: 'Sklad', icon: '🏢' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
]

function LinkItem({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-3 text-lg font-semibold border bg-white
         ${isActive ? 'border-black' : 'border-gray-200'}`
      }
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function TopMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // po zmene stránky zavri mobile menu
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // keď je menu otvorené, stopni scroll na pozadí
  useEffect(() => {
    const prev = document.body.style.overflow
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* ✅ MOBILE SPACER: aby hamburger nikdy neprekrýval obsah */}
      <div className="lg:hidden h-16" />

      {/* DESKTOP: ľavý panel (fixný) */}
      <aside className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:p-4 lg:z-40">
        <div className="w-full border rounded-2xl bg-white/70 backdrop-blur p-3 space-y-2">
          <div className="text-sm font-semibold opacity-70 px-1 mb-1">Menu</div>
          {items.map(i => (
            <LinkItem key={i.to} {...i} />
          ))}
        </div>
      </aside>

      {/* MOBILE: hamburger tlačidlo (fixed, mimo textu) */}
      <button
        className="lg:hidden fixed left-3 top-3 z-[60] w-12 h-12 rounded-2xl border bg-white/90 backdrop-blur flex items-center justify-center text-xl shadow"
        onClick={() => setOpen(true)}
        aria-label="Otvoriť menu"
      >
        ☰
      </button>

      {/* MOBILE: overlay + drawer (zľava) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          {/* pozadie */}
          <button
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Zavrieť menu"
          />

          {/* drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-[78%] max-w-xs bg-white shadow-2xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Menu</div>
              <button className="text-sm underline" onClick={() => setOpen(false)}>
                Zavrieť
              </button>
            </div>

            <div className="space-y-2">
              {items.map(i => (
                <LinkItem key={i.to} {...i} onClick={() => setOpen(false)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}