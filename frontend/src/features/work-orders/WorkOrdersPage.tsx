import { FormEvent, useEffect, useState } from 'react';
import { http } from '../../shared/api/http';

interface WorkOrder {
  id: string;
  folio: string;
  status: string;
  receivedAt: string;
  requestedActivity: string;
  client: { name: string };
  vehicle: { plate: string; brand: string; model: string };
  establishment: { name: string };
  operations: Array<{
    id: string;
    description: string;
    hours: number | string;
    workers: Array<{ id: string; hours: number | string; operator: { fullName: string } }>;
    tools: Array<{ id: string; hours: number | string; machineTool: { description: string } }>;
    consumables: Array<{
      id: string;
      item: string;
      quantity: number | string;
      unitMeasure: string;
      costUsd: number | string;
      costCup: number | string;
    }>;
    outsourcedServices: Array<{
      id: string;
      description: string;
      provider: string;
      costUsd: number | string;
      costCup: number | string;
    }>;
  }>;
}

interface FormOptions {
  clients: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; plate: string; brand: string; model: string }>;
  establishments: Array<{ id: string; name: string }>;
  operations: Array<{ id: string; description: string; defaultHours: number | string | null }>;
  operators: Array<{ id: string; fullName: string }>;
  tools: Array<{ id: string; description: string }>;
  stockItems: Array<{
    id: string;
    stockOnHand: number | string;
    averageCostUsd: number | string;
    averageCostCup: number | string;
    inventoryItem: { id: string; sku: string; description: string; unitMeasure: string };
    warehouse: { id: string; code: string | null; name: string };
  }>;
}

interface CostPreview {
  salaryUsd: number | string;
  salaryCup: number | string;
  depreciationUsd: number | string;
  depreciationCup: number | string;
  outsourcedUsd: number | string;
  outsourcedCup: number | string;
  consumablesUsd: number | string;
  consumablesCup: number | string;
  ppaUsd: number | string;
  ppaCup: number | string;
  totalCostUsd: number | string;
  totalCostCup: number | string;
  marginUsd: number | string;
  marginCup: number | string;
  invoiceTotalUsd: number | string;
  invoiceTotalCup: number | string;
}

interface WorkerInput {
  key: string;
  operatorId: string;
  hours: string;
}

interface ToolInput {
  key: string;
  machineToolId: string;
  hours: string;
}

interface ConsumableInput {
  key: string;
  inventoryStockId: string;
  item: string;
  unitMeasure: string;
  quantity: string;
  costUsd: string;
  costCup: string;
  voucherNumber: string;
}

interface OutsourcedInput {
  key: string;
  description: string;
  provider: string;
  costUsd: string;
  costCup: string;
}

const emptyOptions: FormOptions = {
  clients: [],
  vehicles: [],
  establishments: [],
  operations: [],
  operators: [],
  tools: [],
  stockItems: [],
};

