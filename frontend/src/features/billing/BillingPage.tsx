import { useEffect, useState } from 'react';
import { http } from '../../shared/api/http';

interface ClosedOrder {
  id: string;
  folio: string;
  closedAt: string;
  client: { name: string };
  vehicle: { plate: string; brand: string; model: string };
  costSummary: { invoiceTotalUsd: number | string; invoiceTotalCup: number | string } | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  currency: 'USD' | 'CUP';
  issueDate: string;
  dueDate: string | null;
  status: string;
  subtotalUsd: number | string;
  subtotalCup: number | string;
  totalUsd: number | string;
  totalCup: number | string;
  workOrder: {
    folio: string;
    releasedTo: string | null;
    client: { name: string };
    vehicle: { plate: string; brand: string; model: string };
    establishment: { name: string };
    costSummary: {
      salaryUsd: number | string; salaryCup: number | string;
      salaryOverheadUsd: number | string; salaryOverheadCup: number | string;
      depreciationUsd: number | string; depreciationCup: number | string;
      outsourcedUsd: number | string; outsourcedCup: number | string;
      consumablesUsd: number | string; consumablesCup: number | string;
      ppaUsd: number | string; ppaCup: number | string;
      totalCostUsd: number | string; totalCostCup: number | string;
      marginUsd: number | string; marginCup: number | string;
    } | null;
  };
  receivableItems: Array<{ amountUsd: number | string; amountCup: number | string; paidUsd: number | string; paidCup: number | string }>;
}

const money = (value: number | string | null | undefined) => Number(value ?? 0).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const invoiceStatusLabels: Record<string, string> = { ISSUED: 'Emitida', PARTIALLY_PAID: 'Pago parcial', PAID: 'Pagada' };

