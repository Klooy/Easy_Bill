import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Loader2, Send, Info } from 'lucide-react';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { factusService } from '@/services/factus.service';

// As an ISSUER, you can only emit event 034 (Aceptación Tácita).
// Events 030-033 are emitted by the RECEIVER of the invoice.
const EMITTABLE_EVENTS = [
  { code: '034', label: 'Aceptación tácita', description: 'El receptor no emitió reclamo ni aceptación expresa en 3 días hábiles' },
];

// All event types for display purposes
const ALL_EVENT_TYPES = [
  { code: '030', label: 'Acuse de recibo' },
  { code: '031', label: 'Reclamo' },
  { code: '032', label: 'Recibo del bien o servicio' },
  { code: '033', label: 'Aceptación expresa' },
  { code: '034', label: 'Aceptación tácita' },
];

const RadianEventsSection = ({ invoiceNumber }) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState(null);
  const [emitting, setEmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');

  const handleToggle = async () => {
    const opening = !expanded;
    setExpanded(opening);
    if (opening && !events) {
      await loadEvents();
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const result = await factusService.getRadianEvents(invoiceNumber);
      setEvents(result.data?.events || result.events || []);
    } catch (err) {
      sileo.error({ title: 'Error al cargar eventos RADIAN', description: err.message });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmitEvent = async () => {
    if (!selectedEvent) {
      sileo.error({ title: 'Selecciona un tipo de evento', description: 'Debes elegir un evento RADIAN antes de emitir.' });
      return;
    }

    setEmitting(true);
    try {
      const payload = {
        invoice_number: invoiceNumber,
        event_type: selectedEvent,
      };

      await factusService.emitRadianEvent(payload);
      sileo.success({ title: 'Evento RADIAN emitido', description: 'El evento fue registrado exitosamente ante la DIAN.' });
      setSelectedEvent('');
      await loadEvents();
    } catch (err) {
      sileo.error({ title: 'Error al emitir evento', description: err.message });
    } finally {
      setEmitting(false);
    }
  };

  return (
    <div className="rounded-card bg-white dark:bg-gray-800 shadow-card overflow-hidden">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary-500" />
          <span className="font-outfit text-base font-semibold text-gray-900 dark:text-white">
            Eventos RADIAN
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Events list */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
              <span className="ml-2 text-sm text-gray-500">Cargando eventos...</span>
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map((evt, i) => (
                <div key={i} className="flex items-center justify-between rounded-badge border p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ALL_EVENT_TYPES.find((e) => e.code === evt.event_code)?.label || evt.event_name || evt.event_code}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {evt.effective_date ? `${evt.effective_date} ${evt.effective_time || ''}`.trim() : evt.date || evt.created_at || '—'}
                    </p>
                  </div>
                  <span className="rounded-badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
                    Emitido
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 py-2">Sin eventos RADIAN registrados</p>
          )}

          {/* Emit new event */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Emitir evento</p>

            <div className="flex items-start gap-2 rounded-badge bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Como emisor de la factura, solo puedes generar la <strong>Aceptación tácita</strong> (evento 034).
                Los eventos 030-033 son emitidos por el receptor de tu factura.
              </p>
            </div>

            <div>
              <Label className="text-xs">Tipo de evento</Label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="mt-1 w-full rounded-input border px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500 min-h-[44px]"
              >
                <option value="">Seleccionar...</option>
                {EMITTABLE_EVENTS.map((et) => (
                  <option key={et.code} value={et.code}>{et.label}</option>
                ))}
              </select>
              {selectedEvent && (
                <p className="mt-1 text-xs text-gray-500">
                  {EMITTABLE_EVENTS.find((e) => e.code === selectedEvent)?.description}
                </p>
              )}
            </div>

            <Button
              onClick={handleEmitEvent}
              disabled={emitting || !selectedEvent}
              className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md"
            >
              {emitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Emitiendo...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Emitir evento RADIAN
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export { RadianEventsSection };
