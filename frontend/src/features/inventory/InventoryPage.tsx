import { FormEvent, useEffect, useState } from 'react';
import { http } from '../../shared/api/http';

interface Warehouse {
  id: string;
  code: string | null;
  name: string;
  _count: { stocks: number };
}

interface Stock {
  id: string;
  stockOnHand: number | string;
  averageCostUsd: number | string;
  averageCostCup: number | string;
  warehouse: { id: string; code: string | null; name: string };
  movements?: Array<{
    id: string;
    type: string;
    quantity: number | string;
    reference: string | null;
    createdAt: string;
    warehouse: { name: string };
  }>;
}

interface InventoryItem {
  id: string;
  sku: string;
  description: string;
  unitMeasure: string;
  averageCostUsd: number | string;
  averageCostCup: number | string;
  stocks: Stock[];
}

interface CatalogData {
  warehouses: Warehouse[];
  inventoryItems: InventoryItem[];
}

const emptyData: CatalogData = { warehouses: [], inventoryItems: [] };
const fieldClass = 'w-full rounded-lg border border-slate-300 px-3 py-2';

export function InventoryPage() {
  const [data, setData] = useState<CatalogData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warehouseForm, setWarehouseForm] = useState({ code: '', name: '' });
  const [itemForm, setItemForm] = useState({
    sku: '',
    description: '',
    unitMeasure: 'unidad',
    averageCostUsd: '0',
    averageCostCup: '0',
  });
  const [movement, setMovement] = useState({
    inventoryItemId: '',
    warehouseId: '',
    type: 'IN',
    quantity: '',
    unitCostUsd: '',
    unitCostCup: '',
    reference: '',
    notes: '',
  });

  async function reload() {
    const { data: catalogs } = await http.get<CatalogData>('/catalogs');
    setData(catalogs);
  }

  useEffect(() => {
    reload().catch(() => setError('No se pudieron cargar los almacenes e insumos.')).finally(() => setLoading(false));
  }, []);

  async function createWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/catalogs/warehouses', { code: warehouseForm.code || undefined, name: warehouseForm.name });
      setWarehouseForm({ code: '', name: '' });
      await reload();
    } catch {
      setError('No se pudo guardar el almacén. Verifica que el código no esté repetido.');
    } finally {
      setSaving(false);
    }
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/catalogs/inventory-items', {
        ...itemForm,
        averageCostUsd: Number(itemForm.averageCostUsd),
        averageCostCup: Number(itemForm.averageCostCup),
      });
      setItemForm({ sku: '', description: '', unitMeasure: 'unidad', averageCostUsd: '0', averageCostCup: '0' });
      await reload();
    } catch {
      setError('No se pudo guardar el insumo. Verifica que el código no esté repetido.');
    } finally {
      setSaving(false);
    }
  }

  async function recordMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/catalogs/inventory-movements', {
        inventoryItemId: movement.inventoryItemId,
        warehouseId: movement.warehouseId,
        type: movement.type,
        quantity: Number(movement.quantity),
        unitCostUsd: movement.unitCostUsd ? Number(movement.unitCostUsd) : undefined,
        unitCostCup: movement.unitCostCup ? Number(movement.unitCostCup) : undefined,
        reference: movement.reference || undefined,
        notes: movement.notes || undefined,
      });
      setMovement((current) => ({ ...current, quantity: '', reference: '', notes: '' }));
      await reload();
    } catch (requestError) {
      const responseMessage = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage ?? 'No se pudo registrar el movimiento. Revisa las existencias y los datos.');
    } finally {
      setSaving(false);
    }
  }

  const selectedItem = data.inventoryItems.find((item) => item.id === movement.inventoryItemId);
  const selectedStock = selectedItem?.stocks.find((stock) => stock.warehouse.id === movement.warehouseId);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Insumos y almacenes</h2>
        <p className="mt-1 text-sm text-slate-600">Registra códigos y precios; controla entradas, salidas y conteos por almacén. Al consumir un insumo desde una orden, las existencias se descuentan automáticamente.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-lg font-semibold">Almacenes</h3>
        <form onSubmit={createWarehouse} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <label className="text-sm font-medium">Código (Versat)
            <input value={warehouseForm.code} onChange={(event) => setWarehouseForm({ ...warehouseForm, code: event.target.value })} className={`${fieldClass} mt-1 font-normal`} placeholder="Ej.: A01" />
          </label>
          <label className="text-sm font-medium">Nombre del almacén
            <input required value={warehouseForm.name} onChange={(event) => setWarehouseForm({ ...warehouseForm, name: event.target.value })} className={`${fieldClass} mt-1 font-normal`} placeholder="Ej.: Almacén principal" />
          </label>
          <button disabled={saving} className="self-end rounded-lg bg-slate-900 px-4 py-2 text-white">Agregar almacén</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.warehouses.map((warehouse) => (
            <span key={warehouse.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
              {warehouse.code ? `${warehouse.code} · ` : ''}{warehouse.name}
            </span>
          ))}
          {!loading && !data.warehouses.length && <p className="text-sm text-slate-500">Agrega el primer almacén para comenzar.</p>}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-lg font-semibold">Catálogo de insumos</h3>
        <form onSubmit={createItem} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium">Código (Versat / SKU)
            <input required value={itemForm.sku} onChange={(event) => setItemForm({ ...itemForm, sku: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Descripción
            <input required value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Unidad
            <input required value={itemForm.unitMeasure} onChange={(event) => setItemForm({ ...itemForm, unitMeasure: event.target.value })} className={`${fieldClass} mt-1 font-normal`} placeholder="unidad, litro, kg..." />
          </label>
          <label className="text-sm font-medium">Costo unitario USD
            <input required type="number" min="0" step="0.0001" value={itemForm.averageCostUsd} onChange={(event) => setItemForm({ ...itemForm, averageCostUsd: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <label className="text-sm font-medium">Costo unitario CUP
            <input required type="number" min="0" step="0.0001" value={itemForm.averageCostCup} onChange={(event) => setItemForm({ ...itemForm, averageCostCup: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-white lg:col-span-5 lg:justify-self-start">Agregar insumo</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">El insumo se crea sin existencias. Registra una entrada inicial en el almacén correspondiente.</p>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-lg font-semibold">Movimiento de almacén</h3>
        <p className="mt-1 text-sm text-slate-500">Entrada para compras o saldo inicial; salida para ajuste manual; conteo físico para reemplazar la existencia por la cantidad contada. Las salidas de órdenes se registran automáticamente.</p>
        <form onSubmit={recordMovement} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">Insumo
            <select required value={movement.inventoryItemId} onChange={(event) => setMovement({ ...movement, inventoryItemId: event.target.value, warehouseId: '' })} className={`${fieldClass} mt-1 font-normal`}>
              <option value="">Selecciona insumo</option>{data.inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.description}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Almacén
            <select required value={movement.warehouseId} onChange={(event) => setMovement({ ...movement, warehouseId: event.target.value })} className={`${fieldClass} mt-1 font-normal`}>
              <option value="">Selecciona almacén</option>{data.warehouses.map((item) => <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ''}{item.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Tipo de movimiento
            <select value={movement.type} onChange={(event) => setMovement({ ...movement, type: event.target.value })} className={`${fieldClass} mt-1 font-normal`}>
              <option value="IN">Entrada / saldo inicial</option><option value="OUT">Salida manual</option><option value="ADJUSTMENT">Conteo físico (reemplazar saldo)</option>
            </select>
          </label>
          <label className="text-sm font-medium">{movement.type === 'ADJUSTMENT' ? 'Cantidad contada' : 'Cantidad'}
            <input required type="number" min={movement.type === 'ADJUSTMENT' ? '0' : '0.001'} step="0.001" value={movement.quantity} onChange={(event) => setMovement({ ...movement, quantity: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
            {selectedStock && <span className="mt-1 block text-xs text-slate-500">Existencia actual: {selectedStock.stockOnHand} {selectedItem?.unitMeasure}</span>}
          </label>
          {movement.type !== 'OUT' && (
            <>
              <label className="text-sm font-medium">Costo unitario USD
                <input type="number" min="0" step="0.0001" value={movement.unitCostUsd} onChange={(event) => setMovement({ ...movement, unitCostUsd: event.target.value })} placeholder={String(selectedStock?.averageCostUsd ?? selectedItem?.averageCostUsd ?? 0)} className={`${fieldClass} mt-1 font-normal`} />
              </label>
              <label className="text-sm font-medium">Costo unitario CUP
                <input type="number" min="0" step="0.0001" value={movement.unitCostCup} onChange={(event) => setMovement({ ...movement, unitCostCup: event.target.value })} placeholder={String(selectedStock?.averageCostCup ?? selectedItem?.averageCostCup ?? 0)} className={`${fieldClass} mt-1 font-normal`} />
              </label>
            </>
          )}
          <label className="text-sm font-medium">Referencia / documento
            <input value={movement.reference} onChange={(event) => setMovement({ ...movement, reference: event.target.value })} className={`${fieldClass} mt-1 font-normal`} placeholder="Factura, vale..." />
          </label>
          <label className="text-sm font-medium">Nota
            <input value={movement.notes} onChange={(event) => setMovement({ ...movement, notes: event.target.value })} className={`${fieldClass} mt-1 font-normal`} />
          </label>
          <button disabled={saving || !data.warehouses.length || !data.inventoryItems.length} className="rounded-lg bg-blue-700 px-4 py-2 text-white lg:col-span-4 lg:justify-self-start">
            {saving ? 'Guardando...' : 'Registrar movimiento'}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4"><h3 className="font-semibold">Existencias por almacén</h3></div>
        {loading ? <p className="p-5 text-sm text-slate-500">Cargando inventario...</p> : !data.inventoryItems.length ? (
          <p className="p-5 text-sm text-slate-500">No hay insumos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Código</th><th className="p-3">Insumo</th><th className="p-3">Almacén</th><th className="p-3">Existencia</th><th className="p-3">Costo unitario USD / CUP</th><th className="p-3">Último movimiento</th></tr></thead>
              <tbody>{data.inventoryItems.flatMap((item) => item.stocks.length ? item.stocks.map((stock) => (
                <tr key={stock.id} className="border-t">
                  <td className="p-3">{item.sku}</td><td className="p-3">{item.description}</td><td className="p-3">{stock.warehouse.code ? `${stock.warehouse.code} · ` : ''}{stock.warehouse.name}</td>
                  <td className="p-3">{stock.stockOnHand} {item.unitMeasure}</td><td className="p-3">{Number(stock.averageCostUsd).toFixed(4)} / {Number(stock.averageCostCup).toFixed(4)}</td>
                  <td className="p-3">{stock.movements?.[0] ? `${stock.movements[0].type} · ${stock.movements[0].quantity} · ${new Date(stock.movements[0].createdAt).toLocaleDateString()}` : '—'}</td>
                </tr>
              )) : [<tr key={item.id} className="border-t"><td className="p-3">{item.sku}</td><td className="p-3">{item.description}</td><td className="p-3 text-slate-500" colSpan={4}>Sin existencias asignadas a un almacén.</td></tr>])}</tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
