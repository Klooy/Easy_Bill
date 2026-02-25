import { useState, useMemo } from 'react';
import { ArrowLeft, Ban, PlayCircle, Plus, Package, Building2, Mail, Phone, MapPin, Calendar, Hash, CreditCard, AlertCircle, TrendingUp, Clock, Pencil, KeyRound, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sileo } from 'sileo';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useSeller, useCreditHistory } from '@/hooks/useSellers';
import { sellersService } from '@/services/sellers.service';
import { authService } from '@/services/auth.service';
import { assignCreditsSchema } from '@/lib/schemas/seller.schema';
import { SectionHeader } from '@/components/common/SectionHeader';

/* ── Info Item ─────────────────────────────────────── */
const InfoItem = ({ icon: Icon, label, value, mono = false, href }) => (
  <div className="flex items-start gap-3 py-2.5">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-input bg-gray-50 dark:bg-gray-700/50">
      <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-jakarta">{label}</p>
      {href ? (
        <a href={href} className={`mt-0.5 block text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline truncate ${mono ? 'font-mono' : 'font-jakarta'}`}>
          {value || '—'}
        </a>
      ) : (
        <p className={`mt-0.5 text-sm font-semibold text-gray-900 dark:text-white truncate ${mono ? 'font-mono' : 'font-jakarta'}`}>
          {value || '—'}
        </p>
      )}
    </div>
  </div>
);

/* ── Circular Progress ─────────────────────────────── */
const CircularProgress = ({ percent, size = 100, strokeWidth = 8, isLow = false }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const gradientColor = isLow ? '#f59e0b' : '#7C3AED';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-white/20" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={gradientColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }} />
    </svg>
  );
};

