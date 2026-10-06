import { Types } from 'mongoose';
import { SubscriptionStatus } from '../models/User';
import { SubscriptionEvent, SubscriptionEventType } from '../models/SubscriptionEvent';

interface SubscriptionEventInput {
  user: Types.ObjectId;
  subscriptionId?: string;
  event: SubscriptionEventType;
  status: SubscriptionStatus;
  occurredAt?: Date;
  paidAt?: Date;
  periodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

export async function recordSubscriptionEvent(input: SubscriptionEventInput): Promise<void> {
  await SubscriptionEvent.create({
    ...input,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
  });
}
