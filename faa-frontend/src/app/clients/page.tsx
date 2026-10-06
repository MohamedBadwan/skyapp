'use client';

import { Protected } from '@/components/Protected';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { api } from '@/lib/api';
import type { AdminUser, ManualAccessGrantInput, SubscriptionEventType, SubscriptionHistoryEntry } from '@/lib/types';
import {
  BadgeCheck,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  CircleX,
  CreditCard,
  Edit3,
  LoaderCircle,
  Mail,
  Power,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';

type Notice = { type: 'success' | 'error'; text: string };
type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral';
type Filter = 'all' | 'active' | 'ending' | 'inactive';
type AccessLength = 'date' | 'months';
type SubscriptionChoice = 'none' | 'manual';

const emptyStudentDraft = {
  name: '',
  email: '',
  subscription: 'none' as SubscriptionChoice,
  accessLength: 'date' as AccessLength,
  accessEndsOn: '',
  accessDurationMonths: '2',
};

function ClientsContent() {
  const { user: currentUser } = useAuth();
  const { lang } = useLang();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [studentDraft, setStudentDraft] = useState(emptyStudentDraft);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [grantLength, setGrantLength] = useState<AccessLength>('date');
  const [grantEndsOn, setGrantEndsOn] = useState('');
  const [grantDurationMonths, setGrantDurationMonths] = useState('2');
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);
  const [updatingAccessId, setUpdatingAccessId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AdminUser | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const t = useCallback((es: string, en: string) => (lang === 'es' ? es : en), [lang]);

  const loadUsers = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const result = await api.admin.listUsers();
      setUsers(result.users);
      setSelectedId((current) => (
        current && result.users.some((user) => user.id === current)
          ? current
          : result.users[0]?.id ?? null
      ));
    } catch (error) {
      setUsers([]);
      setSelectedId(null);
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudieron cargar los clientes.', 'We could not load the clients.'),
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!cancelTarget) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !cancelling) setCancelTarget(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelTarget, cancelling]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || `${user.name} ${user.email}`.toLocaleLowerCase().includes(query);
      if (!matchesQuery) return false;
      if (filter === 'active') return user.active && hasCurrentAccess(user) && !user.cancelAtPeriodEnd;
      if (filter === 'ending') return user.active && user.subscriptionStatus === 'active' && user.cancelAtPeriodEnd;
      if (filter === 'inactive') return !user.active;
      return true;
    });
  }, [filter, search, users]);

  const selectedUser = users.find((user) => user.id === selectedId) ?? null;
  const activeSubscriptions = users.filter((user) => user.active && hasCurrentAccess(user)).length;
  const endingSubscriptions = users.filter((user) => user.subscriptionStatus === 'active' && user.cancelAtPeriodEnd).length;
  const disabledUsers = users.filter((user) => !user.active).length;

  const selectUser = (user: AdminUser) => {
    setSelectedId(user.id);
    setEditing(false);
    setGrantLength('date');
    setGrantEndsOn('');
    setGrantDurationMonths('2');
    setNotice(null);
  };

  const beginEditing = () => {
    if (!selectedUser) return;
    setDraft({ name: selectedUser.name, email: selectedUser.email });
    setEditing(true);
    setNotice(null);
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setNotice(null);
    try {
      await api.admin.updateUser(selectedUser.id, {
        name: draft.name.trim(),
        email: draft.email.trim(),
      });
      setEditing(false);
      await loadUsers(false);
      setNotice({ type: 'success', text: t('Datos del cliente actualizados.', 'Client details updated.') });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo actualizar el cliente.', 'We could not update the client.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleUserAccess = async () => {
    if (!selectedUser) return;
    setUpdatingAccessId(selectedUser.id);
    setNotice(null);
    try {
      await api.admin.setUserActive(selectedUser.id, !selectedUser.active);
      await loadUsers(false);
      setNotice({
        type: 'success',
        text: selectedUser.active
          ? t('El acceso del cliente fue desactivado.', 'Client access has been deactivated.')
          : t('El acceso del cliente fue reactivado.', 'Client access has been reactivated.'),
      });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo actualizar el acceso.', 'We could not update access.'),
      });
    } finally {
      setUpdatingAccessId(null);
    }
  };

  const cancelSubscription = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setNotice(null);
    try {
      const result = await api.admin.cancelUserSubscription(cancelTarget.id);
      setCancelTarget(null);
      await loadUsers(false);
      setNotice({ type: 'success', text: result.message });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo cancelar la suscripción.', 'We could not cancel the subscription.'),
      });
    } finally {
      setCancelling(false);
    }
  };

  const createStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingStudent(true);
    setNotice(null);
    try {
      const result = await api.admin.createStudent({
        name: studentDraft.name.trim(),
        email: studentDraft.email.trim(),
        locale: lang,
        ...(studentDraft.subscription === 'manual'
          ? getAccessGrantInput(studentDraft.accessLength, studentDraft.accessEndsOn, studentDraft.accessDurationMonths)
          : {}),
      });
      setStudentDraft(emptyStudentDraft);
      setShowCreateStudent(false);
      await loadUsers(false);
      setSelectedId(result.user.id);
      setNotice({ type: 'success', text: t('El estudiante fue creado y recibió su invitación por correo.', 'The student was created and received their email invitation.') });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo crear el estudiante.', 'We could not create the student.'),
      });
    } finally {
      setCreatingStudent(false);
    }
  };

  const grantManualAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser || (grantLength === 'date' ? !grantEndsOn : !grantDurationMonths)) return;
    setGrantingAccess(true);
    setNotice(null);
    try {
      await api.admin.grantManualAccess(
        selectedUser.id,
        getAccessGrantInput(grantLength, grantEndsOn, grantDurationMonths),
      );
      setGrantLength('date');
      setGrantEndsOn('');
      setGrantDurationMonths('2');
      await loadUsers(false);
      setNotice({ type: 'success', text: t('El acceso manual fue actualizado.', 'Manual access was updated.') });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo actualizar el acceso manual.', 'We could not update manual access.'),
      });
    } finally {
      setGrantingAccess(false);
    }
  };

  const resendInvitation = async () => {
    if (!selectedUser) return;
    setResendingInvitationId(selectedUser.id);
    setNotice(null);
    try {
      const result = await api.admin.resendInvitation(selectedUser.id, lang);
      await loadUsers(false);
      setNotice({ type: 'success', text: result.message });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : t('No se pudo reenviar la invitación.', 'We could not resend the invitation.'),
      });
    } finally {
      setResendingInvitationId(null);
    }
  };

  return (
    <div className="clients-shell">
      <header className="clients-page-header">
        <div>
          <div className="clients-title-row">
            <span className="clients-title-icon"><UsersRound aria-hidden="true" /></span>
            <h1>{t('Clientes', 'Clients')}</h1>
          </div>
          <p>{t('Gestiona el acceso, la facturación y los datos de cada estudiante.', 'Manage every student’s access, billing, and account details.')}</p>
        </div>
        <div className="clients-header-actions">
          <div className="clients-overview" aria-label={t('Resumen de clientes', 'Client overview')}>
            <span><strong>{users.length}</strong>{t(' total', ' total')}</span>
            <span><strong>{activeSubscriptions}</strong>{t(' con acceso', ' with access')}</span>
            {endingSubscriptions > 0 && <span className="clients-overview-warning"><strong>{endingSubscriptions}</strong>{t(' por vencer', ' ending')}</span>}
            {disabledUsers > 0 && <span className="clients-overview-muted"><strong>{disabledUsers}</strong>{t(' desactivados', ' disabled')}</span>}
          </div>
          <button
            type="button"
            className="clients-primary-button"
            onClick={() => {
              setShowCreateStudent((visible) => !visible);
              setNotice(null);
            }}
            aria-expanded={showCreateStudent}
          >
            <UserPlus aria-hidden="true" /> {showCreateStudent ? t('Cerrar formulario', 'Close form') : t('Crear estudiante', 'Create student')}
          </button>
        </div>
      </header>

      {showCreateStudent && (
        <section className="clients-create-panel" aria-labelledby="create-student-title">
          <div className="clients-create-copy">
            <span className="clients-create-icon"><UserPlus aria-hidden="true" /></span>
            <div>
              <h2 id="create-student-title">{t('Invita un estudiante', 'Invite a student')}</h2>
              <p>{t('La invitación llega a su correo para que elija su contraseña. Puedes crear la cuenta sin suscripción o asignarle una suscripción manual sin cargos ni renovación.', 'An email invitation lets them choose a password. Create the account without a subscription or assign a manual subscription with no charge or renewal.')}</p>
            </div>
          </div>
          <form className="clients-create-form" onSubmit={createStudent}>
            <label htmlFor="create-student-name">
              <span>{t('Nombre completo', 'Full name')}</span>
              <input id="create-student-name" className="input" value={studentDraft.name} onChange={(event) => setStudentDraft((draft) => ({ ...draft, name: event.target.value }))} autoComplete="name" required />
            </label>
            <label htmlFor="create-student-email">
              <span>{t('Correo electrónico', 'Email address')}</span>
              <input id="create-student-email" className="input" type="email" value={studentDraft.email} onChange={(event) => setStudentDraft((draft) => ({ ...draft, email: event.target.value }))} autoComplete="email" required />
            </label>
            <fieldset className="clients-access-length">
              <legend>{t('Suscripción', 'Subscription')}</legend>
              <label className="clients-access-option">
                <input type="radio" name="create-subscription" checked={studentDraft.subscription === 'none'} onChange={() => setStudentDraft((draft) => ({ ...draft, subscription: 'none' }))} />
                <span>{t('Sin suscripción', 'No subscription')}</span>
              </label>
              <label className="clients-access-option">
                <input type="radio" name="create-subscription" checked={studentDraft.subscription === 'manual'} onChange={() => setStudentDraft((draft) => ({ ...draft, subscription: 'manual' }))} />
                <span>{t('Suscripción manual', 'Manual subscription')}</span>
              </label>
            </fieldset>
            {studentDraft.subscription === 'manual' && (
              <>
                <fieldset className="clients-access-length">
                  <legend>{t('Duración de la suscripción', 'Subscription duration')}</legend>
                  <label className="clients-access-option">
                    <input type="radio" name="create-subscription-length" checked={studentDraft.accessLength === 'date'} onChange={() => setStudentDraft((draft) => ({ ...draft, accessLength: 'date' }))} />
                    <span>{t('Fecha específica', 'Specific date')}</span>
                  </label>
                  <label className="clients-access-option">
                    <input type="radio" name="create-subscription-length" checked={studentDraft.accessLength === 'months'} onChange={() => setStudentDraft((draft) => ({ ...draft, accessLength: 'months' }))} />
                    <span>{t('Cantidad de meses', 'Number of months')}</span>
                  </label>
                </fieldset>
                {studentDraft.accessLength === 'date' ? (
                  <label htmlFor="create-student-access-end">
                    <span>{t('Suscripción vigente hasta', 'Subscription through')}</span>
                    <input id="create-student-access-end" className="input" type="date" value={studentDraft.accessEndsOn} min={getMinimumAccessDate()} onChange={(event) => setStudentDraft((draft) => ({ ...draft, accessEndsOn: event.target.value }))} required />
                    <small>{t('La suscripción manual termina al final del día elegido.', 'The manual subscription ends at the end of the selected day.')}</small>
                  </label>
                ) : (
                  <label htmlFor="create-student-access-months">
                    <span>{t('Cantidad de meses', 'Number of months')}</span>
                    <input id="create-student-access-months" className="input" type="number" min="1" max="36" step="1" value={studentDraft.accessDurationMonths} onChange={(event) => setStudentDraft((draft) => ({ ...draft, accessDurationMonths: event.target.value }))} required />
                    <small>{t('Meses calendario completos, de 1 a 36.', 'Whole calendar months, from 1 to 36.')}</small>
                  </label>
                )}
              </>
            )}
            <button className="clients-primary-button clients-create-submit" type="submit" disabled={creatingStudent || !studentDraft.name.trim() || !studentDraft.email.trim() || (studentDraft.subscription === 'manual' && (studentDraft.accessLength === 'date' ? !studentDraft.accessEndsOn : !studentDraft.accessDurationMonths))}>
              {creatingStudent ? <LoaderCircle className="clients-button-spinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {t('Crear y enviar invitación', 'Create and send invitation')}
            </button>
          </form>
        </section>
      )}

      {notice && (
        <div className={`clients-notice clients-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.type === 'success' ? <CheckCircle2 aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          <p>{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label={t('Cerrar mensaje', 'Dismiss message')}><X aria-hidden="true" /></button>
        </div>
      )}

      {loading ? (
        <section className="clients-loading" aria-label={t('Cargando clientes', 'Loading clients')}>
          <Spinner variant="inline" />
        </section>
      ) : (
        <div className="clients-workspace">
          <aside className="clients-directory" aria-label={t('Lista de clientes', 'Client list')}>
            <div className="clients-directory-header">
              <div className="clients-search">
                <Search aria-hidden="true" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('Buscar por nombre o correo', 'Search name or email')}
                  aria-label={t('Buscar clientes', 'Search clients')}
                />
              </div>
              <div className="clients-filter-row" role="group" aria-label={t('Filtrar clientes', 'Filter clients')}>
                {([
                  ['all', t('Todos', 'All')],
                  ['active', t('Activos', 'Active')],
                  ['ending', t('Por vencer', 'Ending')],
                  ['inactive', t('Desactivados', 'Disabled')],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={filter === value ? 'clients-filter-active' : ''}
                    aria-pressed={filter === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="clients-directory-count">
              {filteredUsers.length} {filteredUsers.length === 1 ? t('resultado', 'result') : t('resultados', 'results')}
            </div>

            <div className="clients-list" role="list">
              {filteredUsers.map((user) => {
                const status = getSubscriptionMeta(user, t);
                const initials = getInitials(user.name);
                return (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={`client-row ${user.id === selectedUser?.id ? 'client-row-selected' : ''}`}
                    role="listitem"
                  >
                    <span className="client-avatar" aria-hidden="true">{initials}</span>
                    <span className="client-row-copy">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </span>
                    <span className={`client-status client-status-${status.variant}`}>
                      <span aria-hidden="true" />
                      {status.label}
                    </span>
                  </button>
                );
              })}
              {filteredUsers.length === 0 && (
                <div className="clients-empty-list">
                  <Search aria-hidden="true" />
                  <p>{t('No hay clientes que coincidan con esta búsqueda.', 'No clients match this search.')}</p>
                </div>
              )}
            </div>
          </aside>

          <section className="client-detail" aria-live="polite">
            {selectedUser ? (
              <>
                <div className="client-detail-header">
                  <div className="client-detail-person">
                    <span className="client-avatar client-avatar-large" aria-hidden="true">{getInitials(selectedUser.name)}</span>
                    <div>
                      <div className="client-detail-name-row">
                        <h2>{selectedUser.name}</h2>
                        {selectedUser.role === 'admin' && <span className="client-role"><ShieldCheck aria-hidden="true" /> {t('Administrador', 'Administrator')}</span>}
                        {selectedUser.role === 'student' && <InvitationStateBadge state={selectedUser.invitationState} t={t} />}
                      </div>
                      <p>{selectedUser.email}</p>
                    </div>
                  </div>
                  {!editing && (
                    <button className="clients-secondary-button" onClick={beginEditing}>
                      <Edit3 aria-hidden="true" /> {t('Editar cliente', 'Edit client')}
                    </button>
                  )}
                </div>

                <div className="client-detail-section">
                  <div className="client-section-heading">
                    <div>
                      <h3>{t('Acceso y suscripción', 'Access & subscription')}</h3>
                      <p>{t('Estado actual del acceso y de la renovación.', 'Current access and renewal status.')}</p>
                    </div>
                  </div>
                  <div className="client-subscription-summary">
                    <SubscriptionSummary user={selectedUser} lang={lang} t={t} />
                    <div className="client-access-control">
                      <div>
                        <strong>{selectedUser.active ? t('Cuenta activa', 'Account active') : t('Cuenta desactivada', 'Account disabled')}</strong>
                        <span>{selectedUser.id === currentUser?.id
                          ? t('Tu propia cuenta de administrador debe mantenerse activa.', 'Your administrator account must remain active.')
                          : selectedUser.active
                            ? t('Puede iniciar sesión y usar la plataforma.', 'Can sign in and use the platform.')
                            : t('No puede iniciar sesión ni usar la plataforma.', 'Cannot sign in or use the platform.')}</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={selectedUser.active}
                        aria-label={selectedUser.active ? t('Desactivar cuenta', 'Deactivate account') : t('Activar cuenta', 'Activate account')}
                        className={`client-switch ${selectedUser.active ? 'client-switch-active' : ''}`}
                        onClick={() => void toggleUserAccess()}
                        disabled={updatingAccessId === selectedUser.id || (selectedUser.id === currentUser?.id && selectedUser.active)}
                      >
                        <span>{updatingAccessId === selectedUser.id ? <LoaderCircle className="client-switch-spinner" aria-hidden="true" /> : null}</span>
                      </button>
                    </div>
                  </div>
                  {hasActiveStripeSubscription(selectedUser) && !selectedUser.cancelAtPeriodEnd && (
                    <div className="client-cancel-action">
                      <button className="clients-danger-button" onClick={() => setCancelTarget(selectedUser)}>
                        <CreditCard aria-hidden="true" /> {t('Cancelar suscripción', 'Cancel subscription')}
                      </button>
                    </div>
                  )}
                  {selectedUser.role === 'student' && (
                    <div className="client-manual-access-area">
                      {hasActiveStripeSubscription(selectedUser) ? (
                        <p className="client-manual-access-unavailable">
                          <CircleAlert aria-hidden="true" /> {t('El acceso manual no está disponible mientras la suscripción de Stripe esté activa.', 'Manual access is unavailable while the Stripe subscription is active.')}
                        </p>
                      ) : (
                        <form className="client-manual-access-form" onSubmit={grantManualAccess}>
                          <div>
                            <strong>{selectedUser.manualAccessEndsAt && new Date(selectedUser.manualAccessEndsAt) > new Date()
                              ? t('Extender acceso manual', 'Extend manual access')
                              : t('Otorgar acceso manual', 'Grant manual access')}</strong>
                            <span>{t('No genera cobros ni renovación. Elige una fecha específica o una cantidad de meses.', 'This creates no charge or renewal. Choose a specific date or a number of months.')}</span>
                          </div>
                          <fieldset className="client-access-length">
                            <legend className="sr-only">{t('Duración del acceso manual', 'Manual access length')}</legend>
                            <label className="clients-access-option">
                              <input type="radio" name="grant-access-length" checked={grantLength === 'date'} onChange={() => setGrantLength('date')} />
                              <span>{t('Fecha', 'Date')}</span>
                            </label>
                            <label className="clients-access-option">
                              <input type="radio" name="grant-access-length" checked={grantLength === 'months'} onChange={() => setGrantLength('months')} />
                              <span>{t('Meses', 'Months')}</span>
                            </label>
                          </fieldset>
                          {grantLength === 'date' ? (
                            <label>
                              <span className="sr-only">{t('Nueva fecha de acceso', 'New access end date')}</span>
                              <input className="input" type="date" value={grantEndsOn} min={getMinimumAccessDate(selectedUser.manualAccessEndsAt, selectedUser.accessSource === 'manual')} onChange={(event) => setGrantEndsOn(event.target.value)} required />
                            </label>
                          ) : (
                            <label>
                              <span className="sr-only">{t('Cantidad de meses de acceso', 'Number of access months')}</span>
                              <input className="input" type="number" min="1" max="36" step="1" value={grantDurationMonths} onChange={(event) => setGrantDurationMonths(event.target.value)} required />
                            </label>
                          )}
                          <button className="clients-secondary-button" type="submit" disabled={grantingAccess || (grantLength === 'date' ? !grantEndsOn : !grantDurationMonths)}>
                            {grantingAccess ? <LoaderCircle className="clients-button-spinner" aria-hidden="true" /> : <CalendarPlus aria-hidden="true" />}
                            {t('Guardar acceso', 'Save access')}
                          </button>
                        </form>
                      )}
                      {(selectedUser.invitationState === 'pending' || selectedUser.invitationState === 'expired') && (
                        <div className="client-invitation-action">
                          <div>
                            <strong>{selectedUser.invitationState === 'pending' ? t('Invitación pendiente', 'Invitation pending') : t('Invitación vencida', 'Invitation expired')}</strong>
                            <span>{t('Reenvía un enlace nuevo para que el estudiante elija su contraseña.', 'Send a new link so the student can choose their password.')}</span>
                          </div>
                          <button className="clients-secondary-button" type="button" onClick={() => void resendInvitation()} disabled={resendingInvitationId === selectedUser.id}>
                            {resendingInvitationId === selectedUser.id ? <LoaderCircle className="clients-button-spinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
                            {t('Reenviar invitación', 'Resend invitation')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="client-detail-section">
                  <div className="client-section-heading">
                    <div>
                      <h3>{t('Información del cliente', 'Client information')}</h3>
                      <p>{t('Datos de la cuenta y controles de edición.', 'Account details and editing controls.')}</p>
                    </div>
                  </div>
                  {editing ? (
                    <div className="client-edit-form">
                      <label>
                        <span>{t('Nombre completo', 'Full name')}</span>
                        <input className="input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
                      </label>
                      <label>
                        <span>{t('Correo electrónico', 'Email address')}</span>
                        <input className="input" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
                      </label>
                      <div className="client-edit-actions">
                        <button className="btn" onClick={() => setEditing(false)} disabled={saving}>{t('Descartar', 'Discard')}</button>
                        <button className="btn-primary" onClick={() => void saveUser()} disabled={saving || !draft.name.trim() || !draft.email.trim()}>
                          {saving && <LoaderCircle className="clients-button-spinner" aria-hidden="true" />}
                          {t('Guardar cambios', 'Save changes')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <dl className="client-information-grid">
                      <ClientInfo icon={UserRound} label={t('Nombre', 'Name')} value={selectedUser.name} />
                      <ClientInfo icon={Mail} label={t('Correo', 'Email')} value={selectedUser.email} />
                      <ClientInfo icon={CalendarClock} label={t('Miembro desde', 'Member since')} value={formatDate(selectedUser.createdAt, lang)} />
                    </dl>
                  )}
                </div>

                <div className="client-detail-section client-history-section">
                  <div className="client-section-heading">
                    <div>
                      <h3>{t('Historial de suscripción', 'Subscription history')}</h3>
                      <p>{t('Pagos, vencimientos y cambios de renovación registrados.', 'Recorded payments, expiry dates, and renewal changes.')}</p>
                    </div>
                  </div>
                  <SubscriptionHistory history={selectedUser.subscriptionHistory} lang={lang} t={t} />
                </div>
              </>
            ) : (
              <div className="client-detail-empty">
                <UsersRound aria-hidden="true" />
                <h2>{t('Selecciona un cliente', 'Select a client')}</h2>
                <p>{t('Elige un cliente de la lista para ver sus datos y suscripción.', 'Choose a client from the list to view their account and subscription.')}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {cancelTarget && (
        <div className="clients-modal-backdrop" role="presentation">
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title" aria-describedby="cancel-subscription-description">
            <button className="clients-modal-close" onClick={() => setCancelTarget(null)} disabled={cancelling} aria-label={t('Cerrar', 'Close')}><X aria-hidden="true" /></button>
            <span className="clients-modal-icon"><CircleAlert aria-hidden="true" /></span>
            <h2 id="cancel-subscription-title">{t('¿Cancelar suscripción?', 'Cancel subscription?')}</h2>
            <p id="cancel-subscription-description">
              {t(
                `Se detendrá la renovación automática para ${cancelTarget.name}. Su acceso seguirá activo hasta ${formatDate(cancelTarget.currentPeriodEnd, lang)}.`,
                `Automatic renewal for ${cancelTarget.name} will stop. Their access will remain active until ${formatDate(cancelTarget.currentPeriodEnd, lang)}.`,
              )}
            </p>
            <div className="clients-modal-actions">
              <button className="btn" onClick={() => setCancelTarget(null)} disabled={cancelling}>{t('Volver', 'Go back')}</button>
              <button className="clients-danger-button" onClick={() => void cancelSubscription()} disabled={cancelling}>
                {cancelling && <LoaderCircle className="clients-button-spinner" aria-hidden="true" />}
                {t('Cancelar suscripción', 'Cancel subscription')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionSummary({ user, lang, t }: { user: AdminUser; lang: 'es' | 'en'; t: (es: string, en: string) => string }) {
  const meta = getSubscriptionMeta(user, t);
  const Icon = meta.icon;
  return (
    <div className="client-subscription-state">
      <span className={`client-subscription-icon client-subscription-icon-${meta.variant}`}><Icon aria-hidden /></span>
      <div>
        <span className={`client-status client-status-${meta.variant}`}><span aria-hidden="true" />{meta.label}</span>
        <strong>{meta.title}</strong>
        <p>{meta.description}</p>
        {meta.accessEndsAt && (
          <span className="client-subscription-date"><CalendarClock aria-hidden="true" /> {meta.dateLabel} <b>{formatDate(meta.accessEndsAt, lang)}</b></span>
        )}
      </div>
    </div>
  );
}

function SubscriptionHistory({ history, lang, t }: { history: SubscriptionHistoryEntry[]; lang: 'es' | 'en'; t: (es: string, en: string) => string }) {
  if (history.length === 0) {
    return (
      <div className="client-history-empty">
        <CalendarClock aria-hidden="true" />
        <p>{t('Aún no hay eventos de facturación registrados para este cliente.', 'There are no billing events recorded for this client yet.')}</p>
      </div>
    );
  }
  return (
    <ol className="client-history-list">
      {history.map((event) => {
        const meta = getHistoryMeta(event.event, t);
        const Icon = meta.icon;
        return (
          <li key={event.id} className={`client-history-item client-history-item-${meta.variant}`}>
            <span className="client-history-icon"><Icon aria-hidden /></span>
            <div className="client-history-copy">
              <strong>{meta.label}</strong>
              <span>{formatDate(event.occurredAt, lang, true)}</span>
            </div>
            <div className="client-history-details">
              {event.paidAt && <span>{t('Pago:', 'Paid:')} <b>{formatDate(event.paidAt, lang)}</b></span>}
              {event.periodEnd && <span>{t('Acceso hasta:', 'Access until:')} <b>{formatDate(event.periodEnd, lang)}</b></span>}
              {event.cancelAtPeriodEnd && <span>{t('Renovación detenida', 'Renewal stopped')}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ClientInfo({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; label: string; value: string }) {
  return (
    <div className="client-information-item">
      <Icon aria-hidden />
      <div><dt>{label}</dt><dd>{value}</dd></div>
    </div>
  );
}

function InvitationStateBadge({ state, t }: { state: AdminUser['invitationState']; t: (es: string, en: string) => string }) {
  if (state === 'accepted' || state === 'not_invited') return null;
  const expired = state === 'expired';
  return (
    <span className={`client-invitation-badge client-invitation-badge-${expired ? 'expired' : 'pending'}`}>
      <Mail aria-hidden="true" /> {expired ? t('Invitación vencida', 'Invitation expired') : t('Invitación pendiente', 'Invitation pending')}
    </span>
  );
}

function hasActiveStripeSubscription(user: AdminUser): boolean {
  return user.accessSource === 'stripe';
}

function hasCurrentAccess(user: AdminUser): boolean {
  return user.accessSource === 'stripe' || user.accessSource === 'manual';
}

function getAccessGrantInput(
  accessLength: AccessLength,
  accessEndsOn: string,
  accessDurationMonths: string,
): ManualAccessGrantInput {
  return accessLength === 'date'
    ? { accessEndsOn }
    : { accessDurationMonths: Number(accessDurationMonths) };
}

function getMinimumAccessDate(existingAccessEndsAt?: string, useExisting = false): string {
  const minimumBase = existingAccessEndsAt && useExisting
    ? new Date(existingAccessEndsAt)
    : new Date();
  return new Date(Date.UTC(
    minimumBase.getUTCFullYear(),
    minimumBase.getUTCMonth(),
    minimumBase.getUTCDate() + 1,
  )).toISOString().slice(0, 10);
}

function getSubscriptionMeta(user: AdminUser, t: (es: string, en: string) => string): {
  variant: StatusVariant;
  label: string;
  title: string;
  description: string;
  dateLabel: string;
  accessEndsAt?: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
} {
  if (!user.active) {
    return { variant: 'neutral', label: t('Cuenta desactivada', 'Account disabled'), title: t('Acceso bloqueado', 'Access blocked'), description: t('La cuenta no puede iniciar sesión mientras esté desactivada.', 'The account cannot sign in while it is disabled.'), dateLabel: t('Último vencimiento:', 'Last expiry:'), accessEndsAt: user.manualAccessEndsAt ?? user.currentPeriodEnd, icon: Power };
  }
  if (user.accessSource === 'manual' && user.manualAccessEndsAt) {
    return { variant: 'success', label: t('Acceso manual', 'Manual access'), title: t('Acceso otorgado por administrador', 'Administrator-granted access'), description: t('No hay cobro ni renovación automática de Stripe para este período.', 'There is no Stripe charge or automatic renewal for this period.'), dateLabel: t('Acceso hasta:', 'Access through:'), accessEndsAt: user.manualAccessEndsAt, icon: CalendarClock };
  }
  if (user.manualAccessEndsAt && user.accessSource === 'none' && user.subscriptionStatus === 'none') {
    return { variant: 'neutral', label: t('Acceso manual vencido', 'Manual access expired'), title: t('El período otorgado finalizó', 'The granted period ended'), description: t('Puedes otorgar una nueva fecha de acceso manual o el estudiante puede suscribirse.', 'Grant a new manual-access date or have the student subscribe.'), dateLabel: t('Venció:', 'Expired:'), accessEndsAt: user.manualAccessEndsAt, icon: CalendarClock };
  }
  if (hasActiveStripeSubscription(user) && user.cancelAtPeriodEnd) {
    return { variant: 'warning', label: t('Termina al vencer', 'Ends at expiry'), title: t('Renovación cancelada', 'Renewal canceled'), description: t('Conserva el acceso durante el período que ya pagó.', 'Access remains available for the already-paid period.'), dateLabel: t('Acceso hasta:', 'Access until:'), accessEndsAt: user.currentPeriodEnd, icon: CalendarClock };
  }
  if (hasActiveStripeSubscription(user)) {
    return { variant: 'success', label: t('Activa', 'Active'), title: t('Acceso en regla', 'Access in good standing'), description: t('La suscripción está activa y se renovará automáticamente.', 'The subscription is active and will renew automatically.'), dateLabel: t('Próximo vencimiento:', 'Next expiry:'), accessEndsAt: user.currentPeriodEnd, icon: BadgeCheck };
  }
  if (user.subscriptionStatus === 'past_due' || user.subscriptionStatus === 'unpaid') {
    return { variant: 'danger', label: t('Pago pendiente', 'Payment due'), title: t('Acceso requiere atención', 'Access needs attention'), description: t('El cobro no está al día.', 'The payment is not up to date.'), dateLabel: t('Período finalizó:', 'Period ended:'), accessEndsAt: user.currentPeriodEnd, icon: CircleAlert };
  }
  if (user.subscriptionStatus === 'canceled') {
    return { variant: 'neutral', label: t('Cancelada', 'Canceled'), title: t('Sin suscripción activa', 'No active subscription'), description: t('La última suscripción de esta cuenta ya no está activa.', 'This account’s latest subscription is no longer active.'), dateLabel: t('Finalizó:', 'Ended:'), accessEndsAt: user.currentPeriodEnd, icon: CircleX };
  }
  return { variant: 'neutral', label: t('Sin suscripción', 'No subscription'), title: t('Sin acceso de pago', 'No paid access'), description: t('Esta cuenta aún no tiene una suscripción registrada.', 'This account does not yet have a recorded subscription.'), dateLabel: t('Venció:', 'Expired:'), accessEndsAt: user.currentPeriodEnd, icon: CreditCard };
}

function getHistoryMeta(event: SubscriptionEventType, t: (es: string, en: string) => string): { label: string; variant: StatusVariant; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> } {
  const entries: Record<SubscriptionEventType, { es: string; en: string; variant: StatusVariant; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }> = {
    subscription_started: { es: 'Suscripción iniciada', en: 'Subscription started', variant: 'success', icon: BadgeCheck },
    payment_succeeded: { es: 'Pago confirmado', en: 'Payment confirmed', variant: 'success', icon: CheckCircle2 },
    payment_failed: { es: 'Pago fallido', en: 'Payment failed', variant: 'danger', icon: CircleAlert },
    cancellation_scheduled: { es: 'Renovación cancelada', en: 'Renewal canceled', variant: 'warning', icon: CalendarClock },
    subscription_reactivated: { es: 'Renovación reactivada', en: 'Renewal reactivated', variant: 'success', icon: BadgeCheck },
    subscription_canceled: { es: 'Suscripción finalizada', en: 'Subscription ended', variant: 'neutral', icon: CircleX },
    subscription_status_updated: { es: 'Estado de suscripción actualizado', en: 'Subscription status updated', variant: 'neutral', icon: CreditCard },
    manual_access_granted: { es: 'Acceso manual otorgado', en: 'Manual access granted', variant: 'success', icon: CalendarPlus },
    manual_access_extended: { es: 'Acceso manual extendido', en: 'Manual access extended', variant: 'success', icon: CalendarPlus },
  };
  const entry = entries[event];
  return { label: t(entry.es, entry.en), variant: entry.variant, icon: entry.icon };
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'S';
}

function formatDate(value: string | undefined, lang: 'es' | 'en', includeTime = false): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export default function ClientsPage() {
  return <Protected requireAdmin><ClientsContent /></Protected>;
}
