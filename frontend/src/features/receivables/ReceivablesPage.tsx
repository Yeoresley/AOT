import { FormEvent, useEffect, useState } from 'react';
import { http } from '../../shared/api/http';

interface Receivable {
  id: string;
  dueDate: string;
  amountUsd: number | string;
  amountCup: number | string;
  paidUsd: number | string;
  paidCup: number | string;
  status: string;
  invoice: {
    invoiceNumber: string;
    currency: 'USD' | 'CUP';
    workOrder: { folio: string; client: { name: string }; vehicle: { plate: string; brand: string; model: string } };
  };
  payments: Array<{ id: string; amount: number | string; paymentMethod: string; reference: string | null; receivedAt: string }>;
}

const money = (value: number | string) => Number(value).toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const methodLabels: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro' };

export function ReceivablesPage() {
  const [items, setItems] = useState<Receivable[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function reload() {
    const { data } = await http.get<Receivable[]>('/receivables');
    setItems(data);
  }

  useEffect(() => {
    reload().catch(() => setError('No se pudieron cargar las cuentas por cobrar.')).finally(() => setLoading(false));
  }, []);

  async function collect(event: FormEvent<HTMLFormElement>, item: Receivable) {
    event.preventDefault();
    const amount = Number(amounts[item.id]);
    setSavingId(item.id);
    setError('');
    setMessage('');
    try {
      await http.post(`/receivables/${item.id}/payments`, {
        amount,
        paymentMethod: methods[item.id] || 'CASH',
        reference: references[item.id] || undefined,
      });
      setAmounts((current) => ({ ...current, [item.id]: '' }));
      setReferences((current) => ({ ...current, [item.id]: '' }));
      await reload();
      setMessage(`Cobro de ${money(amount)} ${item.invoice.currency} registrado en ${item.invoice.invoiceNumber}.`);
    } catch (requestError) {
      const responseMessage = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage ?? 'No se pudo registrar el cobro.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Cuentas por cobrar</h2>
        <p className="mt-1 text-sm text-slate-600">Cada saldo se cobra en la misma moneda de su factura; USD y CUP nunca se convierten ni se mezclan.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4"><h3 className="font-semibold">Saldos pendientes</h3></div>
        {loading ? <p className="p-5 text-sm text-slate-500">Cargando cuentas...</p> : !items.length ? (
          <p className="p-5 text-sm text-slate-500">No hay saldos pendientes. Las facturas emitidas aparecerán aquí.</p>
        ) : (
          <div className="divide-y">
            {items.map((item) => {
              const isUsd = item.invoice.currency === 'USD';
              const total = Number(isUsd ? item.amountUsd : item.amountCup);
              const paid = Number(isUsd ? item.paidUsd : item.paidCup);
              const balance = Math.max(0, total - paid);
              return <article key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{item.invoice.invoiceNumber}</h4>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium">{item.invoice.currency}</span>
                    <span className="text-xs text-slate-500">{item.status === 'PARTIALLY_PAID' ? 'Pago parcial' : 'Pendiente'}</span>
                  </div>
                  <p className="mt-1 text-sm">{item.invoice.workOrder.folio} · {item.invoice.workOrder.client.name}</p>
                  <p className="text-sm text-slate-500">{item.invoice.workOrder.vehicle.plate} · {item.invoice.workOrder.vehicle.brand} {item.invoice.workOrder.vehicle.model}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span>Factura: <strong>{money(total)} {item.invoice.currency}</strong></span>
                    <span>Pagado: <strong>{money(paid)} {item.invoice.currency}</strong></span>
                    <span>Saldo: <strong>{money(balance)} {item.invoice.currency}</strong></span>
                    <span>Vence: <strong>{new Date(item.dueDate).toLocaleDateString()}</strong></span>
                  </div>
                  {item.payments.length > 0 && <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-blue-700">Ver cobros registrados ({item.payments.length})</summary>
                    <ul className="mt-2 space-y-1">{item.payments.map((payment) => (
                      <li key={payment.id}>{new Date(payment.receivedAt).toLocaleDateString()} · {money(payment.amount)} {item.invoice.currency} · {methodLabels[payment.paymentMethod] ?? payment.paymentMethod}{payment.reference ? ` · ${payment.reference}` : ''}</li>
                    ))}</ul>
                  </details>}
                </div>
                <form onSubmit={(event) => void collect(event, item)} className="grid content-start gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">Cobrar {item.invoice.currency}
                    <input required type="number" min="0.0001" max={balance} step="0.0001" value={amounts[item.id] ?? ''} onChange={(event) => setAmounts((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" placeholder={balance.toFixed(2)} />
                  </label>
                  <label className="text-sm font-medium">Forma de pago
                    <select value={methods[item.id] ?? 'CASH'} onChange={(event) => setMethods((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal">
                      <option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="CARD">Tarjeta</option><option value="OTHER">Otro</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">Referencia (opcional)
                    <input value={references[item.id] ?? ''} onChange={(event) => setReferences((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" placeholder="Recibo, transferencia..." />
                  </label>
                  <button disabled={Boolean(savingId) || balance <= 0} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50 sm:col-span-2">{savingId === item.id ? 'Registrando...' : 'Registrar cobro'}</button>
                </form>
              </article>;
            })}
          </div>
        )}
      </section>
    </section>
  );
}
