'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import { Protected } from '@/components/Protected';
import type { SubscriptionStatus } from '@/lib/types';

type Notice = { type: 'success' | 'error'; text: string };
type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral';

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const { lang } = useLang();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState<Notice | null>(null);
  const [isSubscriptionCtaVisible, setIsSubscriptionCtaVisible] = useState(false);
  const subscribeButtonRef = useRef<HTMLButtonElement>(null);

  const t = useCallback(
    (es: string, en: string) => (lang === 'es' ? es : en),
    [lang],
  );

  useEffect(() => {
    if (!showCancelDialog) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cancelling) setShowCancelDialog(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelling, showCancelDialog]);

  const status = user?.subscriptionStatus ?? 'none';
  const manualAccessEnd = user?.manualAccessEndsAt;
  const hasManualAccess = user?.accessSource === 'manual' && Boolean(manualAccessEnd);
  const endingSoon = !hasManualAccess && status === 'active' && Boolean(user?.cancelAtPeriodEnd);
  const shouldPulseSubscribe = !hasManualAccess && (status === 'none' || status === 'canceled' || status === 'unpaid');

  useEffect(() => {
    const button = subscribeButtonRef.current;
    if (!button || !shouldPulseSubscribe || subscribing) {
      setIsSubscriptionCtaVisible(false);
      return undefined;
    }

    let isOnScreen = true;
    const updatePulseState = () => setIsSubscriptionCtaVisible(isOnScreen && !document.hidden);
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          isOnScreen = entry.isIntersecting;
          updatePulseState();
        }, { threshold: 0.1 });

    observer?.observe(button);
    document.addEventListener('visibilitychange', updatePulseState);
    updatePulseState();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updatePulseState);
    };
  }, [subscribing, shouldPulseSubscribe, user]);

  if (!user) return null;

  const handleSubscribe = async () => {
    setSubscribing(true);
    setMessage(null);
    try {
      const result = await api.createCheckoutSession();
      if (result.reactivated) {
        setMessage({
          type: 'success',
          text: t(
            '¡Suscripción reactivada! Tu renovación automática está activa de nuevo.',
            'Subscription reactivated! Your automatic renewal is active again.',
          ),
        });
        await refreshUser();
        setSubscribing(false);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error
          ? err.message
          : t('Error al iniciar el pago', 'Failed to start checkout'),
      });
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setMessage(null);
    try {
      const result = await api.cancelSubscription();
      setShowCancelDialog(false);
      setMessage({ type: 'success', text: result.message });
      await refreshUser();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error
          ? err.message
          : t('Error al cancelar', 'Failed to cancel'),
      });
    } finally {
      setCancelling(false);
    }
  };

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(lang === 'es' ? 'es' : 'en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  const accessEnd = hasManualAccess ? manualAccessEnd : user.currentPeriodEnd;
  const periodEnd = accessEnd
    ? new Date(accessEnd).toLocaleDateString(lang === 'es' ? 'es' : 'en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const state = getSubscriptionState(status, endingSoon, hasManualAccess ? manualAccessEnd : undefined, t);
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="profile-shell">
      <section className="profile-hero" aria-labelledby="profile-title">
        <div className="profile-hero-copy">
          <div className="profile-avatar" aria-hidden="true">{initials || 'S'}</div>
          <div>
            <h1 id="profile-title">{user.name}</h1>
            <p>{t('Tu cuenta SkyMentor', 'Your SkyMentor account')}</p>
          </div>
        </div>

        <div className={`profile-hero-status profile-hero-status-${state.variant}`}>
          <ShieldCheck aria-hidden="true" />
          <div>
            <span>{t('Estado de acceso', 'Access status')}</span>
            <strong>{state.label}</strong>
          </div>
        </div>
      </section>

      <section className="profile-account" aria-labelledby="account-information-title">
        <div className="profile-section-heading">
          <div>
            <h2 id="account-information-title">{t('Información de cuenta', 'Account Information')}</h2>
            <p>{t('Tus datos de acceso y membresía.', 'Your access and membership details.')}</p>
          </div>
        </div>

        <dl className="profile-details-grid">
          <ProfileField icon={UserRound} label={t('Nombre', 'Name')} value={user.name} />
          <ProfileField icon={Mail} label={t('Correo', 'Email')} value={user.email} />
          <ProfileField icon={CalendarDays} label={t('Miembro desde', 'Member since')} value={joinedDate} />
        </dl>
      </section>

      <section
        className="profile-subscription"
        data-state={state.variant}
        aria-labelledby="subscription-title"
      >
        <div className="profile-section-heading profile-subscription-heading">
          <div>
            <h2 id="subscription-title">{hasManualAccess ? t('Acceso', 'Access') : t('Suscripción', 'Subscription')}</h2>
            <p>{hasManualAccess ? t('Tu acceso fue otorgado por un administrador.', 'Your access was granted by an administrator.') : t('Controla tu acceso a las herramientas de preparación.', 'Manage access to your prep tools.')}</p>
          </div>
          {!hasManualAccess && status === 'active' && !user.cancelAtPeriodEnd && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="profile-cancel-btn"
            >
              {t('Cancelar suscripción', 'Cancel Subscription')}
            </button>
          )}
        </div>

        <div className="profile-subscription-body">
          <div className={`profile-state-icon profile-state-icon-${state.variant}`}>
            <state.icon aria-hidden />
          </div>
          <div className="profile-subscription-copy">
            <StatusChip variant={state.variant}>{state.label}</StatusChip>
            <h3>{state.title}</h3>
            <p>{state.description}</p>
            {periodEnd && state.datePrefix && (
              <div className="profile-renewal-date">
                <CalendarDays aria-hidden="true" />
                <span>{state.datePrefix}</span>
                <strong>{periodEnd}</strong>
              </div>
            )}
          </div>

          {state.actionLabel && (
            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              ref={subscribeButtonRef}
              className={`btn-primary profile-subscription-action ${shouldPulseSubscribe && isSubscriptionCtaVisible ? 'profile-subscription-action--pulse' : ''}`}
            >
              {subscribing ? <InlineSpinner /> : <CreditCard aria-hidden="true" />}
              {state.actionLabel}
            </button>
          )}
        </div>
      </section>

      {message && (
        <div
          className={`profile-notice profile-notice-${message.type}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.type === 'success' ? <CheckCircle2 aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <p>{message.text}</p>
        </div>
      )}

      {showCancelDialog && (
        <div className="profile-modal-backdrop" role="presentation">
          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            aria-describedby="cancel-dialog-description"
          >
            <button
              onClick={() => setShowCancelDialog(false)}
              className="profile-modal-close"
              disabled={cancelling}
              aria-label={t('Cerrar', 'Close')}
            >
              <X aria-hidden="true" />
            </button>
            <div className="profile-modal-icon">
              <CircleAlert aria-hidden="true" />
            </div>
            <h3 id="cancel-dialog-title">{t('¿Cancelar suscripción?', 'Cancel subscription?')}</h3>
            <p id="cancel-dialog-description">
              {t(
                'Tu acceso continuará hasta el final del período de facturación actual. Después de eso, no podrás acceder a estudio, examen ni oral.',
                'Your access will continue until the end of the current billing period. After that, you will no longer be able to access study, exam, or oral practice.',
              )}
            </p>
            <div className="profile-modal-actions">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="btn"
                disabled={cancelling}
              >
                {t('Volver', 'Go Back')}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="profile-danger-btn"
              >
                {cancelling && <InlineSpinner />}
                {t('Sí, cancelar', 'Yes, Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSubscriptionState(
  status: SubscriptionStatus,
  endingSoon: boolean,
  manualAccessEndsAt: string | undefined,
  t: (es: string, en: string) => string,
): {
  variant: StatusVariant;
  label: string;
  title: string;
  description: string;
  actionLabel?: string;
  datePrefix: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
} {
  if (manualAccessEndsAt) {
    return {
      variant: 'success',
      label: t('Acceso otorgado', 'Access granted'),
      title: t('Acceso otorgado', 'Administrator-granted access'),
      description: t(
        '',
        '',
      ),
      datePrefix: t('Tu acceso termina el:', 'Your access ends on:'),
      icon: CheckCircle2,
    };
  }

  if (status === 'active' && !endingSoon) {
    return {
      variant: 'success',
      label: t('Activa', 'Active'),
      title: t('Acceso activo', 'Access active'),
      description: t(
        'Tu suscripción está activa y tus herramientas de estudio están disponibles.',
        'Your subscription is active and your study tools are available.',
      ),
      datePrefix: t('Próxima renovación:', 'Next renewal:'),
      icon: CheckCircle2,
    };
  }

  if (status === 'active' && endingSoon) {
    return {
      variant: 'warning',
      label: t('Cancela al final del período', 'Cancels at period end'),
      title: t('Tu acceso continúa por ahora', 'Your access continues for now'),
      description: t(
        'La suscripción no se renovará. Reactívala para mantener tu acceso sin interrupciones.',
        'Your subscription will not renew. Reactivate it to keep access without interruption.',
      ),
      actionLabel: t('Reactivar suscripción', 'Reactivate Subscription'),
      datePrefix: t('Tu acceso continúa hasta:', 'Your access continues until:'),
      icon: CircleAlert,
    };
  }

  if (status === 'canceled') {
    return {
      variant: 'neutral',
      label: t('Cancelada', 'Canceled'),
      title: t('Tu suscripción ha expirado', 'Your subscription has expired'),
      description: t(
        'Vuelve a suscribirte para continuar con tus prácticas.',
        'Resubscribe to continue your practice.',
      ),
      actionLabel: t('Suscribirse de nuevo', 'Subscribe Again'),
      datePrefix: '',
      icon: CircleAlert,
    };
  }

  if (status === 'past_due') {
    return {
      variant: 'danger',
      label: t('Pago pendiente', 'Payment Due'),
      title: t('Tu pago necesita atención', 'Your payment needs attention'),
      description: t(
        'Tu pago falló. Actualiza tu método de pago para mantener el acceso.',
        'Your payment failed. Update your payment method to maintain access.',
      ),
      actionLabel: t('Actualizar pago', 'Update Payment'),
      datePrefix: '',
      icon: CircleAlert,
    };
  }

  if (status === 'unpaid') {
    return {
      variant: 'danger',
      label: t('No pagado', 'Unpaid'),
      title: t('Tienes pagos pendientes', 'You have unpaid invoices'),
      description: t(
        'Actualiza tu suscripción para recuperar el acceso.',
        'Update your subscription to restore access.',
      ),
      actionLabel: t('Suscribirse', 'Subscribe'),
      datePrefix: '',
      icon: CircleAlert,
    };
  }

  return {
    variant: 'neutral',
    label: t('Sin suscripción activa', 'No active subscription'),
    title: t('Desbloquea tu preparación', 'Unlock your preparation'),
    description: t(
      'Suscríbete para acceder a todas las funciones de estudio, examen y práctica oral.',
      'Subscribe to access all study, exam, and oral-practice features.',
    ),
    actionLabel: t('Suscribirse', 'Subscribe'),
    datePrefix: '',
    icon: CreditCard,
  };
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="profile-detail">
      <Icon aria-hidden />
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}

const CHIP_STYLES = {
  success: 'profile-status-success',
  warning: 'profile-status-warning',
  danger: 'profile-status-danger',
  neutral: 'profile-status-neutral',
} as const;

function StatusChip({ variant, children }: { variant: StatusVariant; children: ReactNode }) {
  return (
    <span className={`profile-status-chip ${CHIP_STYLES[variant]}`}>
      <span aria-hidden="true" />
      {children}
    </span>
  );
}

function InlineSpinner() {
  return <span className="profile-inline-spinner" aria-hidden="true" />;
}

export default function ProfilePage() {
  return (
    <Protected>
      <ProfileContent />
    </Protected>
  );
}
