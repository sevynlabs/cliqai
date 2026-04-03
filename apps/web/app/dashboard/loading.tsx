export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-32 rounded-lg bg-gray-100" />
        <div className="h-4 w-48 rounded-lg bg-gray-100" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100" />
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 rounded-2xl bg-gray-100" />
        <div className="h-64 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}
