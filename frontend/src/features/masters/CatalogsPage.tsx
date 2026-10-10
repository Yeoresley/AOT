import { FormEvent, useEffect, useState } from 'react';
import { http } from '../../shared/api/http';

interface Operator {
  id: string;
  fullName: string;
  salaryUsdPerHour: number | string;
  salaryCupPerHour: number | string;
}

interface MachineTool {
  id: string;
  description: string;
  valueUsd: number | string;
  valueCup: number | string;
  annualDepreciationPct: number;
  hourlyCostUsd: number | string;
  hourlyCostCup: number | string;
  isAft: boolean;
}

interface Operation {
  id: string;
  description: string;
  defaultHours: number | string | null;
}

interface CatalogData {
  operators: Operator[];
  machineTools: MachineTool[];
  operations: Operation[];
}

const fieldClass = 'w-full rounded-lg border border-slate-300 px-3 py-2';
const emptyData: CatalogData = { operators: [], machineTools: [], operations: [] };

export function CatalogsPage() {
  const [data, setData] = useState<CatalogData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingOperator, setEditingOperator] = useState<string | null>(null);
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [editingOperation, setEditingOperation] = useState<string | null>(null);
  const [operator, setOperator] = useState({ fullName: '', salaryUsdPerHour: '', salaryCupPerHour: '' });
  const [tool, setTool] = useState({
    description: '',
    valueUsd: '',
    valueCup: '',
    annualDepreciationPct: '18',
    isAft: true,
  });
  const [operation, setOperation] = useState({ description: '', defaultHours: '' });

  async function reload() {
    const { data: catalogs } = await http.get<CatalogData>('/catalogs');
    setData(catalogs);
  }

  useEffect(() => {
    reload().catch(() => setError('No se pudieron cargar los catálogos.')).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent, path: string, payload: object, editingId?: string | null, reset?: () => void) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await http.patch(`/catalogs/${path}/${editingId}`, payload);
      else await http.post(`/catalogs/${path}`, payload);
      await reload();
      reset?.();
    } catch {
      setError('No se pudo guardar. Revisa los datos o confirma que el código no esté repetido.');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(path: string, id: string, label: string) {
    if (!window.confirm(`¿Desactivar ${label}? El registro se conservará en el historial de las órdenes.`)) return;
    try {
      await http.delete(`/catalogs/${path}/${id}`);
      await reload();
    } catch {
      setError('No se pudo desactivar. Puede estar asociado a existencias.');
    }
  }

  const resetOperator = () => {
    setOperator({ fullName: '', salaryUsdPerHour: '', salaryCupPerHour: '' });
    setEditingOperator(null);
  };
  const resetTool = () => {
    setTool({ description: '', valueUsd: '', valueCup: '', annualDepreciationPct: '18', isAft: true });
    setEditingTool(null);
  };
  const resetOperation = () => {
    setOperation({ description: '', defaultHours: '' });
    setEditingOperation(null);
  };

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Catálogos del taller</h2>
        <p className="mt-1 text-sm text-slate-600">Configura estos datos una vez; después se seleccionan al registrar cada trabajo.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-lg font-semibold">Trabajadores y salarios por hora</h3>
        <form onSubmit={(event) => void submit(event, 'operators', {
          fullName: operator.fullName,
          salaryUsdPerHour: Number(operator.salaryUsdPerHour),
          salaryCupPerHour: Number(operator.salaryCupPerHour),
        }, editingOperator, resetOperator)} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-sm font-medium">Nombre
            <input required value={operator.fullName} onChange={(event) => setOperator({ ...operator, fullName: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Salario por hora USD
            <input required type="number" min="0" step="0.0001" value={operator.salaryUsdPerHour} onChange={(event) => setOperator({ ...operator, salaryUsdPerHour: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Salario por hora CUP
            <input required type="number" min="0" step="0.0001" value={operator.salaryCupPerHour} onChange={(event) => setOperator({ ...operator, salaryCupPerHour: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <div className="flex items-end gap-2">
            <button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-white">{editingOperator ? 'Guardar cambios' : 'Agregar trabajador'}</button>
            {editingOperator && <button type="button" onClick={resetOperator} className="py-2 text-sm">Cancelar</button>}
          </div>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3">Trabajador</th><th className="p-3">USD/h</th><th className="p-3">CUP/h</th><th className="p-3">Acciones</th></tr></thead>
            <tbody>{data.operators.map((item) => <tr key={item.id} className="border-t">
              <td className="p-3">{item.fullName}</td><td className="p-3">{Number(item.salaryUsdPerHour).toFixed(4)}</td><td className="p-3">{Number(item.salaryCupPerHour).toFixed(4)}</td>
              <td className="p-3"><button className="mr-3 text-blue-700" onClick={() => { setOperator({ fullName: item.fullName, salaryUsdPerHour: String(item.salaryUsdPerHour), salaryCupPerHour: String(item.salaryCupPerHour) }); setEditingOperator(item.id); }}>Editar</button><button className="text-red-700" onClick={() => void deactivate('operators', item.id, item.fullName)}>Desactivar</button></td>
            </tr>)}</tbody>
          </table>
          {!loading && !data.operators.length && <p className="py-4 text-sm text-slate-500">No hay trabajadores registrados.</p>}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-lg font-semibold">Herramientas y AFT</h3>
        <p className="mt-1 text-sm text-slate-500">El costo por hora se calcula con 192 horas mensuales (2 304 al año): valor × depreciación anual ÷ 2 304.</p>
        <form onSubmit={(event) => void submit(event, 'machine-tools', {
          description: tool.description,
          valueUsd: Number(tool.valueUsd),
          valueCup: Number(tool.valueCup),
          annualDepreciationPct: Number(tool.annualDepreciationPct),
          isAft: tool.isAft,
        }, editingTool, resetTool)} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium">Nombre del equipo
            <input required value={tool.description} onChange={(event) => setTool({ ...tool, description: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Valor USD
            <input required type="number" min="0" step="0.0001" value={tool.valueUsd} onChange={(event) => setTool({ ...tool, valueUsd: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Valor CUP
            <input required type="number" min="0" step="0.0001" value={tool.valueCup} onChange={(event) => setTool({ ...tool, valueCup: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Depreciación anual (%)
            <input required type="number" min="0" max="100" step="0.01" value={tool.annualDepreciationPct} onChange={(event) => setTool({ ...tool, annualDepreciationPct: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tool.isAft} onChange={(event) => setTool({ ...tool, isAft: event.target.checked })} /> Es AFT</label>
            <div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-slate-900 px-3 py-2 text-white">{editingTool ? 'Guardar' : 'Agregar equipo'}</button>{editingTool && <button type="button" onClick={resetTool} className="text-sm">Cancelar</button>}</div>
          </div>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3">Equipo</th><th className="p-3">Tipo</th><th className="p-3">Valor USD / CUP</th><th className="p-3">Depreciación</th><th className="p-3">Costo/h USD / CUP</th><th className="p-3">Acciones</th></tr></thead>
            <tbody>{data.machineTools.map((item) => <tr key={item.id} className="border-t">
              <td className="p-3">{item.description}</td><td className="p-3">{item.isAft ? 'AFT' : 'Herramienta'}</td>
              <td className="p-3">{Number(item.valueUsd).toFixed(2)} / {Number(item.valueCup).toFixed(2)}</td><td className="p-3">{item.annualDepreciationPct}% anual</td>
              <td className="p-3">{Number(item.hourlyCostUsd).toFixed(6)} / {Number(item.hourlyCostCup).toFixed(6)}</td>
              <td className="p-3"><button className="mr-3 text-blue-700" onClick={() => { setTool({ description: item.description, valueUsd: String(item.valueUsd), valueCup: String(item.valueCup), annualDepreciationPct: String(item.annualDepreciationPct), isAft: item.isAft }); setEditingTool(item.id); }}>Editar</button><button className="text-red-700" onClick={() => void deactivate('machine-tools', item.id, item.description)}>Desactivar</button></td>
            </tr>)}</tbody>
          </table>
          {!loading && !data.machineTools.length && <p className="py-4 text-sm text-slate-500">No hay equipos registrados.</p>}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-lg font-semibold">Trabajos frecuentes</h3>
        <form onSubmit={(event) => void submit(event, 'operations', {
          description: operation.description,
          ...(operation.defaultHours ? { defaultHours: Number(operation.defaultHours) } : {}),
        }, editingOperation, resetOperation)} className="mt-4 grid gap-3 md:grid-cols-[1fr_240px_auto]">
          <label className="text-sm font-medium">Nombre del trabajo
            <input required value={operation.description} onChange={(event) => setOperation({ ...operation, description: event.target.value })} className={`${fieldClass} mt-1 font-normal`} placeholder="Ej.: Cambio de aceite" />
          </label>
          <label className="text-sm font-medium">Tiempo sugerido (horas)
            <input type="number" min="0" step="0.01" value={operation.defaultHours} onChange={(event) => setOperation({ ...operation, defaultHours: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <div className="flex items-end gap-2"><button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-white">{editingOperation ? 'Guardar' : 'Agregar trabajo'}</button>{editingOperation && <button type="button" onClick={resetOperation} className="py-2 text-sm">Cancelar</button>}</div>
        </form>
        <div className="mt-4 divide-y">
          {data.operations.map((item) => <div key={item.id} className="flex items-center justify-between py-3 text-sm">
            <span>{item.description}{item.defaultHours ? <span className="ml-2 text-slate-500">· {item.defaultHours} h sugeridas</span> : null}</span>
            <span><button className="mr-3 text-blue-700" onClick={() => { setOperation({ description: item.description, defaultHours: item.defaultHours ? String(item.defaultHours) : '' }); setEditingOperation(item.id); }}>Editar</button><button className="text-red-700" onClick={() => void deactivate('operations', item.id, item.description)}>Desactivar</button></span>
          </div>)}
          {!loading && !data.operations.length && <p className="py-4 text-sm text-slate-500">No hay trabajos registrados.</p>}
        </div>
      </section>
    </section>
  );
}
