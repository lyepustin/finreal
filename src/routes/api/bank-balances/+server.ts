import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals: { supabase } }) => {
    try {
        const { data, error } = await supabase
            .rpc('get_bank_balances');

        if (error) {
            console.error('Error fetching bank balances:', error);
            return json({ 
                banks: [], 
                totalBalance: 0, 
                error: 'Failed to fetch bank data' 
            }, { status: 500 });
        }

        // Transform the data into the required format
        const banks = data.map(bank => ({
            id: bank.bank_id,
            name: bank.bank_name,
            balance: bank.balance,
            accountCounts: {
                bank_account: bank.account_count
            }
        }));

        const totalBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);

        return json({
            banks,
            totalBalance
        });

    } catch (error) {
        console.error('Error in bank balances:', error);
        return json({ 
            banks: [], 
            totalBalance: 0, 
            error: 'Internal server error' 
        }, { status: 500 });
    }
} 