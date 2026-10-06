import type {
  AuthResponse,
  AdminCoupon,
  AdminUser,
  CouponCreateInput,
  CreateStudentInput,
  ExamResponse,
  FigureQuestion,
  OralQuestion,
  ProgressItem,
  ProgressResponse,
  PracticeSession,
  PracticeSessionInput,
  Rating,
  SessionMode,
  SessionType,
  SubjectInfo,
  Lang,
  ManualAccessGrantInput,
  WrittenQuestion,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const TOKEN_KEY = 'faa_token';
const REQUEST_TIMEOUT_MS = 15_000;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: options.signal ?? controller.signal });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = (data as { error?: string }).error ?? `Error ${res.status}`;
      throw new ApiError(res.status, message);
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(504, 'La conexión con el servidor tardó demasiado. Intenta de nuevo.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
};

export const api = {
  // ---- Auth ----
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  requestPasswordReset: (email: string, locale: Lang) =>
    request<{ ok: boolean; message: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email, locale }),
    }),
  verifyPasswordResetCode: (email: string, code: string, locale: Lang) =>
    request<{ ok: boolean; resetToken: string; message: string }>('/auth/password-reset/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code, locale }),
    }),
  resetPassword: (resetToken: string, password: string, locale: Lang) =>
    request<{ ok: boolean; message: string }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ resetToken, password, locale }),
    }),
  acceptInvitation: (token: string, password: string) =>
    request<{ ok: boolean; message: string }>('/auth/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  me: () => request<{ ok: boolean; user: AuthResponse['user'] }>('/auth/me'),

  // ---- Questions ----
  subjects: (rating?: Rating) =>
    request<{ ok: boolean; subjects: SubjectInfo[] }>(`/questions/subjects${qs({ rating })}`),
  written: (params: { rating?: Rating; subject?: string; limit?: number; random?: boolean; all?: boolean }) =>
    request<{ ok: boolean; count: number; questions: WrittenQuestion[] }>(
      `/questions/written${qs(params)}`
    ),
  figures: (params: { rating?: Rating; subject?: string }) =>
    request<{ ok: boolean; count: number; questions: FigureQuestion[] }>(
      `/questions/figures${qs(params)}`
    ),
  oral: (params: { rating?: Rating; subject?: string }) =>
    request<{ ok: boolean; count: number; questions: OralQuestion[] }>(
      `/questions/oral${qs(params)}`
    ),
  oralSubjects: (rating?: Rating) =>
    request<{ ok: boolean; subjects: SubjectInfo[] }>(`/questions/oral/subjects${qs({ rating })}`),
  resolveWritten: (questionIds: string[]) =>
    request<{ ok: boolean; count: number; questions: (WrittenQuestion | FigureQuestion)[] }>('/questions/resolve', {
      method: 'POST',
      body: JSON.stringify({ questionIds }),
    }),

  // ---- Exam ----
  exam: (rating: Rating, count?: number) =>
    request<ExamResponse>(`/exam/written/${rating}${qs({ count })}`),

  // ---- Progress ----
  getProgress: () => request<ProgressResponse>('/progress'),
  postProgress: (rating: Rating, subject: string, correct: number, attempted: number) =>
    request<{ ok: boolean; progress: ProgressItem }>('/progress', {
      method: 'POST',
      body: JSON.stringify({ rating, subject, correct, attempted }),
    }),

  // ---- Saved sessions ----
  sessions: {
    list: (params: { rating?: Rating; sessionType?: SessionType; mode?: SessionMode } = {}) =>
      request<{ ok: boolean; sessions: PracticeSession[] }>(`/sessions${qs(params)}`),
    save: (session: PracticeSessionInput) =>
      request<{ ok: boolean; session: PracticeSession }>('/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
      }),
    remove: (session: Pick<PracticeSessionInput, 'rating' | 'sessionType' | 'mode' | 'subject'>) =>
      request<{ ok: boolean }>('/sessions', {
        method: 'DELETE',
        body: JSON.stringify(session),
      }),
  },

  // ---- Billing ----
  createCheckoutSession: () =>
    request<{ ok: boolean; url?: string; reactivated?: boolean }>('/billing/checkout', { method: 'POST' }),
  cancelSubscription: () =>
    request<{ ok: boolean; message: string; cancelAt: string }>('/billing/cancel', { method: 'POST' }),
  getSubscriptionStatus: () =>
    request<{ ok: boolean; subscriptionStatus: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }>('/billing/status'),

  // ---- Administration ----
  admin: {
    listCoupons: () => request<{ ok: boolean; coupons: AdminCoupon[] }>('/admin/coupons'),
    createCoupon: (data: CouponCreateInput) =>
      request<{ ok: boolean; coupon: AdminCoupon }>('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deactivateCoupon: (id: string) =>
      request<{ ok: boolean; coupon: AdminCoupon }>(`/admin/coupons/${id}/deactivate`, { method: 'PATCH' }),
    reactivateCoupon: (id: string) =>
      request<{ ok: boolean; coupon: AdminCoupon }>(`/admin/coupons/${id}/reactivate`, { method: 'PATCH' }),
    listUsers: () => request<{ ok: boolean; users: AdminUser[] }>('/admin/users'),
    createStudent: (data: CreateStudentInput) =>
      request<{ ok: boolean; user: Omit<AdminUser, 'subscriptionHistory'> }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUser: (id: string, data: { name?: string; email?: string }) =>
      request<{ ok: boolean; user: Omit<AdminUser, 'subscriptionHistory'> }>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    setUserActive: (id: string, active: boolean) =>
      request<{ ok: boolean; user: Omit<AdminUser, 'subscriptionHistory'> }>(`/admin/users/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    cancelUserSubscription: (id: string) =>
      request<{ ok: boolean; user: Omit<AdminUser, 'subscriptionHistory'>; message: string }>(`/admin/users/${id}/cancel-subscription`, {
        method: 'POST',
      }),
    resendInvitation: (id: string, locale: Lang) =>
      request<{ ok: boolean; user: Omit<AdminUser, 'subscriptionHistory'>; message: string }>(`/admin/users/${id}/resend-invitation`, {
        method: 'POST',
        body: JSON.stringify({ locale }),
      }),
    grantManualAccess: (id: string, data: ManualAccessGrantInput) =>
      request<{ ok: boolean; user: Omit<AdminUser, 'subscriptionHistory'> }>(`/admin/users/${id}/manual-access`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
};
