import { Link, Outlet } from 'react-router-dom';

const menu = [
  { to: '/', label: 'Dashboard' },
  { to: '/work-orders', label: 'Órdenes' },
  { to: '/masters/clients', label: 'Clientes' },
  { to: '/inventory', label: 'Inventario' },
  { to: '/purchasing', label: 'Compras' },
  { to: '/billing', label: 'Facturación' },
  { to: '/receivables', label: 'Cuentas por cobrar' },
  { to: '/approvals', label: 'Aprobaciones' },
  { to: '/analytics', label: 'Indicadores' },
  { to: '/external-portal', label: 'Portal externo' },
  { to: '/reports', label: 'Reportes' },
];

export function AppLayout() {
  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr]">
      <aside className="bg-slate-900 text-white p-4 overflow-auto">
        <h1 className="text-xl font-bold mb-6">Rapitrans ERP</h1>
        <nav className="space-y-2">
          {menu.map((item) => (
            <Link key={item.to} className="block rounded px-3 py-2 hover:bg-slate-800" to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main>
        <header className="bg-white border-b px-6 py-3 flex justify-between">
          <span className="font-semibold">Gestión Taller Automotriz</span>
          <button className="text-sm text-slate-500">Salir</button>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
