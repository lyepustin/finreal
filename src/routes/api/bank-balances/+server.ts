import { json } from '@sveltejs/kit';
import { supabase } from '$lib/db/supabase';

export async function GET() {
    try {
        const { data: banks, error: banksError } = await supabase
            .from('banks')
            .select(`
                id,
                name,
                accounts (
                    transactions (
                        transaction_categories (
                            amount
                        )
                    )
                )
            `);

        if (banksError) {
            console.error('Error fetching banks:', banksError);
            return json({ banks: [], totalBalance: 0, error: 'Failed to fetch bank data' }, { status: 500 });
        }

        // Transform the data into the required format
        const banksWithBalances = banks.map(bank => {
            const balance = bank.accounts?.reduce((bankSum, account) => {
                const accountBalance = account.transactions?.reduce((accSum, transaction) => {
                    const transactionBalance = transaction.transaction_categories?.reduce((transSum, category) => {
                        return transSum + (category.amount || 0);
                    }, 0) || 0;
                    return accSum + transactionBalance;
                }, 0) || 0;
                return bankSum + accountBalance;
            }, 0) || 0;

            return {
                id: bank.id,
                name: bank.name,
                balance,
                accountCounts: {
                    bank_account: bank.accounts?.length || 0
                }
            };
        });

        const totalBalance = banksWithBalances.reduce((sum, bank) => sum + bank.balance, 0);

        return json({
            banks: banksWithBalances,
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