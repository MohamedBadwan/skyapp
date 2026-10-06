'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  Ticket,
  X,
} from 'lucide-react';
import { Protected } from '@/components/Protected';
import { Spinner } from '@/components/Spinner';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import type { AdminCoupon, CouponCreateInput, CouponDiscountType, CouponDuration, CouponState } from '@/lib/types';

type Notice = { type: 'success' | 'error'; text: string };
type CouponUsageMode = 'single' | 'limited';

const emptyDraft = {
  name: '',
  code: '',
  discountType: 'percentage' as CouponDiscountType,
  discountValue: '',
  duration: 'once' as CouponDuration,
  durationInMonths: '2',
  redeemBy: '',
  usageMode: 'single' as CouponUsageMode,
  maxRedemptions: '2',
};

function CouponsContent() {
  const { lang } = useLang();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const t = useCallback((es: string, en: string) => (lang === 'es' ? es : en), [lang]);
  const activeCount = useMemo(() => coupons.filter((coupon) => coupon.state === 'active').length, [coupons]);

  const loadCoupons = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const result = await api.admin.listCoupons();
      setCoupons(result.coupons);
    } catch (error) {
      setCoupons([]);
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudieron cargar los cupones.', 'We could not load the coupons.'),
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const submitCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const payload: CouponCreateInput = {
        name: draft.name.trim(),
        code: draft.code.trim().toUpperCase(),
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue),
        duration: draft.duration,
        ...(draft.duration === 'repeating' ? { durationInMonths: Number(draft.durationInMonths) } : {}),
        ...(draft.redeemBy ? { redeemBy: draft.redeemBy } : {}),
        maxRedemptions: draft.usageMode === 'single' ? 1 : Number(draft.maxRedemptions),
      };
      const result = await api.admin.createCoupon(payload);
      setCoupons((current) => [result.coupon, ...current]);
      setDraft(emptyDraft);
      setNotice({ type: 'success', text: t('Cupón creado y habilitado en Stripe.', 'Coupon created and enabled in Stripe.') });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo crear el cupón.', 'We could not create the coupon.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const updateCouponState = async (coupon: AdminCoupon, action: 'deactivate' | 'reactivate') => {
    if (action === 'deactivate' && !window.confirm(t(
      `¿Desactivar ${coupon.code}? Los nuevos clientes ya no podrán usarlo.`,
      `Deactivate ${coupon.code}? New customers will no longer be able to use it.`,
    ))) return;

    setUpdatingId(coupon.id);
    setNotice(null);
    try {
      const result = action === 'deactivate'
        ? await api.admin.deactivateCoupon(coupon.id)
        : await api.admin.reactivateCoupon(coupon.id);
      setCoupons((current) => current.map((item) => (item.id === coupon.id ? result.coupon : item)));
      setNotice({
        type: 'success',
        text: action === 'deactivate'
          ? t('El cupón fue desactivado.', 'The coupon was deactivated.')
          : t('El cupón fue reactivado.', 'The coupon was reactivated.'),
      });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo actualizar el cupón.', 'We could not update the coupon.'),
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const discountLabel = draft.discountType === 'percentage'
    ? t('Porcentaje de descuento', 'Discount percentage')
    : t('Monto de descuento', 'Discount amount');

  return (
    <div className="coupons-shell">
      <header className="coupons-page-header">
        <div className="coupons-title-row">
          <span className="coupons-title-icon"><Ticket aria-hidden="true" /></span>
          <div>
            <h1>{t('Cupones', 'Coupons')}</h1>
            <p>{t('Crea ofertas para Stripe y controla cuándo los clientes pueden canjearlas.', 'Create Stripe offers and control when customers can redeem them.')}</p>
          </div>
        </div>
        <p className="coupons-page-context">
          <strong>{activeCount}</strong> {activeCount === 1 ? t('cupón activo', 'active coupon') : t('cupones activos', 'active coupons')}
        </p>
      </header>

      {notice && (
        <div className={`coupons-notice coupons-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.type === 'success' ? <CheckCircle2 aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <p>{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label={t('Cerrar mensaje', 'Dismiss message')}><X aria-hidden="true" /></button>
        </div>
      )}

      <div className="coupons-workspace">
        <section className="coupons-composer" aria-labelledby="coupon-create-title">
          <div className="coupons-section-heading">
            <BadgePercent aria-hidden="true" />
            <div>
              <h2 id="coupon-create-title">{t('Crear cupón', 'Create coupon')}</h2>
              <p>{t('La fecha limita los canjes; la duración define cuánto recibe cada suscriptor.', 'The date limits redemptions; duration defines each subscriber’s benefit.')}</p>
            </div>
          </div>

          <form className="coupon-form" onSubmit={submitCoupon}>
            <label className="coupon-field">
              <span>{t('Nombre interno', 'Internal name')}</span>
              <input
                className="input"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder={t('Promoción de bienvenida', 'Welcome promotion')}
                minLength={2}
                maxLength={40}
                required
              />
            </label>

            <label className="coupon-field">
              <span>{t('Código para el cliente', 'Customer code')}</span>
              <input
                className="input coupon-code-input"
                value={draft.code}
                onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                placeholder="WELCOME20"
                pattern="[A-Za-z0-9-]+"
                minLength={3}
                maxLength={64}
                autoCapitalize="characters"
                required
              />
              <small>{t('Letras, números y guiones. Se mostrará en Stripe.', 'Letters, numbers, and dashes. This is shown in Stripe.')}</small>
            </label>

            <div className="coupon-split-fields">
              <label className="coupon-field">
                <span>{t('Tipo de descuento', 'Discount type')}</span>
                <select
                  className="input"
                  value={draft.discountType}
                  onChange={(event) => setDraft((current) => ({ ...current, discountType: event.target.value as CouponDiscountType }))}
                >
                  <option value="percentage">{t('Porcentaje', 'Percentage')}</option>
                  <option value="fixed">{t('Monto fijo', 'Fixed amount')}</option>
                </select>
              </label>
              <label className="coupon-field">
                <span>{discountLabel}</span>
                <div className="coupon-value-input">
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    max={draft.discountType === 'percentage' ? 100 : undefined}
                    step={draft.discountType === 'percentage' ? '0.01' : '0.01'}
                    value={draft.discountValue}
                    onChange={(event) => setDraft((current) => ({ ...current, discountValue: event.target.value }))}
                    required
                  />
                  <span>{draft.discountType === 'percentage' ? '%' : 'USD'}</span>
                </div>
              </label>
            </div>

            <label className="coupon-field">
              <span>{t('Duración del descuento', 'Discount duration')}</span>
              <select
                className="input"
                value={draft.duration}
                onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value as CouponDuration }))}
              >
                <option value="once">{t('Solo el primer ciclo de facturación', 'First billing cycle only')}</option>
                <option value="repeating">{t('Por varios meses', 'For a number of months')}</option>
                <option value="forever">{t('Todos los ciclos de la suscripción', 'Every subscription cycle')}</option>
              </select>
            </label>

            {draft.duration === 'repeating' && (
              <label className="coupon-field coupon-months-field">
                <span>{t('Meses con descuento', 'Discounted months')}</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="36"
                  step="1"
                  value={draft.durationInMonths}
                  onChange={(event) => setDraft((current) => ({ ...current, durationInMonths: event.target.value }))}
                  required
                />
                <small>{t('Por ejemplo: 2 meses con descuento y luego el precio normal.', 'For example: 2 discounted months, then the regular price.')}</small>
              </label>
            )}

            <label className="coupon-field coupon-usage-field">
              <span>{t('Límite de usos', 'Usage limit')}</span>
              <select
                className="input"
                value={draft.usageMode}
                onChange={(event) => setDraft((current) => ({ ...current, usageMode: event.target.value as CouponUsageMode }))}
              >
                <option value="single">{t('Un solo uso', 'Single use')}</option>
                <option value="limited">{t('Cantidad específica', 'Specific quantity')}</option>
              </select>
              <small>{t('Stripe bloqueará el código cuando alcance este límite.', 'Stripe will block the code once it reaches this limit.')}</small>
            </label>

            {draft.usageMode === 'limited' && (
              <label className="coupon-field coupon-max-redemptions-field">
                <span>{t('Cantidad máxima de usos', 'Maximum uses')}</span>
                <input
                  className="input"
                  type="number"
                  min="2"
                  max="1000000"
                  step="1"
                  value={draft.maxRedemptions}
                  onChange={(event) => setDraft((current) => ({ ...current, maxRedemptions: event.target.value }))}
                  required
                />
                <small>{t('Por ejemplo: 25 personas podrán canjear este código.', 'For example: 25 people can redeem this code.')}</small>
              </label>
            )}

            <label className="coupon-field coupon-expiry-field">
              <span>{t('Canjeable hasta', 'Redeemable until')} <em>{t('(opcional)', '(optional)')}</em></span>
              <input
                className="input"
                type="date"
                min={getToday()}
                value={draft.redeemBy}
                onChange={(event) => setDraft((current) => ({ ...current, redeemBy: event.target.value }))}
              />
              <small><CalendarClock aria-hidden="true" /> {t('Válido hasta el final de ese día.', 'Valid through the end of that date.')}</small>
            </label>

            <button className="btn-primary coupon-create-button" type="submit" disabled={saving}>
              {saving ? <LoaderCircle className="coupon-button-spinner" aria-hidden="true" /> : <Ticket aria-hidden="true" />}
              {saving ? t('Creando cupón…', 'Creating coupon…') : t('Crear cupón', 'Create coupon')}
            </button>
          </form>
        </section>

        <section className="coupons-inventory" aria-labelledby="coupon-inventory-title" aria-live="polite">
          <div className="coupons-inventory-head">
            <div>
              <h2 id="coupon-inventory-title">{t('Cupones creados', 'Created coupons')}</h2>
              <p>{t('La disponibilidad se controla en Stripe; los descuentos ya aplicados no cambian.', 'Availability is controlled in Stripe; discounts already applied do not change.')}</p>
            </div>
            {!loading && <span>{coupons.length}</span>}
          </div>

          {loading ? (
            <div className="coupons-loading" aria-label={t('Cargando cupones', 'Loading coupons')}><Spinner variant="inline" /></div>
          ) : coupons.length === 0 ? (
            <div className="coupons-empty">
              <Ticket aria-hidden="true" />
              <h3>{t('Aún no hay cupones', 'No coupons yet')}</h3>
              <p>{t('Crea tu primera oferta para que aparezca aquí y pueda canjearse durante el pago.', 'Create your first offer to list it here and make it redeemable during checkout.')}</p>
            </div>
          ) : (
            <ul className="coupon-list">
              {coupons.map((coupon) => (
                <li key={coupon.id} className="coupon-entry">
                  <div className="coupon-entry-primary">
                    <div className="coupon-entry-heading">
                      <div>
                        <code>{coupon.code}</code>
                        <h3>{coupon.name}</h3>
                      </div>
                      <CouponStateBadge state={coupon.state} t={t} />
                    </div>
                    <dl className="coupon-details">
                      <CouponDetail icon={BadgePercent} label={t('Descuento', 'Discount')} value={formatDiscount(coupon, lang)} />
                      <CouponDetail icon={Clock3} label={t('Duración', 'Duration')} value={formatDuration(coupon, t)} />
                      <CouponDetail icon={Ticket} label={t('Usos', 'Uses')} value={formatUses(coupon, t)} />
                      <CouponDetail icon={CalendarClock} label={t('Canjeable hasta', 'Redeemable until')} value={formatRedeemBy(coupon, lang, t)} />
                    </dl>
                  </div>
                  <div className="coupon-entry-action">
                    {coupon.state === 'active' ? (
                      <button
                        className="coupon-action-button coupon-action-pause"
                        onClick={() => void updateCouponState(coupon, 'deactivate')}
                        disabled={updatingId === coupon.id}
                      >
                        {updatingId === coupon.id ? <LoaderCircle className="coupon-button-spinner" aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
                        {t('Desactivar', 'Deactivate')}
                      </button>
                    ) : coupon.state === 'inactive' ? (
                      <button
                        className="coupon-action-button coupon-action-play"
                        onClick={() => void updateCouponState(coupon, 'reactivate')}
                        disabled={updatingId === coupon.id}
                      >
                        {updatingId === coupon.id ? <LoaderCircle className="coupon-button-spinner" aria-hidden="true" /> : <PlayCircle aria-hidden="true" />}
                        {t('Reactivar', 'Reactivate')}
                      </button>
                    ) : (
                      <span className="coupon-expired-note">{t('No se puede reactivar', 'Cannot be reactivated')}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function CouponDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgePercent;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt><Icon aria-hidden="true" />{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CouponStateBadge({ state, t }: { state: CouponState; t: (es: string, en: string) => string }) {
  const labels: Record<CouponState, string> = {
    active: t('Activo', 'Active'),
    inactive: t('Desactivado', 'Inactive'),
    expired: t('Vencido', 'Expired'),
    exhausted: t('Agotado', 'Used up'),
  };
  return <span className={`coupon-state coupon-state-${state}`}>{labels[state]}</span>;
}

function formatDiscount(coupon: AdminCoupon, lang: 'es' | 'en'): string {
  if (coupon.discountType === 'percentage') return `${coupon.percentOff ?? 0}%`;
  const currency = coupon.currency?.toUpperCase() ?? 'USD';
  const fractionDigits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const amount = (coupon.amountOff ?? 0) / (10 ** fractionDigits);
  return new Intl.NumberFormat(lang === 'es' ? 'es' : 'en', { style: 'currency', currency }).format(amount);
}

function formatDuration(coupon: AdminCoupon, t: (es: string, en: string) => string): string {
  if (coupon.duration === 'once') return t('Primer ciclo', 'First cycle');
  if (coupon.duration === 'forever') return t('Toda la suscripción', 'Entire subscription');
  return t(`${coupon.durationInMonths} meses`, `${coupon.durationInMonths} months`);
}

function formatRedeemBy(coupon: AdminCoupon, lang: 'es' | 'en', t: (es: string, en: string) => string): string {
  if (!coupon.redeemBy) return t('Sin fecha límite', 'No expiry date');
  return new Date(coupon.redeemBy).toLocaleDateString(lang === 'es' ? 'es' : 'en', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatUses(coupon: AdminCoupon, t: (es: string, en: string) => string): string {
  if (coupon.maxRedemptions === undefined) return t('Sin límite', 'Unlimited');
  return `${coupon.timesRedeemed} / ${coupon.maxRedemptions}`;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CouponsPage() {
  return <Protected requireAdmin><CouponsContent /></Protected>;
}
