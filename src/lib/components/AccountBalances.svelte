<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { supabase } from '$lib/db/supabase';

    type Bank = {
        id: number;
        name: string;
        balance: number;
        accountCounts: {
            bank_account: number;
        };
    };

    let banks = $state<Bank[]>([]);
    let totalBalance = $state(0);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // Fetch initial bank data and then balances
    async function fetchBankData() {
        try {
            // First fetch basic bank information
            const { data: basicBanks, error: basicError } = await supabase
                .from('banks')
                .select('id, name');

            if (basicError) throw new Error('Failed to fetch basic bank data');

            // Update banks with basic information
            banks = basicBanks.map(bank => ({
                id: bank.id,
                name: bank.name,
                balance: 0,
                accountCounts: {
                    bank_account: 0
                }
            }));

            // Then fetch detailed balance information
            const response = await fetch('/api/bank-balances');
            if (!response.ok) throw new Error('Failed to fetch balances');
            
            const data = await response.json();
            banks = data.banks;
            totalBalance = data.totalBalance;
        } catch (err) {
            console.error('Error fetching data:', err);
            error = 'Failed to load bank data';
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        fetchBankData();
    });

    // State for navigation
    let currentIndex = $state(-1); // -1 represents total balance, 0+ represents banks
    let direction = $state(0); // -1 for left, 1 for right, used for animation

    // Format currency
    function formatEuro(value: number): string {
        const roundedValue = Math.round(value);
        const formattedValue = roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return `${formattedValue}€`;
    }

    // Navigation functions
    function goLeft() {
        direction = -1;
        currentIndex = currentIndex <= -1 ? banks.length - 1 : currentIndex - 1;
    }

    function goRight() {
        direction = 1;
        currentIndex = currentIndex >= banks.length - 1 ? -1 : currentIndex + 1;
    }

    // Get current display data
    const currentDisplay = $derived(
        currentIndex === -1 
            ? { 
                value: totalBalance,
                subtitle: ''
            }
            : {
                value: banks[currentIndex].balance,
                subtitle: banks[currentIndex].name
            }
    );
</script>

<div class="financial-dashboard">
    <div class="relative overflow-hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
            {#if loading}
                <div class="flex items-center justify-center h-[50px]">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
            {:else if error}
                <div class="text-red-500 text-center h-[50px] flex items-center justify-center">
                    {error}
                </div>
            {:else}
                <div class="relative flex items-center justify-between h-[50px]">
                    <!-- Left Arrow -->
                    <button 
                        class="absolute left-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
                        onclick={goLeft}
                        aria-label="Previous balance"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>

                    <!-- Content with fixed height container -->
                    <div class="flex-1 mx-8 overflow-hidden">
                        <div class="relative h-[40px]">
                            {#key currentIndex}
                                <div 
                                    class="absolute inset-0 flex flex-col items-center justify-center"
                                    in:fly={{ x: direction * 100, duration: 300 }}
                                    out:fly={{ x: direction * -100, duration: 300 }}
                                >
                                    <!-- Balance -->
                                    <div class="text-xl font-bold text-gray-800 dark:text-gray-200" 
                                         class:text-red-600={currentDisplay.value < 0} 
                                         class:dark:text-red-400={currentDisplay.value < 0}>
                                        {formatEuro(currentDisplay.value)}
                                    </div>

                                    <!-- Subtitle -->
                                    <div class="text-xs text-gray-500 dark:text-gray-400">
                                        {currentDisplay.subtitle.toUpperCase()}
                                    </div>
                                </div>
                            {/key}
                        </div>
                    </div>

                    <!-- Right Arrow -->
                    <button 
                        class="absolute right-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
                        onclick={goRight}
                        aria-label="Next balance"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>

                <!-- Navigation Dots -->
                <div class="flex justify-center gap-1 mt-1 h-[4px]">
                    <button 
                        class="w-1 h-1 rounded-full transition-colors"
                        class:bg-blue-600={currentIndex === -1}
                        class:bg-gray-300={currentIndex !== -1}
                        class:dark:bg-blue-500={currentIndex === -1}
                        class:dark:bg-gray-600={currentIndex !== -1}
                        onclick={() => {
                            direction = currentIndex > -1 ? -1 : 1;
                            currentIndex = -1;
                        }}
                        aria-label="Show total balance"
                    ></button>
                    {#each banks as _, i}
                        <button 
                            class="w-1 h-1 rounded-full transition-colors"
                            class:bg-blue-600={currentIndex === i}
                            class:bg-gray-300={currentIndex !== i}
                            class:dark:bg-blue-500={currentIndex === i}
                            class:dark:bg-gray-600={currentIndex !== i}
                            onclick={() => {
                                direction = currentIndex > i ? -1 : 1;
                                currentIndex = i;
                            }}
                            aria-label="Show bank balance {i + 1}"
                        ></button>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .financial-dashboard {
        max-width: 400px;
        margin: 0 auto;
        height: auto;
        min-height: 90px;
    }

    /* Prevent layout shifts */
    :global(.financial-dashboard) {
        contain: layout;
    }
</style> 