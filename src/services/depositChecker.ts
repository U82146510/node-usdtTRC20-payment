import { getUSDTbalance } from './udtPayment';
import { Decimal } from 'decimal.js';
import { User } from '../models/User';
import { shopBalance } from '../models/shopBalance';
import mongoose from 'mongoose';
const Decimal128 = mongoose.Types.Decimal128;

export async function checkForDeposits(): Promise<void> {
    try {
        console.log('🔍 Checking for deposits...');

        const now = new Date();

        // Fetch all users with wallets that have pending deposits
        const users = await User.find({ 'wallets.hasPendingDeposit': true });

        if (users.length === 0) {
            console.log('✅ No pending deposits');
        } else {
            for (const user of users) {
                try {
                    for (const wallet of user.wallets) {
                        // Skip wallets without pending deposits or expired
                        if (!wallet.hasPendingDeposit) continue;
                        if (!wallet.expectedAmountExpiresAt || wallet.expectedAmountExpiresAt <= now) continue;

                        const balance = await getUSDTbalance(wallet.tronAddress);
                        if (!balance || balance.isNaN()) {
                            console.log(`⏩ Skipping user ${user.userId} - invalid balance`);
                            continue;
                        }

                        const expected = new Decimal(wallet.expectedAmount.toString());
                        const current = new Decimal(balance);
                        const tolerance = new Decimal(0.0001);

                        // LOG pending deposits
                        console.log(`⏳ Pending payment: User ${user.userId}, Expected ${expected.toFixed(6)}, Current ${current.toFixed(6)} USDT`);

                        if (current.greaterThanOrEqualTo(expected.minus(tolerance))) {
                            // Update user balance
                            const newBalance = new Decimal(user.balance.toString()).plus(current);
                            await User.updateOne(
                                { _id: user._id, 'wallets._id': wallet._id },
                                {
                                    $inc: { balance: Decimal128.fromString(current.toString()) },
                                    $set: {
                                        'wallets.$.hasPendingDeposit': false,
                                        'wallets.$.used': true,
                                        'wallets.$.expectedAmount': Decimal128.fromString("0"),
                                        'wallets.$.expectedAmountExpiresAt': undefined
                                    }
                                }
                            );

                            const commission = current.mul(0.1).toDecimalPlaces(6);
                            await shopBalance.findOneAndUpdate(
                                { key: 'shop-status' },
                                {
                                    $setOnInsert: {
                                        Month: Decimal128.fromString("0"),
                                        Total: Decimal128.fromString("0"),
                                        shop: Decimal128.fromString("0")
                                    },
                                    $inc: {
                                        Month: Number(current.toString()),
                                        Total: Number(current.toString()),
                                        shop: Number(commission.toString())
                                    }
                                },
                                { upsert: true, new: true }
                            );
                       
                            // LOG successful payment
                            console.log(`✅ Payment completed: User ${user.userId}, Amount ${current.toFixed(6)} USDT`);
                        }
                    }
                } catch (userError) {
                    console.error(`❌ Error processing ${user.userId}:`, userError);
                }
            }
        }

        // Handle expired deposits
        try {
            const expiredUsers = await User.find({ 'wallets.hasPendingDeposit': true });

            for (const user of expiredUsers) {
                let anyExpired = false;

                for (const wallet of user.wallets) {
                    if (!wallet.hasPendingDeposit) continue;
                    if (!wallet.expectedAmountExpiresAt || wallet.expectedAmountExpiresAt > now) continue;

                    wallet.hasPendingDeposit = false;
                    wallet.used = true;
                    wallet.expectedAmount = Decimal128.fromString("0");
                    wallet.expectedAmountExpiresAt = undefined;

                    anyExpired = true;
                }

                if (anyExpired) {
                    await user.save();
                    console.log(`⌛ Cleared expired deposit for user ${user.userId}`);
                }
            }
        } catch (error) {
            console.error('Error at removing expired payment orders', error);
        }

    } catch (error) {
        console.error('💥 Deposit check failed:', error);
    }
}
