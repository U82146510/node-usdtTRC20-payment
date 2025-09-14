import cron from 'node-cron';
import { checkForDeposits } from '../services/depositChecker';
export function startDepositChecker(){
    cron.schedule('*/30 * * * * *', async () => {
        console.log('⏰ Checking for USDT deposits...');
        await checkForDeposits();
    });   
}