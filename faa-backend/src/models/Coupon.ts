import { Document, model, Schema, Types } from 'mongoose';

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponDuration = 'once' | 'repeating' | 'forever';

export interface ICoupon extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  normalizedCode: string;
  discountType: CouponDiscountType;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: CouponDuration;
  durationInMonths?: number;
  redeemBy?: Date;
  maxRedemptions?: number;
  stripeCouponId: string;
  stripePromotionCodeId: string;
  active: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    code: { type: String, required: true, trim: true, uppercase: true },
    normalizedCode: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    discountType: { type: String, required: true, enum: ['percentage', 'fixed'] },
    percentOff: { type: Number, min: 0, max: 100 },
    amountOff: { type: Number, min: 1 },
    currency: { type: String, lowercase: true, trim: true },
    duration: { type: String, required: true, enum: ['once', 'repeating', 'forever'] },
    durationInMonths: { type: Number, min: 1 },
    redeemBy: { type: Date, index: true, sparse: true },
    maxRedemptions: { type: Number, min: 1 },
    stripeCouponId: { type: String, required: true, unique: true, index: true },
    stripePromotionCodeId: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

couponSchema.index({ active: 1, createdAt: -1 });

export const Coupon = model<ICoupon>('Coupon', couponSchema);
