export function DashboardPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Dashboard ejecutivo</h2>
      <div className="grid grid-cols-4 gap-4">
        {['OT abiertas', 'OT cerradas', 'Costo USD', 'Costo CUP'].map((kpi) => (
          <article key={kpi} className="bg-white border rounded-xl p-4">
            <p className="text-sm text-slate-500">{kpi}</p>
            <p className="text-2xl font-semibold">--</p>
          </article>
        ))}
      </div>
    </div>
  );
}
