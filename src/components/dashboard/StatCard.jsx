export default function StatCard({ label, value }) {
  return (
    <div className="border rounded-2xl bg-white shadow-sm p-4">
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  )
}