export function BillingPage() {
  const [ready, setReady] = useState<ClosedOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  async function reload() {
    const [readyResult, invoiceResult] = await Promise.all([
      http.get<ClosedOrder[]>('/billing/ready-to-invoice'),
      http.get<Invoice[]>('/billing/invoices'),
    ]);
    setReady(readyResult.data);
    setInvoices(invoiceResult.data);
  }

  useEffect(() => {
    reload().catch(() => setError('No se pudieron cargar las órdenes cerradas y las facturas.')).finally(() => setLoading(false));
  }, []);

  async function issue(order: ClosedOrder) {
    if (!window.confirm(`Se emitirán dos facturas independientes para ${order.folio}: una en USD y otra en CUP. ¿Continuar?`)) return;
    setIssuingId(order.id);
    setError('');
    setMessage('');
    try {
      await http.post(`/billing/work-orders/${order.id}/issue`, dueDate ? { dueDate: new Date(`${dueDate}T12:00:00`).toISOString() } : {});
      await reload();
      setMessage(`Facturas USD y CUP emitidas para ${order.folio}.`);
    } catch (requestError) {
      const responseMessage = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage ?? `No se pudo facturar ${order.folio}.`);
    } finally {
      setIssuingId('');
    }
  }

  function print(invoice: Invoice) {
    setPrintInvoice(invoice);
    window.setTimeout(() => window.print(), 100);
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Facturación</h2>
        <p className="mt-1 text-sm text-slate-600">Emite documentos separados en USD y CUP a partir del costo final de cada orden cerrada.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <section className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Órdenes listas para facturar</h3>
            <p className="mt-1 text-sm text-slate-500">Solo aparecen órdenes cerradas que aún no tienen facturas.</p>
          </div>
          <label className="text-sm font-medium">Vencimiento (opcional)
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="ml-2 rounded-lg border border-slate-300 px-3 py-2 font-normal" />
          </label>
        </div>
        {loading ? <p className="mt-4 text-sm text-slate-500">Cargando...</p> : ready.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No hay órdenes cerradas pendientes de facturar.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Orden</th><th className="p-3">Cliente / vehículo</th><th className="p-3">Cerrada</th><th className="p-3">USD</th><th className="p-3">CUP</th><th className="p-3">Acción</th></tr></thead>
              <tbody>{ready.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3 font-medium">{order.folio}</td>
                  <td className="p-3">{order.client.name}<br /><span className="text-xs text-slate-500">{order.vehicle.plate} · {order.vehicle.brand} {order.vehicle.model}</span></td>
                  <td className="p-3">{order.closedAt ? new Date(order.closedAt).toLocaleDateString() : '—'}</td>
                  <td className="p-3">{money(order.costSummary?.invoiceTotalUsd)}</td>
                  <td className="p-3">{money(order.costSummary?.invoiceTotalCup)}</td>
                  <td className="p-3"><button disabled={Boolean(issuingId)} onClick={() => void issue(order)} className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50">{issuingId === order.id ? 'Emitiendo...' : 'Emitir USD + CUP'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="text-lg font-semibold">Facturas emitidas</h3>
        {loading ? <p className="mt-4 text-sm text-slate-500">Cargando...</p> : invoices.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aún no se han emitido facturas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Factura</th><th className="p-3">Orden / cliente</th><th className="p-3">Fecha</th><th className="p-3">Moneda</th><th className="p-3">Total</th><th className="p-3">Estado</th><th className="p-3">Documento</th></tr></thead>
              <tbody>{invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="p-3">{invoice.workOrder.folio} · {invoice.workOrder.client.name}<br /><span className="text-xs text-slate-500">{invoice.workOrder.vehicle.plate}</span></td>
                  <td className="p-3">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                  <td className="p-3">{invoice.currency}</td>
                  <td className="p-3 font-semibold">{money(invoice.currency === 'USD' ? invoice.totalUsd : invoice.totalCup)} {invoice.currency}</td>
                  <td className="p-3">{invoiceStatusLabels[invoice.status] ?? invoice.status}</td>
                  <td className="p-3"><button className="text-blue-700 hover:underline" onClick={() => print(invoice)}>Ver / imprimir</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {printInvoice && <div className="invoice-print mx-auto max-w-3xl rounded-xl border bg-white p-8">
        <div className="mb-6 border-b pb-4">
          <p className="text-sm uppercase tracking-wide text-slate-500">{printInvoice.workOrder.establishment.name}</p>
          <h3 className="mt-2 text-2xl font-bold">Factura {printInvoice.currency}</h3>
          <p className="mt-1 font-semibold">{printInvoice.invoiceNumber}</p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Cliente: <strong>{printInvoice.workOrder.client.name}</strong></p>
          <p>Orden: <strong>{printInvoice.workOrder.folio}</strong></p>
          <p>Vehículo: <strong>{printInvoice.workOrder.vehicle.plate} · {printInvoice.workOrder.vehicle.brand} {printInvoice.workOrder.vehicle.model}</strong></p>
          <p>Entregado a: <strong>{printInvoice.workOrder.releasedTo || '—'}</strong></p>
          <p>Emisión: <strong>{new Date(printInvoice.issueDate).toLocaleDateString()}</strong></p>
          <p>Vencimiento: <strong>{printInvoice.dueDate ? new Date(printInvoice.dueDate).toLocaleDateString() : '—'}</strong></p>
        </div>
        {printInvoice.workOrder.costSummary && (() => {
          const summary = printInvoice.workOrder.costSummary;
          const isUsd = printInvoice.currency === 'USD';
          const rows: Array<[string, number | string]> = [
            ['Mano de obra', isUsd ? summary.salaryUsd : summary.salaryCup],
            ['Gastos asociados', isUsd ? summary.salaryOverheadUsd : summary.salaryOverheadCup],
            ['Depreciación de equipos', isUsd ? summary.depreciationUsd : summary.depreciationCup],
            ['Insumos', isUsd ? summary.consumablesUsd : summary.consumablesCup],
            ['Piezas y partes', isUsd ? summary.ppaUsd : summary.ppaCup],
            ['Servicios subcontratados', isUsd ? summary.outsourcedUsd : summary.outsourcedCup],
            ['Margen comercial', isUsd ? summary.marginUsd : summary.marginCup],
          ];
          return <table className="mt-8 w-full text-left text-sm">
            <thead><tr className="border-b"><th className="py-2">Concepto</th><th className="py-2 text-right">Importe {printInvoice.currency}</th></tr></thead>
            <tbody>{rows.map(([label, value]) => <tr key={label} className="border-b"><td className="py-2">{label}</td><td className="py-2 text-right">{money(value)}</td></tr>)}</tbody>
          </table>;
        })()}
        <div className="mt-6 border-t pt-4 text-right">
          <p className="text-xl font-bold">Total: {money(printInvoice.currency === 'USD' ? printInvoice.totalUsd : printInvoice.totalCup)} {printInvoice.currency}</p>
        </div>
        <button className="no-print mt-5 rounded-lg border px-4 py-2" onClick={() => window.print()}>Imprimir</button>
        <button className="no-print ml-2 mt-5 rounded-lg border px-4 py-2" onClick={() => setPrintInvoice(null)}>Cerrar</button>
      </div>}
    </section>
  );
}
