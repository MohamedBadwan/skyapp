export type Rating = 'AMG' | 'AMA' | 'AMP';
export type Lang = 'es' | 'en';
export type SessionType = 'study' | 'exam' | 'oral';
export type SessionMode = 'practice' | 'exam';

export const RATINGS: { code: Rating; es: string; en: string }[] = [
  { code: 'AMG', es: 'General', en: 'General' },
  { code: 'AMA', es: 'Airframe', en: 'Airframe' },
  { code: 'AMP', es: 'Powerplant', en: 'Powerplant' },
];

export const EXAM_SIZE: Record<Rating, number> = { AMG: 60, AMA: 100, AMP: 100 };

export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'unpaid';
export type AccessSource = 'stripe' | 'manual' | 'none';
export type InvitationState = 'pending' | 'expired' | 'accepted' | 'not_invited';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  manualAccessEndsAt?: string;
  accessSource?: AccessSource;
  createdAt?: string;
}

export type SubscriptionEventType =
  | 'subscription_started'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'cancellation_scheduled'
  | 'subscription_reactivated'
  | 'subscription_canceled'
  | 'subscription_status_updated'
  | 'manual_access_granted'
  | 'manual_access_extended';

export interface SubscriptionHistoryEntry {
  id: string;
  event: SubscriptionEventType;
  status: SubscriptionStatus;
  occurredAt: string;
  paidAt?: string;
  periodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface AdminUser extends Omit<User, 'subscriptionStatus' | 'currentPeriodEnd' | 'cancelAtPeriodEnd' | 'createdAt'> {
  active: boolean;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  manualAccessGrantedAt?: string;
  manualAccessGrantedBy?: string;
  invitationState: InvitationState;
  createdAt: string;
  updatedAt: string;
  subscriptionHistory: SubscriptionHistoryEntry[];
}

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponDuration = 'once' | 'repeating' | 'forever';
export type CouponState = 'active' | 'inactive' | 'expired' | 'exhausted';

export interface AdminCoupon {
  id: string;
  name: string;
  code: string;
  discountType: CouponDiscountType;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: CouponDuration;
  durationInMonths?: number;
  redeemBy?: string;
  maxRedemptions?: number;
  timesRedeemed: number;
  active: boolean;
  state: CouponState;
  createdAt: string;
}

export interface CouponCreateInput {
  name: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  duration: CouponDuration;
  durationInMonths?: number;
  redeemBy?: string;
  maxRedemptions: number;
}

export type ManualAccessGrantInput =
  | { accessEndsOn: string; accessDurationMonths?: never }
  | { accessDurationMonths: number; accessEndsOn?: never };

export type NoManualSubscriptionInput = {
  accessEndsOn?: never;
  accessDurationMonths?: never;
};

export type CreateStudentInput = {
  name: string;
  email: string;
  locale: Lang;
} & (ManualAccessGrantInput | NoManualSubscriptionInput);

export function hasActiveSubscription(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.accessSource === 'manual' && user.manualAccessEndsAt) {
    return new Date(user.manualAccessEndsAt) > new Date();
  }
  if (user.subscriptionStatus !== 'active') return false;
  if (!user.currentPeriodEnd) return false;
  return new Date(user.currentPeriodEnd) > new Date();
}

export interface AuthResponse {
  ok: boolean;
  token: string;
  user: User;
}

export interface WrittenQuestion {
  _id: string;
  legacyId?: number;
  rating: Rating;
  subject: string;
  q_en: string;
  q_es: string;
  opts_en: string[];
  opts_es: string[];
  correct: number;
}

export interface FigureQuestion extends WrittenQuestion {
  img: string; // data:image/jpeg;base64,...
}

export interface OralQuestion {
  _id: string;
  legacyId?: number;
  rating: Rating;
  subject: string;
  q: string;
  a: string;
  q_es: string;
  a_es: string;
}

export interface SubjectInfo {
  rating: Rating;
  subject: string;
  count: number;
}

export interface ProgressItem {
  _id: string;
  rating: Rating;
  subject: string;
  attempted: number;
  correct: number;
  mastery: number;
  mastered: boolean;
  lastStudiedAt: string;
}

export interface ProgressResponse {
  ok: boolean;
  threshold: number;
  summary: Record<string, { mastered: number; total: number }>;
  items: ProgressItem[];
}

export interface PracticeSession {
  _id: string;
  rating: Rating;
  sessionType: SessionType;
  mode: SessionMode;
  subject: string | null;
  questionIds: string[];
  answers: Record<string, number>;
  currentIndex: number;
  remainingSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSessionInput {
  rating: Rating;
  sessionType: SessionType;
  mode: SessionMode;
  subject: string | null;
  questionIds: string[];
  answers: Record<string, number>;
  currentIndex: number;
  remainingSeconds: number | null;
}

export interface ExamResponse {
  ok: boolean;
  rating: Rating;
  passScore: number;
  total: number;
  available: number;
  questions: (WrittenQuestion | FigureQuestion)[];
}