/* ── Quick Stat ─────────────────────────────────────── */
const QuickStat = ({ label, value, icon: Icon, color }) => {
  const colorMap = {
    primary: 'bg-primary-100/80 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    emerald: 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    blue: 'bg-blue-100/80 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <div className="flex items-center gap-3 rounded-input bg-gray-50/80 dark:bg-gray-700/30 p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-input ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-jakarta">{label}</p>
        <p className="font-outfit text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

/* ── Main Page ─────────────────────────────────────── */
const SellerDetailPage = () => {
  const { id } = useParams();
  const { seller, loading, error, refetch } = useSeller(id);
  const { history, loading: historyLoading, refetch: refetchHistory } = useCreditHistory(id);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assignCreditsSchema),
    defaultValues: { quantity: '', note: '' },
  });

  const creditStats = useMemo(() => {
    if (!seller) return { total: 0, percent: 0, isLow: false };
    const total = seller.invoice_quota + seller.invoice_used;
    const percent = total > 0 ? Math.round((seller.invoice_used / total) * 100) : 0;
    const isLow = seller.status === 'active' && seller.invoice_quota <= 5;
    return { total, percent, isLow };
  }, [seller]);

  const totalAssigned = useMemo(() => {
    return history.reduce((sum, pkg) => sum + (pkg.quantity || 0), 0);
  }, [history]);

  const handleSuspend = () => {
    setConfirmAction({
      type: 'suspend',
      title: 'Suspender vendedor',
      description: `¿Suspender a "${seller.company_name}"? No podrá emitir facturas.`,
    });
  };

  const handleReactivate = () => {
    setConfirmAction({
      type: 'reactivate',
      title: 'Reactivar vendedor',
      description: `¿Reactivar a "${seller.company_name}"? Podrá volver a emitir facturas.`,
    });
  };

  const handleConfirmAction = async () => {
    try {
      setActionLoading(true);
      if (confirmAction.type === 'suspend') {
        await sellersService.suspend(id);
        sileo.success({ title: 'Vendedor suspendido', description: `"${seller.company_name}" fue suspendido exitosamente.` });
      } else {
        await sellersService.reactivate(id);
        sileo.success({ title: 'Vendedor reactivado', description: `"${seller.company_name}" puede volver a emitir facturas.` });
      }
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al cambiar estado', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const onAssignCredits = async (data) => {
    try {
      setCreditsLoading(true);
      await sellersService.assignCredits(id, data.quantity, data.note);
      sileo.success({ title: `${data.quantity} créditos asignados`, description: `Créditos asignados a "${seller.company_name}" exitosamente.` });
      reset();
      setCreditsOpen(false);
      refetch();
      refetchHistory();
    } catch (err) {
      sileo.error({ title: 'Error al asignar créditos', description: err.message || 'Ocurrió un error inesperado.' });
    } finally {
      setCreditsLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Cargando vendedor..." />;

  const handleStartEdit = () => {
    setEditForm({
      company_name: seller.company_name || '',
      nit: seller.nit || '',
      phone: seller.phone || '',
      address: seller.address || '',
      city: seller.city || '',
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      setEditLoading(true);
      await sellersService.update(id, editForm);
      sileo.success({ title: 'Datos actualizados', description: `La información de "${editForm.company_name}" fue actualizada.` });
      setEditing(false);
      refetch();
    } catch (err) {
      sileo.error({ title: 'Error al actualizar', description: err.message });
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!seller.email) {
      sileo.error({ title: 'El vendedor no tiene email registrado' });
      return;
    }
    try {
      setResetLoading(true);
      await authService.resetPasswordForEmail(seller.email);
      sileo.success({ title: 'Enlace enviado', description: `Se envió un enlace de recuperación a ${seller.email}` });
    } catch (err) {
      sileo.error({ title: 'Error al enviar enlace', description: err.message || 'No se pudo enviar el enlace de recuperación.' });
    } finally {
      setResetLoading(false);
    }
  };

  if (error || !seller) {
    return (
      <div className="rounded-card bg-red-50 dark:bg-red-900/10 p-6 text-center">
        <p className="text-sm text-red-600 dark:text-red-400 font-jakarta">{error || 'Vendedor no encontrado'}</p>
        <Link to="/admin/sellers">
          <Button variant="outline" className="mt-3 rounded-input">Volver a vendedores</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/sellers">
            <Button variant="outline" size="icon" className="shrink-0 rounded-input">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-outfit font-bold text-lg">
              {seller.company_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-outfit text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{seller.company_name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-jakarta">
                  Registrado el {seller.created_at ? new Date(seller.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
                <StatusBadge status={seller.status} className="text-[10px] px-1.5 py-0 gap-1 whitespace-nowrap shrink-0" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-14 sm:ml-0">
          <Button
            onClick={() => setCreditsOpen(true)}
            className="min-h-[44px] flex-1 rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" />
            Asignar créditos
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-in-up stagger-1">
        <QuickStat icon={CreditCard} label="Disponibles" value={seller.invoice_quota} color={creditStats.isLow ? 'amber' : 'primary'} />
        <QuickStat icon={TrendingUp} label="Usados" value={seller.invoice_used} color="blue" />
        <QuickStat icon={Package} label="Total asignado" value={totalAssigned} color="emerald" />
        <QuickStat icon={Clock} label="Uso" value={`${creditStats.percent}%`} color={creditStats.percent >= 80 ? 'amber' : 'primary'} />
      </div>

      {/* Low credit alert */}
      {creditStats.isLow && (
        <div className="flex items-center gap-3 rounded-card bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 p-3 animate-fade-in-up stagger-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300 font-jakarta">Créditos bajos</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-jakarta">Este vendedor tiene solo {seller.invoice_quota} crédito{seller.invoice_quota !== 1 ? 's' : ''} disponible{seller.invoice_quota !== 1 ? 's' : ''}.</p>
          </div>
          <Button size="sm" className="shrink-0 rounded-input bg-amber-600 text-white hover:bg-amber-700" onClick={() => setCreditsOpen(true)}>
            Recargar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Seller info */}
          <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6 animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-2">
              <SectionHeader icon={Building2} title="Información de la empresa" description="Datos del vendedor y su empresa" color="primary" />
              {!editing && (
                <Button variant="outline" size="sm" className="rounded-input shrink-0" onClick={handleStartEdit}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Empresa</Label>
                    <Input className="rounded-input" value={editForm.company_name} onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">NIT</Label>
                    <Input className="rounded-input font-mono" value={editForm.nit} onChange={(e) => setEditForm((p) => ({ ...p, nit: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input className="rounded-input" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ciudad</Label>
                    <Input className="rounded-input" value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dirección</Label>
                  <Input className="rounded-input" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-input" onClick={() => setEditing(false)} disabled={editLoading}>Cancelar</Button>
                  <Button size="sm" className="rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white" onClick={handleSaveEdit} disabled={editLoading}>
                    {editLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {editLoading ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-0 divide-y divide-gray-50 dark:divide-gray-700/50 sm:grid-cols-2 sm:divide-y-0 sm:gap-x-6">
                <InfoItem icon={Building2} label="Empresa" value={seller.company_name} />
                <InfoItem icon={Hash} label="NIT" value={seller.nit} mono />
                <InfoItem icon={Mail} label="Email" value={seller.email} href={seller.email ? `mailto:${seller.email}` : undefined} />
                <InfoItem icon={Phone} label="Teléfono" value={seller.phone} href={seller.phone ? `tel:${seller.phone}` : undefined} />
                <InfoItem icon={MapPin} label="Dirección" value={seller.address} />
                <InfoItem icon={Calendar} label="Creado" value={seller.created_at ? new Date(seller.created_at).toLocaleDateString('es-CO') : '—'} />
              </div>
            )}
          </div>

          {/* Credit history */}
          <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-6 animate-fade-in-up stagger-3">
            <SectionHeader icon={Package} title="Historial de créditos" description={`${history.length} asignación${history.length !== 1 ? 'es' : ''} registrada${history.length !== 1 ? 's' : ''}`} color="emerald" />
            {historyLoading ? (
              <LoadingSpinner text="Cargando historial..." />
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-input border-2 border-dashed border-gray-200 dark:border-gray-700 py-8">
                <Package className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500 font-jakarta">Sin asignaciones registradas</p>
                <Button size="sm" variant="outline" className="mt-3 rounded-input" onClick={() => setCreditsOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Asignar créditos
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((pkg, i) => (
                  <div
                    key={pkg.id}
                    className={`flex items-center justify-between rounded-input border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white font-outfit">
                          +{pkg.quantity} créditos
                        </p>
                        {pkg.note && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-jakarta truncate">{pkg.note}</p>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 ml-2 text-xs text-gray-400 dark:text-gray-500 font-jakarta">
                      {new Date(pkg.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Credit card with circular progress */}
          <div className="rounded-card bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-lg animate-fade-in-up stagger-2">
            <div className="text-center">
              <p className="text-sm text-white/70 font-jakarta">Créditos disponibles</p>
              <div className="relative mx-auto mt-3 flex h-[120px] w-[120px] items-center justify-center">
                <CircularProgress percent={creditStats.percent} size={120} strokeWidth={8} isLow={creditStats.isLow} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-outfit text-3xl font-bold">{seller.invoice_quota}</span>
                  <span className="text-[10px] uppercase tracking-wider text-white/60">disponibles</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-input bg-white/10 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-white/50">Usados</p>
                <p className="font-outfit text-lg font-bold">{seller.invoice_used}</p>
              </div>
              <div className="rounded-input bg-white/10 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-white/50">Uso</p>
                <p className="font-outfit text-lg font-bold">{creditStats.percent}%</p>
              </div>
            </div>
            <Button
              onClick={() => setCreditsOpen(true)}
              className="mt-4 w-full min-h-[44px] rounded-input bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Asignar créditos
            </Button>
          </div>

          {/* Account actions */}
          <div className="rounded-card bg-white dark:bg-gray-800 p-4 shadow-card sm:p-5 animate-fade-in-up stagger-3">
            <h3 className="mb-3 font-outfit text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Gestión de cuenta</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full min-h-[44px] rounded-input"
                onClick={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                {resetLoading ? 'Enviando...' : 'Enviar reset de contraseña'}
              </Button>
              {seller.status === 'active' ? (
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] rounded-input border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                  onClick={handleSuspend}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Suspender vendedor
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] rounded-input border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                  onClick={handleReactivate}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Reactivar vendedor
                </Button>
              )}
            </div>
            <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 font-jakarta leading-relaxed">
              {seller.status === 'active'
                ? 'Suspender impide la emisión de facturas. Los datos se conservan.'
                : 'Reactivar permite al vendedor emitir facturas nuevamente.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Assign credits dialog */}
      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent className="rounded-card sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-outfit">Asignar créditos</DialogTitle>
                <DialogDescription className="font-jakarta text-xs">
                  Para {seller.company_name} — {seller.invoice_quota} disponibles actualmente
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAssignCredits)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="font-jakarta text-sm">Cantidad de créditos *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="50"
                className="rounded-input text-lg font-outfit font-bold"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity.message}</p>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-jakarta">Cada crédito permite emitir una factura electrónica</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note" className="font-jakarta text-sm">Nota (opcional)</Label>
              <Textarea
                id="note"
                placeholder="Recarga mensual, pago referencia #123..."
                className="rounded-input resize-none"
                rows={2}
                {...register('note')}
              />
            </div>
            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" className="rounded-input" onClick={() => setCreditsOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creditsLoading}
                className="rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white"
              >
                {creditsLoading ? 'Asignando...' : 'Asignar créditos'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.type === 'suspend' ? 'Suspender' : 'Reactivar'}
        variant={confirmAction?.type === 'suspend' ? 'destructive' : 'default'}
        loading={actionLoading}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};

export default SellerDetailPage;
