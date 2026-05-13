export default function ExpOverview({ expired, within30, within60 }) {
  return (
    <div className="border rounded-2xl bg-white shadow-sm p-4 mb-3">
      <div className="text-base font-bold mb-2">EXP prehľad</div>
      <div className="text-sm">🔴 Expirované: <b>{expired}</b></div>
      <div className="text-sm mt-1">🟠 Do 30 dní: <b>{within30}</b></div>
      <div className="text-sm mt-1">🟡 Do 60 dní: <b>{within60}</b></div>
    </div>
  )
}