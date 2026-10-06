import { Schema, model, Document, Types } from 'mongoose';
import { SubscriptionStatus } from './User';

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

export interface ISubscriptionEvent extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  subscriptionId?: string;
  event: SubscriptionEventType;
  status: SubscriptionStatus;
  occurredAt: Date;
  paidAt?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

const subscriptionEventSchema = new Schema<ISubscriptionEvent>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionId: { type: String, index: true, sparse: true },
    event: {
      type: String,
      enum: [
        'subscription_started',
        'payment_succeeded',
        'payment_failed',
        'cancellation_scheduled',
        'subscription_reactivated',
        'subscription_canceled',
        'subscription_status_updated',
        'manual_access_granted',
        'manual_access_extended',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['none', 'active', 'past_due', 'canceled', 'unpaid'],
      required: true,
    },
    occurredAt: { type: Date, required: true, default: Date.now },
    paidAt: { type: Date },
    periodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true },
);

subscriptionEventSchema.index({ user: 1, occurredAt: -1 });

export const SubscriptionEvent = model<ISubscriptionEvent>('SubscriptionEvent', subscriptionEventSchema);
