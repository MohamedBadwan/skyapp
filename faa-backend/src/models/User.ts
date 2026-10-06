import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'student' | 'admin';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  manualAccessEndsAt?: Date;
  manualAccessGrantedAt?: Date;
  manualAccessGrantedBy?: Types.ObjectId;
  invitationTokenHash?: string;
  invitationExpiresAt?: Date;
  invitationAcceptedAt?: Date;
  passwordResetCodeHash?: string;
  passwordResetExpiresAt?: Date;
  passwordResetAttempts: number;
  passwordResetTokenHash?: string;
  passwordResetTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    active: { type: Boolean, default: true },
    stripeCustomerId: { type: String, index: true, sparse: true },
    subscriptionId: { type: String },
    subscriptionStatus: {
      type: String,
      enum: ['none', 'active', 'past_due', 'canceled', 'unpaid'],
      default: 'none',
    },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    manualAccessEndsAt: { type: Date },
    manualAccessGrantedAt: { type: Date },
    manualAccessGrantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    invitationTokenHash: { type: String, select: false },
    invitationExpiresAt: { type: Date },
    invitationAcceptedAt: { type: Date },
    passwordResetCodeHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export const User = model<IUser>('User', userSchema);
