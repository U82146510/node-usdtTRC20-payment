import { Schema, model, Document,Types } from "mongoose";

interface IUserWallet{
  _id?: Types.ObjectId;
  tronAddress: string;
  tronPrivateKey: string;
  hasPendingDeposit: boolean;
  expectedAmount: Types.Decimal128;
  expectedAmountExpiresAt?: Date;
  used:Boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface IUser extends Document {
  userId: string;
  balance: Types.Decimal128;
  orders: Schema.Types.ObjectId[];
  wallets:IUserWallet[];
};

const walletSchema = new Schema<IUserWallet>({
  tronAddress: { type: String },
  tronPrivateKey: { type: String },
  hasPendingDeposit: { type: Boolean, default: false },
  expectedAmount: { type: Schema.Types.Decimal128, default: Types.Decimal128.fromString("0") },
  expectedAmountExpiresAt: { type: Date },
  used:{type:Boolean,default:false}
},{timestamps:true});

const userSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  balance: { type: Schema.Types.Decimal128, default: Types.Decimal128.fromString("0") },
  orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  wallets:[walletSchema]
}, { timestamps: true });

export const User = model<IUser>("User", userSchema);