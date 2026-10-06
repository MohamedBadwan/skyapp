import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClientsPage from '@/app/clients/page';
import ProfilePage from '@/app/profile/page';
import AcceptInvitationPage from '@/app/accept-invitation/page';
import type { AdminUser, User } from '@/lib/types';

const auth = vi.hoisted(() => ({
  user: null as User | null,
  loading: false,
  refreshUser: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(`token=${'a'.repeat(64)}`),
}));
const apiMock = vi.hoisted(() => ({
  admin: {
    listUsers: vi.fn(),
    createStudent: vi.fn(),
    grantManualAccess: vi.fn(),
    resendInvitation: vi.fn(),
    updateUser: vi.fn(),
    setUserActive: vi.fn(),
    cancelUserSubscription: vi.fn(),
  },
  acceptInvitation: vi.fn(),
  createCheckoutSession: vi.fn(),
  cancelSubscription: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/context/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
vi.mock('@/lib/api', () => ({ api: apiMock }));
vi.mock('next/navigation', () => ({
  useRouter: () => navigation,
  useSearchParams: () => navigation.searchParams,
}));

const manualStudent: AdminUser = {
  id: 'student-id',
  name: 'Invited Student',
  email: 'student@example.com',
  role: 'student',
  active: true,
  subscriptionStatus: 'none',
  cancelAtPeriodEnd: false,
  manualAccessEndsAt: '2099-12-31T23:59:59.999-04:00',
  accessSource: 'manual',
  invitationState: 'pending',
  createdAt: '2099-01-01T00:00:00.000Z',
  updatedAt: '2099-01-01T00:00:00.000Z',
  subscriptionHistory: [],
};

describe('administrator user subscription grants', () => {
  beforeEach(() => {
    auth.user = { id: 'admin-id', name: 'Admin', email: 'admin@example.com', role: 'admin' };
    auth.loading = false;
    auth.refreshUser.mockReset();
    navigation.replace.mockReset();
    navigation.searchParams = new URLSearchParams(`token=${'a'.repeat(64)}`);
    apiMock.admin.listUsers.mockReset();
    apiMock.admin.createStudent.mockReset();
    apiMock.admin.grantManualAccess.mockReset();
    apiMock.admin.resendInvitation.mockReset();
    apiMock.admin.updateUser.mockReset();
    apiMock.admin.setUserActive.mockReset();
    apiMock.admin.cancelUserSubscription.mockReset();
    apiMock.acceptInvitation.mockReset();
    apiMock.createCheckoutSession.mockReset();
    apiMock.cancelSubscription.mockReset();
  });

  afterEach(() => cleanup());

  it('creates a student without a subscription through the Clients invitation workflow', async () => {
    apiMock.admin.listUsers.mockResolvedValue({ ok: true, users: [] });
    apiMock.admin.createStudent.mockResolvedValue({ ok: true, user: { ...manualStudent, subscriptionHistory: undefined } });
    render(<ClientsPage />);

    await screen.findByText('No clients match this search.');
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));
    expect(screen.getByLabelText('No subscription')).toBeChecked();

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create and send invitation' }));

    await waitFor(() => expect(apiMock.admin.createStudent).toHaveBeenCalledWith({
      name: 'New Student',
      email: 'new@example.com',
      locale: 'en',
    }));
  });

  it('creates a student with a manual subscription through the Clients invitation workflow', async () => {
    apiMock.admin.listUsers.mockResolvedValue({ ok: true, users: [] });
    apiMock.admin.createStudent.mockResolvedValue({ ok: true, user: { ...manualStudent, subscriptionHistory: undefined } });
    render(<ClientsPage />);

    await screen.findByText('No clients match this search.');
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));
    fireEvent.click(screen.getByLabelText('Manual subscription'));
    fireEvent.change(screen.getByLabelText(/^Subscription through/), { target: { value: '2099-12-31' } });
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create and send invitation' }));

    await waitFor(() => expect(apiMock.admin.createStudent).toHaveBeenCalledWith({
      name: 'New Student',
      email: 'new@example.com',
      accessEndsOn: '2099-12-31',
      locale: 'en',
    }));
  });

  it('creates a student with a whole-month access duration', async () => {
    apiMock.admin.listUsers.mockResolvedValue({ ok: true, users: [] });
    apiMock.admin.createStudent.mockResolvedValue({ ok: true, user: { ...manualStudent, subscriptionHistory: undefined } });
    render(<ClientsPage />);

    await screen.findByText('No clients match this search.');
    fireEvent.click(screen.getByRole('button', { name: 'Create student' }));
    fireEvent.click(screen.getByLabelText('Manual subscription'));
    fireEvent.click(screen.getByLabelText('Number of months'));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Two Months' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'two@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create and send invitation' }));

    await waitFor(() => expect(apiMock.admin.createStudent).toHaveBeenCalledWith({
      name: 'Two Months',
      email: 'two@example.com',
      accessDurationMonths: 2,
      locale: 'en',
    }));
  });

  it('identifies manual access, exposes a resend action, and preserves Stripe cancellation controls only for Stripe access', async () => {
    apiMock.admin.listUsers.mockResolvedValue({ ok: true, users: [manualStudent] });
    render(<ClientsPage />);

    await screen.findByText('Administrator-granted access');
    expect(screen.getAllByText('Invitation pending')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Resend invitation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel subscription' })).not.toBeInTheDocument();
  });

  it('renders manual access in the profile without Stripe subscription controls', async () => {
    auth.user = {
      id: manualStudent.id,
      name: manualStudent.name,
      email: manualStudent.email,
      role: 'student',
      subscriptionStatus: 'none',
      manualAccessEndsAt: manualStudent.manualAccessEndsAt,
      accessSource: 'manual',
    };
    render(<ProfilePage />);

    expect(screen.getByText('Administrator-granted access')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument();
  });

  it('accepts an invitation token after the student confirms a password', async () => {
    apiMock.acceptInvitation.mockResolvedValue({ ok: true, message: 'Your account is ready. You can now log in.' });
    render(<AcceptInvitationPage />);

    fireEvent.change(screen.getByLabelText('New password (min. 8)'), { target: { value: 'secure-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activate my account' }));

    await waitFor(() => expect(apiMock.acceptInvitation).toHaveBeenCalledWith('a'.repeat(64), 'secure-password'));
    expect(await screen.findByText('Your account is ready')).toBeInTheDocument();
  });
});
