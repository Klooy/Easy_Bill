import { ArrowLeft, FileText, Download, Mail, Phone, MapPin, ExternalLink, Copy, FileMinus, Send, CopyPlus, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmissionOverlay } from '@/components/common/EmissionOverlay';
import { RadianEventsSection } from '@/components/invoice/RadianEventsSection';
import { FactusBillDialog } from '@/components/invoice/FactusBillDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { invoicesService } from '@/services/invoices.service';
import { factusService } from '@/services/factus.service';
import { formatCurrency, formatDateLong as formatDate } from '@/lib/format';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { useSellerQuota } from '@/hooks/useSellerQuota';

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh: refreshQuota } = useSellerQuota();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creditNotes, setCreditNotes] = useState([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingFromFactus, setDeletingFromFactus] = useState(false);
  const [confirmDeleteFactus, setConfirmDeleteFactus] = useState(false);
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await invoicesService.getById(id);
        setInvoice(data);
        // Fetch associated credit notes
        if (data.document_type !== 'credit_note') {
          const notes = await invoicesService.getCreditNotesByInvoice(id);
          setCreditNotes(notes || []);
        }
      } catch (err) {
        setError(err.message);
        sileo.error({ title: 'Error al cargar factura', description: err.message });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Link to="/invoices">
          <Button variant="outline" size="sm" className="rounded-input">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <div className="rounded-card bg-white dark:bg-gray-800 p-8 text-center shadow-card">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-red-500">{error || 'Factura no encontrada'}</p>
        </div>
      </div>
    );
  }

  const client = invoice.clients;
  const items = invoice.invoice_items || [];

  const handleCopyCufe = async () => {
    try {
      await navigator.clipboard.writeText(invoice.cufe);
      sileo.success({ title: 'CUFE copiado al portapapeles' });
    } catch {
      sileo.error({ title: 'No se pudo copiar el CUFE', description: 'Intenta copiar manualmente o verifica los permisos del navegador.' });
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice.number) return;
    setDownloadingPdf(true);
    try {
      const result = await factusService.downloadPdf(invoice.number);
      if (result.pdf_base64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${result.pdf_base64}`;
        link.download = `factura-${invoice.number}.pdf`;
        link.click();
        sileo.success({ title: 'PDF descargado exitosamente', duration: 6000 });
      } else if (result.pdf_url) {
        window.open(result.pdf_url, '_blank');
      }
    } catch (err) {
      sileo.error({ title: 'Error al descargar PDF', description: err.message });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    const email = invoice.clients?.email;
    if (!email) {
      sileo.error({ title: 'El cliente no tiene email registrado', description: 'Edita el cliente para agregar un email antes de enviar.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sileo.error({ title: 'El email del cliente no es válido', description: `"${email}" no parece ser un email válido.` });
      return;
    }
    setSendingEmail(true);
    try {
      if (invoice.document_type === 'credit_note') {
        await factusService.sendCreditNoteEmail(invoice.id, email);
        sileo.success({ title: `Nota crédito enviada a ${email}` });
      } else {
        await factusService.sendInvoiceEmail(invoice.id, email);
        sileo.success({ title: `Factura enviada a ${email}` });
      }
    } catch (err) {
      sileo.error({ title: 'Error al enviar email', description: err.message });
    } finally {
      setSendingEmail(false);
    }
  };

  const isInvoice = invoice.document_type !== 'credit_note';
  const docLabel = invoice.document_type === 'credit_note' ? 'Nota Crédito' : 'Factura';

  const handleDuplicate = () => {
    sileo.info({ title: 'Factura duplicada', description: 'Se copió la información. Puedes editarla antes de emitir.' });
    navigate('/invoices/new', { state: { duplicate: invoice } });
  };

  /* ── Delete from FACTUS (unvalidated/rejected) ── */
  const handleDeleteFromFactus = async () => {
    setDeletingFromFactus(true);
    try {
      await factusService.deleteUnvalidatedBill(invoice.reference_code, invoice.id);
      sileo.success({ title: 'Factura eliminada', description: 'La factura fue eliminada correctamente.' });
      navigate('/invoices');
    } catch (err) {
      sileo.error({ title: 'Error al eliminar de FACTUS', description: err.message });
    } finally {
      setDeletingFromFactus(false);
    }
  };

  /* ── Draft-specific actions ── */
  const handleEmitDraft = async () => {
    setEmitting(true);
    try {
      const result = await factusService.emitDraftInvoice(invoice.id, {
        maxRetries: 3,
        initialDelay: 3000,
        onRetry: (attempt, max) => {
          sileo.info({ title: `DIAN ocupada. Reintentando (${attempt}/${max})...` });
        },
      });

      // Reload invoice data
      const updated = await invoicesService.getById(id);
      setInvoice(updated);

      // Refresh quota in global store
      refreshQuota();

      const invoiceNumber = result.data?.number;

      sileo.success({
        title: `Factura ${invoiceNumber || ''} emitida`,
        description: `Validada exitosamente por la DIAN. Créditos: ${result.data?.credits_remaining ?? '—'}`,
        button: invoiceNumber ? {
          title: 'Descargar PDF',
          onClick: async () => {
            try {
              const pdf = await factusService.downloadPdf(invoiceNumber);
              if (pdf.pdf_base64) {
                const link = document.createElement('a');
                link.href = `data:application/pdf;base64,${pdf.pdf_base64}`;
                link.download = `factura-${invoiceNumber}.pdf`;
                link.click();
                sileo.success({ title: 'PDF descargado exitosamente', duration: 6000 });
              } else if (pdf.pdf_url) {
                window.open(pdf.pdf_url, '_blank');
              }
            } catch (err) {
              sileo.error({ title: 'Error al descargar PDF', description: err.message });
            }
          },
        } : undefined,
        duration: 15000,
      });
    } catch (error) {
      const isDianBusy = error.message?.includes('procesando otra factura') ||
        error.message?.includes('409');

      if (isDianBusy) {
        sileo.error({
          title: 'DIAN ocupada',
          description: 'Intenta de nuevo en unos segundos.',
          duration: 5000,
        });
      } else {
        sileo.error({ title: 'Error al emitir', description: error.message });
      }
    } finally {
      setEmitting(false);
    }
  };

  const handleEditDraft = () => {
    navigate('/invoices/new', { state: { editDraft: invoice } });
  };

  const handleDeleteDraft = async () => {
    setDeleting(true);
    try {
      await invoicesService.deleteDraft(id);
      sileo.success({ title: 'Borrador eliminado', description: 'El borrador fue eliminado permanentemente.' });
      navigate('/invoices');
    } catch (error) {
      sileo.error({ title: 'Error al eliminar', description: error.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <EmissionOverlay visible={emitting} onCancel={() => setEmitting(false)} />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/invoices">
            <Button variant="outline" size="icon" className="rounded-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
                {invoice.number || invoice.reference_code}
              </h1>
              {invoice.document_type === 'credit_note' && (
                <span className="rounded-badge bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  Nota Crédito
                </span>
              )}
              <span className={`whitespace-nowrap rounded-badge px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.status] || ''}`}>
                {STATUS_LABELS[invoice.status] || invoice.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{formatDate(invoice.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Draft actions */}
          {invoice.status === 'draft' && (
            <>
              <Button
                className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
                onClick={handleEmitDraft}
                disabled={emitting || deleting}
              >
                {emitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Emitiendo...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Emitir a DIAN
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px] rounded-input"
                onClick={handleEditDraft}
                disabled={emitting || deleting}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px] rounded-input text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                onClick={() => setConfirmDeleteDraft(true)}
                disabled={emitting || deleting}
              >
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Eliminar
              </Button>
            </>
          )}
          {invoice.number && (
            <Button
              variant="outline"
              className="min-h-[44px] rounded-input"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadingPdf ? 'Descargando...' : 'PDF'}
            </Button>
          )}
          {invoice.clients?.email && (
            <Button
              variant="outline"
              className="min-h-[44px] rounded-input"
              onClick={handleSendEmail}
              disabled={sendingEmail}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendingEmail ? 'Enviando...' : 'Enviar'}
            </Button>
          )}
          {isInvoice && invoice.status === 'issued' && (
            <Link to={`/invoices/${id}/credit-note`}>
              <Button variant="outline" className="min-h-[44px] rounded-input text-orange-600 border-orange-200 hover:bg-orange-50">
                <FileMinus className="mr-2 h-4 w-4" />
                Nota Crédito
              </Button>
            </Link>
          )}
          {isInvoice && (
            <Button
              variant="outline"
              className="min-h-[44px] rounded-input"
              onClick={handleDuplicate}
            >
              <CopyPlus className="mr-2 h-4 w-4" />
              Duplicar
            </Button>
          )}
          {/* View from FACTUS */}
          {invoice.number && invoice.status !== 'draft' && (
            <FactusBillDialog invoiceNumber={invoice.number} />
          )}
          {/* Delete from FACTUS (rejected/unvalidated) */}
          {invoice.status === 'rejected' && invoice.reference_code && (
            <Button
              variant="outline"
              className="min-h-[44px] rounded-input text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              onClick={() => setConfirmDeleteFactus(true)}
              disabled={deletingFromFactus}
            >
              {deletingFromFactus ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              Eliminar de FACTUS
            </Button>
          )}
        </div>
      </div>

      {/* Draft banner */}
      {invoice.status === 'draft' && (
        <div className="rounded-card border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-4 shadow-card">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-outfit text-sm font-semibold text-amber-800 dark:text-amber-400">
                Borrador — No emitida a la DIAN
              </p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500 font-jakarta">
                Esta factura aún no ha sido validada. Puedes editarla o emitirla cuando estés listo. No consume créditos hasta que se emita.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CUFE */}
      {invoice.cufe && (
        <div className="rounded-card bg-primary-50 dark:bg-primary-900/20 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary-700 font-jakarta">CUFE</p>
            <button
              onClick={handleCopyCufe}
              className="flex items-center gap-1 rounded-badge px-2 py-1 text-xs text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 transition-colors"
            >
              <Copy className="h-3 w-3" /> Copiar
            </button>
          </div>
          <p className="mt-1 break-all font-mono text-xs text-primary-600">{invoice.cufe}</p>
        </div>
      )}

      {/* QR Code */}
      {invoice.qr_url && (
        <div className="flex items-center gap-4 rounded-card bg-white dark:bg-gray-800 p-4 shadow-card">
          <img
            src={invoice.qr_url}
            alt="Código QR DIAN"
            className="h-24 w-24 rounded-badge border"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Código QR DIAN</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Escanea para validar en la DIAN</p>
            {invoice.cufe && (
              <a
                href={`https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${invoice.cufe}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Validar en DIAN
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client info */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <h2 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">Cliente</h2>
          {client ? (
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 dark:text-white">{client.names || client.company}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{client.identification}</p>
              {client.email && (
                <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 min-w-0">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" /> <span className="truncate">{client.email}</span>
                </p>
              )}
              {client.phone && (
                <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 min-w-0">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" /> <span className="truncate">{client.phone}</span>
                </p>
              )}
              {client.address && (
                <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 min-w-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" /> <span className="truncate">{client.address}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos de cliente</p>
          )}
        </div>

        {/* Payment info */}
        <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card">
          <h2 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">Pago</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Forma de pago</span>
              <span className="text-gray-900 dark:text-white">{invoice.payment_form_code === '1' ? 'Contado' : 'Crédito'}</span>
            </div>
            {invoice.payment_due_date && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Vencimiento</span>
                <span className="text-gray-900 dark:text-white">{formatDate(invoice.payment_due_date)}</span>
              </div>
            )}
            {invoice.observation && (
              <div className="mt-2 border-t pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Observaciones</p>
                <p className="mt-1 text-sm text-gray-700">{invoice.observation}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5">
        <h2 className="mb-4 font-outfit text-base font-semibold text-gray-900 dark:text-white">Ítems</h2>

        {/* Desktop table — hidden on mobile */}
        <div className="hidden sm:block -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="pb-2">Producto</th>
                <th className="pb-2 text-right">Cant.</th>
                <th className="pb-2 text-right">Precio unit.</th>
                <th className="pb-2 text-right">Desc.</th>
                <th className="pb-2 text-right">IVA</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.code_reference}</p>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">{item.quantity}</td>
                  <td className="whitespace-nowrap py-2 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="whitespace-nowrap py-2 text-right">{item.discount_rate}%</td>
                  <td className="whitespace-nowrap py-2 text-right">{item.is_excluded ? 'Excl.' : `${item.tax_rate}%`}</td>
                  <td className="whitespace-nowrap py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards — visible only on small screens */}
        <div className="space-y-3 sm:hidden">
          {items.map((item) => (
            <div key={item.id} className="rounded-[9px] border border-gray-100 dark:border-gray-700 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{item.code_reference}</p>
                </div>
                <span className="whitespace-nowrap rounded-[6px] bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 text-xs font-semibold text-primary-600 dark:text-primary-400 font-mono">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Cant.</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Precio</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono">{formatCurrency(item.unit_price)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Desc.</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.discount_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">IVA</p>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.is_excluded ? 'Excl.' : `${item.tax_rate}%`}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-1 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Base gravable</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Descuentos</span>
              <span className="text-red-500">-{formatCurrency(invoice.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">IVA</span>
            <span>{formatCurrency(invoice.tax_total)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span className="font-outfit text-gray-900 dark:text-white">Total</span>
            <span className="font-outfit text-primary-600">{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Related invoice (for credit notes) */}
      {invoice.related_invoice_id && (
        <div className="rounded-card bg-orange-50 p-4 shadow-card">
          <p className="text-xs font-semibold text-orange-700">FACTURA ORIGINAL</p>
          <Link
            to={`/invoices/${invoice.related_invoice_id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Ver factura original
          </Link>
        </div>
      )}

      {/* Credit notes associated */}
      {creditNotes.length > 0 && (
        <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5">
          <h2 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">
            Notas Crédito ({creditNotes.length})
          </h2>
          <div className="space-y-2">
            {creditNotes.map((note) => (
              <Link
                key={note.id}
                to={`/invoices/${note.id}`}
                className="flex items-center justify-between rounded-badge border p-3 transition-colors hover:bg-gray-50 dark:bg-gray-900"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{note.number || note.reference_code}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(note.created_at)}</p>
                </div>
                <p className="font-outfit text-sm font-bold text-red-600">-{formatCurrency(note.total)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* RADIAN Events (only for issued invoices with a number — credit notes don't support RADIAN) */}
      {invoice.number && invoice.status === 'issued' && isInvoice && (
        <RadianEventsSection invoiceNumber={invoice.number} />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDeleteFactus}
        onOpenChange={setConfirmDeleteFactus}
        title="Eliminar de FACTUS"
        description="¿Eliminar esta factura de FACTUS? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletingFromFactus}
        onConfirm={handleDeleteFromFactus}
      />
      <ConfirmDialog
        open={confirmDeleteDraft}
        onOpenChange={setConfirmDeleteDraft}
        title="Eliminar borrador"
        description="¿Eliminar este borrador? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteDraft}
      />
    </div>
  );
};

export default InvoiceDetailPage;