export function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [options, setOptions] = useState<FormOptions>(emptyOptions);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingOperation, setSavingOperation] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ folio: string; totals: CostPreview } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [workers, setWorkers] = useState<WorkerInput[]>([]);
  const [tools, setTools] = useState<ToolInput[]>([]);
  const [consumables, setConsumables] = useState<ConsumableInput[]>([]);
  const [outsourcedServices, setOutsourcedServices] = useState<OutsourcedInput[]>([]);
  const [operationForm, setOperationForm] = useState({
    operationCatalogId: '',
    operationDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [form, setForm] = useState({
    establishmentId: '',
    clientId: '',
    vehicleId: '',
    deliveredBy: '',
    receivedBy: '',
    receivedAt: new Date().toISOString().slice(0, 10),
    requestedActivity: '',
    vehicleConditionNotes: '',
    visibleIncidents: '',
    initialTraceability: '',
  });

  async function loadOrders() {
    const { data } = await http.get<WorkOrder[]>('/work-orders');
    setOrders(data);
  }

  useEffect(() => {
    Promise.all([http.get<FormOptions>('/work-orders/options'), loadOrders()])
      .then(([optionsResponse]) => {
        const loadedOptions = optionsResponse.data;
        setOptions(loadedOptions);
        setOperationForm((current) => ({
          ...current,
          operationCatalogId: loadedOptions.operations[0]?.id ?? '',
        }));
      })
      .catch(() => setError('No se pudieron cargar las órdenes o los datos de selección.'))
      .finally(() => setLoading(false));
  }, []);

  function updateForm(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await http.post('/work-orders', { ...form, receivedAt: new Date(`${form.receivedAt}T12:00:00`).toISOString() });
      setForm((current) => ({
        ...current,
        deliveredBy: '',
        requestedActivity: '',
        vehicleConditionNotes: '',
        visibleIncidents: '',
        initialTraceability: '',
      }));
      await loadOrders();
    } catch {
      setError('No se pudo crear la orden. Verifica los datos e inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function showPreview(order: WorkOrder) {
    setError('');
    try {
      const { data } = await http.post<CostPreview>(`/work-orders/${order.id}/calculate-preview`);
      setPreview({ folio: order.folio, totals: data });
    } catch {
      setError(`No se pudo calcular la vista previa de ${order.folio}.`);
    }
  }

  async function addOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder) return;
    setError('');
    setSavingOperation(true);
    try {
      await http.post(`/work-orders/${selectedOrder.id}/operations`, {
        operationCatalogId: operationForm.operationCatalogId,
        operationDate: new Date(`${operationForm.operationDate}T12:00:00`).toISOString(),
        notes: operationForm.notes || undefined,
        workers: workers
          .filter((worker) => worker.operatorId && Number(worker.hours) > 0)
          .map((worker) => ({ operatorId: worker.operatorId, hours: Number(worker.hours) })),
        tools: tools
          .filter((tool) => tool.machineToolId && Number(tool.hours) > 0)
          .map((tool) => ({ machineToolId: tool.machineToolId, hours: Number(tool.hours) })),
        consumables: consumables
          .filter((item) => item.item.trim())
          .map((item) => ({
            inventoryStockId: item.inventoryStockId || undefined,
            item: item.item.trim(),
            unitMeasure: item.unitMeasure.trim() || 'unidad',
            quantity: Number(item.quantity),
            costUsd: Number(item.costUsd),
            costCup: Number(item.costCup),
            voucherNumber: item.voucherNumber.trim() || undefined,
          })),
        outsourcedServices: outsourcedServices
          .filter((service) => service.description.trim() && service.provider.trim())
          .map((service) => ({
            description: service.description.trim(),
            provider: service.provider.trim(),
            costUsd: Number(service.costUsd),
            costCup: Number(service.costCup),
          })),
      });
      await loadOrders();
      setSelectedOrder(null);
      setOperationForm((current) => ({ ...current, notes: '' }));
      setWorkers([]);
      setTools([]);
      setConsumables([]);
      setOutsourcedServices([]);
    } catch {
      setError(`No se pudo agregar el trabajo a ${selectedOrder.folio}. Comprueba los datos e inténtalo de nuevo.`);
    } finally {
      setSavingOperation(false);
    }
  }

  async function closeOrder(order: WorkOrder) {
    if (!window.confirm(`¿Cerrar la orden ${order.folio}?`)) return;
    setError('');
    try {
      await http.post(`/work-orders/${order.id}/close`);
      await loadOrders();
      setPreview(null);
    } catch {
      setError(`No se pudo cerrar la orden ${order.folio}.`);
    }
  }

  const fieldClass = 'w-full rounded-lg border border-slate-300 px-3 py-2';

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Órdenes de trabajo</h2>
        <p className="text-sm text-slate-500 mt-1">Registro, costeo y cierre de órdenes del taller.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={createOrder} className="rounded-xl border bg-white p-5">
        <h3 className="mb-4 text-lg font-semibold">Nueva orden</h3>
        {(!options.clients.length || !options.vehicles.length || !options.establishments.length) && !loading && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Para crear órdenes, primero deben existir clientes, vehículos y talleres en la base de datos.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium">Taller
            <select required value={form.establishmentId} onChange={(event) => updateForm('establishmentId', event.target.value)} className={`${fieldClass} mt-1 font-normal`}>
              <option value="">Selecciona taller</option>
              {options.establishments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Cliente
            <select required value={form.clientId} onChange={(event) => updateForm('clientId', event.target.value)} className={`${fieldClass} mt-1 font-normal`}>
              <option value="">Selecciona cliente</option>
              {options.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Vehículo
            <select required value={form.vehicleId} onChange={(event) => updateForm('vehicleId', event.target.value)} className={`${fieldClass} mt-1 font-normal`}>
              <option value="">Selecciona vehículo</option>
              {options.vehicles.map((item) => <option key={item.id} value={item.id}>{item.plate} · {item.brand} {item.model}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Entregado por
            <input required value={form.deliveredBy} onChange={(event) => updateForm('deliveredBy', event.target.value)} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Recibido por
            <input required value={form.receivedBy} onChange={(event) => updateForm('receivedBy', event.target.value)} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Fecha de recepción
            <input required type="date" value={form.receivedAt} onChange={(event) => updateForm('receivedAt', event.target.value)} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium md:col-span-3">Actividad solicitada
            <input required value={form.requestedActivity} onChange={(event) => updateForm('requestedActivity', event.target.value)} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium md:col-span-3">Estado del vehículo
            <textarea value={form.vehicleConditionNotes} onChange={(event) => updateForm('vehicleConditionNotes', event.target.value)} className={`${fieldClass} mt-1 font-normal`} rows={2} />
          </label>
          <label className="text-sm font-medium md:col-span-3">Incidentes visibles
            <textarea value={form.visibleIncidents} onChange={(event) => updateForm('visibleIncidents', event.target.value)} className={`${fieldClass} mt-1 font-normal`} rows={2} />
          </label>
          <label className="text-sm font-medium md:col-span-3">Trazabilidad inicial
            <textarea value={form.initialTraceability} onChange={(event) => updateForm('initialTraceability', event.target.value)} className={`${fieldClass} mt-1 font-normal`} rows={2} />
          </label>
        </div>
        <button disabled={submitting || loading} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60">
          {submitting ? 'Guardando...' : 'Crear orden'}
        </button>
      </form>

      {preview && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Vista previa · {preview.folio}</h3>
            <button className="text-sm text-slate-600" onClick={() => setPreview(null)}>Cerrar</button>
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p>Mano de obra USD: <strong>{Number(preview.totals.salaryUsd).toFixed(2)}</strong></p>
            <p>Mano de obra CUP: <strong>{Number(preview.totals.salaryCup).toFixed(2)}</strong></p>
            <p>Desgaste de equipos USD: <strong>{Number(preview.totals.depreciationUsd).toFixed(2)}</strong></p>
            <p>Desgaste de equipos CUP: <strong>{Number(preview.totals.depreciationCup).toFixed(2)}</strong></p>
            <p>Insumos USD: <strong>{Number(preview.totals.consumablesUsd).toFixed(2)}</strong></p>
            <p>Insumos CUP: <strong>{Number(preview.totals.consumablesCup).toFixed(2)}</strong></p>
            <p>Servicios externos USD: <strong>{Number(preview.totals.outsourcedUsd).toFixed(2)}</strong></p>
            <p>Servicios externos CUP: <strong>{Number(preview.totals.outsourcedCup).toFixed(2)}</strong></p>
            <p>Piezas/partes USD: <strong>{Number(preview.totals.ppaUsd).toFixed(2)}</strong></p>
            <p>Piezas/partes CUP: <strong>{Number(preview.totals.ppaCup).toFixed(2)}</strong></p>
            <p>Costo USD: <strong>{Number(preview.totals.totalCostUsd).toFixed(2)}</strong></p>
            <p>Margen USD: <strong>{Number(preview.totals.marginUsd).toFixed(2)}</strong></p>
            <p>Total factura USD: <strong>{Number(preview.totals.invoiceTotalUsd).toFixed(2)}</strong></p>
            <p>Costo CUP: <strong>{Number(preview.totals.totalCostCup).toFixed(2)}</strong></p>
            <p>Margen CUP: <strong>{Number(preview.totals.marginCup).toFixed(2)}</strong></p>
            <p>Total factura CUP: <strong>{Number(preview.totals.invoiceTotalCup).toFixed(2)}</strong></p>
          </div>
        </div>
      )}

      {selectedOrder && (
        <form onSubmit={addOperation} className="rounded-xl border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Registrar trabajo realizado</h3>
              <p className="text-sm text-slate-500">{selectedOrder.folio} · {selectedOrder.vehicle.plate}</p>
            </div>
            <button type="button" className="text-sm text-slate-600" onClick={() => setSelectedOrder(null)}>Cancelar</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">¿Qué trabajo se realizó?
              <select required value={operationForm.operationCatalogId} onChange={(event) => setOperationForm((current) => ({ ...current, operationCatalogId: event.target.value }))} className={`${fieldClass} mt-1 font-normal`}>
                <option value="">Selecciona el trabajo</option>
                {options.operations.map((item) => <option key={item.id} value={item.id}>{item.description}{item.defaultHours ? ` (${item.defaultHours} h sugeridas)` : ''}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Fecha
              <input required type="date" value={operationForm.operationDate} onChange={(event) => setOperationForm((current) => ({ ...current, operationDate: event.target.value }))} className={`${fieldClass} mt-1 font-normal`} />
            </label>
          </div>

          <div className="mt-5 space-y-4">
            <fieldset className="rounded-lg border p-4">
              <legend className="px-2 font-semibold">Mano de obra</legend>
              {workers.map((worker, index) => (
                <div key={worker.key} className="mb-3 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                  <label className="text-sm">Mecánico
                    <select required value={worker.operatorId} onChange={(event) => setWorkers((current) => current.map((row) => row.key === worker.key ? { ...row, operatorId: event.target.value } : row))} className={`${fieldClass} mt-1`}>
                      <option value="">Selecciona mecánico</option>
                      {options.operators.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">Tiempo trabajado (horas)
                    <input required type="number" min="0.01" step="0.01" value={worker.hours} onChange={(event) => setWorkers((current) => current.map((row) => row.key === worker.key ? { ...row, hours: event.target.value } : row))} className={`${fieldClass} mt-1`} />
                  </label>
                  <button type="button" onClick={() => setWorkers((current) => current.filter((row) => row.key !== worker.key))} className="self-end px-3 py-2 text-sm text-red-700">Quitar</button>
                </div>
              ))}
              {options.operators.length ? (
                <button type="button" onClick={() => setWorkers((current) => [...current, { key: crypto.randomUUID(), operatorId: options.operators[0].id, hours: '1' }])} className="text-sm font-medium text-blue-700 hover:underline">
                  + Agregar mecánico
                </button>
              ) : <p className="text-sm text-amber-700">No hay mecánicos registrados.</p>}
            </fieldset>

            <fieldset className="rounded-lg border p-4">
              <legend className="px-2 font-semibold">Herramientas o equipos</legend>
              {tools.map((tool) => (
                <div key={tool.key} className="mb-3 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                  <label className="text-sm">Herramienta
                    <select required value={tool.machineToolId} onChange={(event) => setTools((current) => current.map((row) => row.key === tool.key ? { ...row, machineToolId: event.target.value } : row))} className={`${fieldClass} mt-1`}>
                      <option value="">Selecciona herramienta</option>
                      {options.tools.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">Tiempo de uso (horas)
                    <input required type="number" min="0.01" step="0.01" value={tool.hours} onChange={(event) => setTools((current) => current.map((row) => row.key === tool.key ? { ...row, hours: event.target.value } : row))} className={`${fieldClass} mt-1`} />
                  </label>
                  <button type="button" onClick={() => setTools((current) => current.filter((row) => row.key !== tool.key))} className="self-end px-3 py-2 text-sm text-red-700">Quitar</button>
                </div>
              ))}
              {options.tools.length ? (
                <button type="button" onClick={() => setTools((current) => [...current, { key: crypto.randomUUID(), machineToolId: options.tools[0].id, hours: '1' }])} className="text-sm font-medium text-blue-700 hover:underline">
                  + Agregar herramienta
                </button>
              ) : <p className="text-sm text-slate-500">No hay herramientas registradas.</p>}
            </fieldset>

            <fieldset className="rounded-lg border p-4">
              <legend className="px-2 font-semibold">Insumos utilizados</legend>
              {consumables.map((item) => (
                <div key={item.key} className="mb-4 grid gap-3 border-b pb-4 last:border-0 md:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm">Selecciona del almacén
                    <select value={item.inventoryStockId} onChange={(event) => {
                      const stock = options.stockItems.find((entry) => entry.id === event.target.value);
                      setConsumables((current) => current.map((row) => row.key === item.key ? {
                        ...row,
                        inventoryStockId: event.target.value,
                        item: stock?.inventoryItem.description ?? '',
                        unitMeasure: stock?.inventoryItem.unitMeasure ?? 'unidad',
                        costUsd: stock ? String(stock.averageCostUsd) : '0',
                        costCup: stock ? String(stock.averageCostCup) : '0',
                      } : row));
                    }} className={`${fieldClass} mt-1`}>
                      <option value="">Insumo manual (sin descuento de almacén)</option>
                      {options.stockItems.filter((stock) => Number(stock.stockOnHand) > 0).map((stock) => (
                        <option key={stock.id} value={stock.id}>
                          {stock.inventoryItem.sku} · {stock.inventoryItem.description} · {stock.warehouse.name} · disponible: {stock.stockOnHand} {stock.inventoryItem.unitMeasure}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">Insumo o pieza
                    <input required value={item.item} onChange={(event) => setConsumables((current) => current.map((row) => row.key === item.key ? { ...row, item: event.target.value } : row))} className={`${fieldClass} mt-1`} placeholder="Ej.: aceite 5W-30" />
                  </label>
                  <label className="text-sm">Cantidad
                    <input required type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => setConsumables((current) => current.map((row) => row.key === item.key ? { ...row, quantity: event.target.value } : row))} className={`${fieldClass} mt-1`} />
                    {item.inventoryStockId && <span className="mt-1 block text-xs text-slate-500">
                      Disponible: {options.stockItems.find((stock) => stock.id === item.inventoryStockId)?.stockOnHand} {item.unitMeasure}
                    </span>}
                  </label>
                  <label className="text-sm">Unidad
                    <input required readOnly={Boolean(item.inventoryStockId)} value={item.unitMeasure} onChange={(event) => setConsumables((current) => current.map((row) => row.key === item.key ? { ...row, unitMeasure: event.target.value } : row))} className={`${fieldClass} mt-1 read-only:bg-slate-50`} placeholder="litro, unidad..." />
                  </label>
                  <label className="text-sm">{item.inventoryStockId ? 'Costo unitario USD (catálogo)' : 'Costo total USD'}
                    <input required type="number" min="0" step="0.0001" readOnly={Boolean(item.inventoryStockId)} value={item.inventoryStockId ? item.costUsd : item.costUsd} onChange={(event) => setConsumables((current) => current.map((row) => row.key === item.key ? { ...row, costUsd: event.target.value } : row))} className={`${fieldClass} mt-1 read-only:bg-slate-50`} />
                  </label>
                  <label className="text-sm">{item.inventoryStockId ? 'Costo unitario CUP (catálogo)' : 'Costo total CUP'}
                    <input required type="number" min="0" step="0.0001" readOnly={Boolean(item.inventoryStockId)} value={item.costCup} onChange={(event) => setConsumables((current) => current.map((row) => row.key === item.key ? { ...row, costCup: event.target.value } : row))} className={`${fieldClass} mt-1 read-only:bg-slate-50`} />
                  </label>
                  <div className="flex items-end justify-between gap-2">
                    <label className="flex-1 text-sm">Vale (opcional)
                      <input value={item.voucherNumber} onChange={(event) => setConsumables((current) => current.map((row) => row.key === item.key ? { ...row, voucherNumber: event.target.value } : row))} className={`${fieldClass} mt-1`} />
                    </label>
                    <button type="button" onClick={() => setConsumables((current) => current.filter((row) => row.key !== item.key))} className="px-2 py-2 text-sm text-red-700">Quitar</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setConsumables((current) => [...current, { key: crypto.randomUUID(), inventoryStockId: '', item: '', unitMeasure: 'unidad', quantity: '1', costUsd: '0', costCup: '0', voucherNumber: '' }])} className="text-sm font-medium text-blue-700 hover:underline">
                + Agregar insumo
              </button>
            </fieldset>

            <fieldset className="rounded-lg border p-4">
              <legend className="px-2 font-semibold">Servicio subcontratado</legend>
              {outsourcedServices.map((service) => (
                <div key={service.key} className="mb-3 grid gap-3 border-b pb-4 last:border-0 md:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_160px_auto]">
                  <label className="text-sm">Trabajo realizado
                    <input required value={service.description} onChange={(event) => setOutsourcedServices((current) => current.map((row) => row.key === service.key ? { ...row, description: event.target.value } : row))} className={`${fieldClass} mt-1`} placeholder="Ej.: rectificación de discos" />
                  </label>
                  <label className="text-sm">Proveedor
                    <input required value={service.provider} onChange={(event) => setOutsourcedServices((current) => current.map((row) => row.key === service.key ? { ...row, provider: event.target.value } : row))} className={`${fieldClass} mt-1`} />
                  </label>
                  <label className="text-sm">Costo USD
                    <input required type="number" min="0" step="0.0001" value={service.costUsd} onChange={(event) => setOutsourcedServices((current) => current.map((row) => row.key === service.key ? { ...row, costUsd: event.target.value } : row))} className={`${fieldClass} mt-1`} />
                  </label>
                  <label className="text-sm">Costo CUP
                    <input required type="number" min="0" step="0.0001" value={service.costCup} onChange={(event) => setOutsourcedServices((current) => current.map((row) => row.key === service.key ? { ...row, costCup: event.target.value } : row))} className={`${fieldClass} mt-1`} />
                  </label>
                  <button type="button" onClick={() => setOutsourcedServices((current) => current.filter((row) => row.key !== service.key))} className="self-end px-2 py-2 text-sm text-red-700">Quitar</button>
                </div>
              ))}
              <button type="button" onClick={() => setOutsourcedServices((current) => [...current, { key: crypto.randomUUID(), description: '', provider: '', costUsd: '0', costCup: '0' }])} className="text-sm font-medium text-blue-700 hover:underline">
                + Agregar servicio externo
              </button>
            </fieldset>
          </div>

          <label className="mt-4 block text-sm font-medium">Notas del trabajo (opcional)
            <textarea value={operationForm.notes} onChange={(event) => setOperationForm((current) => ({ ...current, notes: event.target.value }))} className={`${fieldClass} mt-1 font-normal`} rows={2} />
          </label>
          {!options.operations.length ? (
            <p className="mt-4 text-sm text-amber-700">No hay trabajos en el catálogo.</p>
          ) : (
            <button disabled={savingOperation} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60">
              {savingOperation ? 'Guardando...' : 'Guardar trabajo en la orden'}
            </button>
          )}
        </form>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold">Órdenes registradas</h3>
        </div>
        {loading ? <p className="p-5 text-sm text-slate-500">Cargando órdenes...</p> : orders.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Todavía no hay órdenes de trabajo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Folio</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Cliente / vehículo</th><th className="px-4 py-3">Actividad / trabajos</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{order.folio}</td>
                    <td className="px-4 py-3">{new Date(order.receivedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{order.client.name}<br /><span className="text-xs text-slate-500">{order.vehicle.plate} · {order.vehicle.brand} {order.vehicle.model}</span></td>
                    <td className="px-4 py-3">
                      {order.requestedActivity}
                      <br />
                      <span className="text-xs text-slate-500">{order.operations.length} trabajo(s) registrado(s)</span>
                      {order.operations.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-blue-700">Ver detalle de trabajos</summary>
                          <div className="mt-2 space-y-3">
                            {order.operations.map((operation) => (
                              <div key={operation.id} className="rounded bg-slate-50 p-2 text-xs">
                                <p className="font-semibold">{operation.description}</p>
                                {operation.workers.map((worker) => (
                                  <p key={worker.id}>Mecánico: {worker.operator.fullName} · {worker.hours} h</p>
                                ))}
                                {operation.tools.map((tool) => (
                                  <p key={tool.id}>Equipo: {tool.machineTool.description} · {tool.hours} h</p>
                                ))}
                                {operation.consumables.map((item) => (
                                  <p key={item.id}>
                                    Insumo: {item.quantity} {item.unitMeasure} de {item.item} · USD {Number(item.costUsd).toFixed(2)} / CUP {Number(item.costCup).toFixed(2)}
                                  </p>
                                ))}
                                {operation.outsourcedServices.map((service) => (
                                  <p key={service.id}>
                                    Servicio externo: {service.description} ({service.provider}) · USD {Number(service.costUsd).toFixed(2)} / CUP {Number(service.costCup).toFixed(2)}
                                  </p>
                                ))}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.status}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button className="mr-3 text-blue-700 hover:underline" onClick={() => void showPreview(order)}>Costos</button>
                      {order.status !== 'CLOSED' && order.status !== 'CANCELED' && (
                        <>
                          <button className="mr-3 text-slate-700 hover:underline" onClick={() => setSelectedOrder(order)}>Agregar trabajo</button>
                          {order.operations.length > 0 ? (
                            <button className="text-green-700 hover:underline" onClick={() => void closeOrder(order)}>Cerrar</button>
                          ) : (
                            <span className="text-xs text-slate-400">Agrega trabajo para cerrar</span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
