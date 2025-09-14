import mongoose, {Document,model,Schema,Types} from 'mongoose';

interface IBalance extends Document{
    key: string;
    Month:Types.Decimal128;
    Total:Types.Decimal128;
    shop:Types.Decimal128;
};

const incomeStatistics = new Schema<IBalance>({
    key: { type: String, default: 'shop-status', unique: true },
    Month:{type:mongoose.Schema.Types.Decimal128,default:mongoose.Types.Decimal128.fromString('0')},
    Total:{type:mongoose.Schema.Types.Decimal128,default:mongoose.Types.Decimal128.fromString('0')},
    shop:{type:mongoose.Schema.Types.Decimal128,default:mongoose.Types.Decimal128.fromString('0')}
});

export const shopBalance = model<IBalance>('Shop',incomeStatistics);