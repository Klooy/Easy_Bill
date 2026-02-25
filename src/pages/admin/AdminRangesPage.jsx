import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Plus, Trash2, Loader2, Hash, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { factusService } from '@/services/factus.service';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const AdminRangesPage = () => {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    document: '01',
    prefix: '',
    from: '',
    to: '',
    current: '',
    resolution_number: '',
    resolution_date: '',
    resolution_date_end: '',
    technical_key: '',
  });

  const fetchRanges = useCallback(async () => {
    setLoading(true);
    try {
      const result = await factusService.listAllRanges();
      setRanges(result.data?.ranges || result.ranges || []);
    } catch (err) {
      sileo.error({ title: 'Error al cargar rangos', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRanges(); }, [fetchRanges]);

  const handleSyncDian = async () => {
    setSyncing(true);
    try {
      const result = await factusService.syncDianRanges();
      sileo.success({ title: 'Sincronización completada', description: 'Los rangos de numeración fueron sincronizados con la DIAN.' });
      await fetchRanges();
    } catch (err) {
      sileo.error({ title: 'Error al sincronizar con DIAN', description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!form.prefix || !form.from || !form.to || !form.resolution_number) {
      sileo.error({ title: 'Completa los campos requeridos', description: 'Prefijo, rango (desde/hasta) y número de resolución son obligatorios.' });
      return;
    }
    setCreating(true);
    try {
      await factusService.createRange({
        document: form.document,
        prefix: form.prefix,
        from: parseInt(form.from),
        to: parseInt(form.to),
        current: parseInt(form.current || form.from),
        resolution_number: form.resolution_number,
        resolution_date: form.resolution_date,
        resolution_date_end: form.resolution_date_end,
        technical_key: form.technical_key,
      });
      sileo.success({ title: 'Rango creado exitosamente', description: `Prefijo "${form.prefix}" registrado correctamente.` });
      setShowCreate(false);
      setForm({ document: '01', prefix: '', from: '', to: '', current: '', resolution_number: '', resolution_date: '', resolution_date_end: '', technical_key: '' });
      await fetchRanges();
    } catch (err) {
      sileo.error({ title: 'Error al crear rango', description: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (rangeId) => {
    setDeletingId(rangeId);
    try {
      await factusService.deleteRange(rangeId);
      sileo.success({ title: 'Rango eliminado', description: 'El rango de numeración fue eliminado permanentemente.' });
      await fetchRanges();
    } catch (err) {
      sileo.error({ title: 'Error al eliminar rango', description: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="outline" size="icon" className="rounded-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
              Rangos de Numeración
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestiona los rangos de numeración en FACTUS
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-[44px] rounded-input"
            onClick={handleSyncDian}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar DIAN
          </Button>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md">
                <Plus className="mr-2 h-4 w-4" />
                Crear rango
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95%] max-w-lg max-h-[92vh] overflow-y-auto rounded-card">
              <DialogHeader>
                <DialogTitle className="font-outfit">Crear rango de numeración</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Tipo de documento</Label>
                    <select
                      value={form.document}
                      onChange={handleFormChange('document')}
                      className="mt-1 w-full rounded-input border px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500 min-h-[44px]"
                    >
                      <option value="01">Factura de venta</option>
                      <option value="05">Nota crédito</option>
                      <option value="91">Nota crédito (DIAN)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Prefijo *</Label>
                    <Input
                      value={form.prefix}
                      onChange={handleFormChange('prefix')}
                      placeholder="SETT"
                      className="mt-1 min-h-[44px] rounded-input"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Desde *</Label>
                    <Input
                      type="number"
                      value={form.from}
                      onChange={handleFormChange('from')}
                      placeholder="1"
                      className="mt-1 min-h-[44px] rounded-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hasta *</Label>
                    <Input
                      type="number"
                      value={form.to}
                      onChange={handleFormChange('to')}
                      placeholder="5000"
                      className="mt-1 min-h-[44px] rounded-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Consecutivo actual</Label>
                    <Input
                      type="number"
                      value={form.current}
                      onChange={handleFormChange('current')}
                      placeholder="1"
                      className="mt-1 min-h-[44px] rounded-input"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">N.° Resolución *</Label>
                  <Input
                    value={form.resolution_number}
                    onChange={handleFormChange('resolution_number')}
                    placeholder="18760000001"
                    className="mt-1 min-h-[44px] rounded-input"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Fecha resolución</Label>
                    <Input
                      type="date"
                      value={form.resolution_date}
                      onChange={handleFormChange('resolution_date')}
                      className="mt-1 min-h-[44px] rounded-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Vigencia hasta</Label>
                    <Input
                      type="date"
                      value={form.resolution_date_end}
                      onChange={handleFormChange('resolution_date_end')}
                      className="mt-1 min-h-[44px] rounded-input"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Clave técnica</Label>
                  <Input
                    value={form.technical_key}
                    onChange={handleFormChange('technical_key')}
                    placeholder="fc8eac422eba16e22ffd8df..."
                    className="mt-1 min-h-[44px] rounded-input"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear rango'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Ranges list */}
      {ranges.length === 0 ? (
        <div className="rounded-card bg-white dark:bg-gray-800 p-8 text-center shadow-card">
          <Hash className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 font-outfit text-lg font-semibold text-gray-900 dark:text-white">
            Sin rangos de numeración
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crea un rango o sincroniza desde la DIAN
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranges.map((range) => (
            <RangeCard
              key={range.id}
              range={range}
              onDelete={(id) => setDeleteTargetId(id)}
              deleting={deletingId === range.id}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        title="Eliminar rango"
        description="¿Eliminar este rango de numeración? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={!!deletingId}
        onConfirm={() => handleDelete(deleteTargetId)}
      />
    </div>
  );
};

const RangeCard = ({ range, onDelete, deleting }) => {
  const [editing, setEditing] = useState(false);
  const [consecutive, setConsecutive] = useState(String(range.current || range.current_number || ''));
  const [saving, setSaving] = useState(false);

  const progress = (() => {
    const from = parseInt(range.from);
    const to = parseInt(range.to);
    const current = parseInt(range.current || range.current_number || range.from);
    if (!to || !from || to === from) return 0;
    const raw = Math.round(((current - from) / (to - from)) * 100);
    return Math.max(0, Math.min(100, raw));
  })();

  const isExpiring = range.resolution_date_end && new Date(range.resolution_date_end) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const handleSaveConsecutive = async () => {
    setSaving(true);
    try {
      await factusService.updateRangeConsecutive(range.id, parseInt(consecutive));
      sileo.success({ title: 'Consecutivo actualizado', description: `El consecutivo actual fue modificado exitosamente.` });
      setEditing(false);
    } catch (err) {
      sileo.error({ title: 'Error al actualizar', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const docType = range.document === '01' || range.document === 'invoice'
    ? 'Factura'
    : range.document === '05' || range.document === 'credit_note'
      ? 'Nota Crédito'
      : range.document || '—';

  return (
    <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-outfit text-lg font-bold text-gray-900 dark:text-white">
              {range.prefix}
            </span>
            <span className="rounded-badge bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 text-xs font-medium text-primary-600 dark:text-primary-400">
              {docType}
            </span>
            {isExpiring && (
              <span className="flex items-center gap-1 rounded-badge bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Por vencer
              </span>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <span className="text-xs text-gray-400">Resolución</span>
              <p className="font-mono text-gray-700 dark:text-gray-300">{range.resolution_number || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Rango</span>
              <p className="font-mono text-gray-700 dark:text-gray-300">{range.from} — {range.to}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Actual</span>
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={consecutive}
                    onChange={(e) => setConsecutive(e.target.value)}
                    className="h-7 w-20 rounded-input text-xs"
                  />
                  <Button size="sm" onClick={handleSaveConsecutive} disabled={saving} className="h-7 px-2 text-xs rounded-input">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 px-1 text-xs">✕</Button>
                </div>
              ) : (
                <p
                  className="font-mono text-primary-600 cursor-pointer hover:underline"
                  onClick={() => setEditing(true)}
                  title="Click para editar"
                >
                  {range.current || range.current_number || range.from}
                </p>
              )}
            </div>
            <div>
              <span className="text-xs text-gray-400">Vigencia</span>
              <p className="text-gray-700 dark:text-gray-300">{range.resolution_date_end || '—'}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Uso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  progress > 80 ? 'bg-red-500' : progress > 50 ? 'bg-amber-500' : 'bg-primary-500'
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="shrink-0 rounded-input text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
          onClick={() => onDelete(range.id)}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default AdminRangesPage;
