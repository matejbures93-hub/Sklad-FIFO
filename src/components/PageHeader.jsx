import LRTag from './LRTag'

export default function PageHeader({ title, onRefresh }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <LRTag>{title}</LRTag>

      {onRefresh ? (
        <button
          className="text-sm font-semibold px-3 py-2 rounded-full border border-gray-200 bg-white shadow-sm active:scale-[0.99]"
          onClick={onRefresh}
        >
          Obnoviť
        </button>
      ) : (
        <div />
      )}
    </div>
  )
}
