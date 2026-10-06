import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CouponsPage from '@/app/coupons/page';

const auth = vi.hoisted(() => ({
  user: null as { id: string; name: string; email: string; role: 'student' | 'admin' } | null,
  loading: false,
}));
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
const apiMock = vi.hoisted(() => ({
  admin: {
    listCoupons: vi.fn(),
    createCoupon: vi.fn(),
    deactivateCoupon: vi.fn(),
    reactivateCoupon: vi.fn(),
  },
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/context/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
vi.mock('@/lib/api', () => ({ api: apiMock }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));

describe('Coupons page', () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    apiMock.admin.listCoupons.mockReset();
    apiMock.admin.listCoupons.mockResolvedValue({ ok: true, coupons: [] });
    auth.loading = false;
  });

  afterEach(() => cleanup());

  it('redirects a student away from the administrator-only route', async () => {
    auth.user = { id: 'student-id', name: 'Student', email: 'student@example.com', role: 'student' };
    render(<CouponsPage />);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/'));
    expect(apiMock.admin.listCoupons).not.toHaveBeenCalled();
  });

  it('shows the repeating-month field and adapts the discount label', async () => {
    auth.user = { id: 'admin-id', name: 'Admin', email: 'admin@example.com', role: 'admin' };
    render(<CouponsPage />);

    await screen.findByRole('heading', { name: 'No coupons yet' });
    fireEvent.change(screen.getByLabelText('Discount duration'), { target: { value: 'repeating' } });
    expect(screen.getByRole('spinbutton', { name: /Discounted months/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Discount type'), { target: { value: 'fixed' } });
    expect(screen.getByRole('spinbutton', { name: /Discount amount/i })).toBeInTheDocument();
    expect(screen.getByText('Valid through the end of that date.')).toBeInTheDocument();
  });
});
