<script lang="ts">
    import { fade, fly } from 'svelte/transition';

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
            // Fetch all bank data from the server endpoint
            const response = await fetch('/api/bank-balances');
            
            if (response.status === 401) {
                // Handle unauthorized - redirect to auth page
                window.location.href = '/auth';
                return;
            }
            
            if (!response.ok) throw new Error('Failed to fetch bank data');
            
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
    let currentDisplay = $derived(
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

    // Add state for modal
    let isModalOpen = $state(false);

    // Function to handle modal close
    function handleModalClose() {
        isModalOpen = false;
    }
</script>

<div class="account-dashboard">
    <div class="relative overflow-hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1">
            {#if loading}
                <div class="flex items-center justify-center h-[40px]">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
            {:else if error}
                <div class="text-red-500 text-center h-[40px] flex items-center justify-center">
                    {error}
                </div>
            {:else}
                <div class="relative flex items-center justify-between h-[40px]">
                    <!-- Left Arrow -->
                    <button 
                        class="absolute left-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
                        onclick={goLeft}
                        aria-label="Previous balance"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>

                    <!-- Content with fixed height container -->
                    <div class="flex-1 mx-6 overflow-hidden">
                        <div class="relative h-[35px]">
                            {#key currentIndex}
                                <div 
                                    class="absolute inset-0 flex flex-col items-center justify-center"
                                    in:fly={{ x: direction * 100, duration: 300 }}
                                    out:fly={{ x: direction * -100, duration: 300 }}
                                >
                                    <!-- Balance -->
                                    <button 
                                        class="text-xl font-bold text-gray-800 dark:text-gray-200 leading-none mb-0.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" 
                                        class:text-red-600={currentDisplay.value < 0} 
                                        class:dark:text-red-400={currentDisplay.value < 0}
                                        onclick={() => isModalOpen = true}
                                    >
                                        {formatEuro(currentDisplay.value)}
                                    </button>

                                    <!-- Subtitle -->
                                    <div class="text-[10px] text-gray-500 dark:text-gray-400 leading-none">
                                        {currentDisplay.subtitle.toUpperCase()}
                                    </div>
                                </div>
                            {/key}
                        </div>
                    </div>

                    <!-- Right Arrow -->
                    <button 
                        class="absolute right-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
                        onclick={goRight}
                        aria-label="Next balance"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                </div>

                <!-- Navigation Dots -->
                <div class="flex justify-center gap-0.5 h-[3px] -mt-0.5">
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

<!-- Account Details Modal -->
{#if isModalOpen}
<div 
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-transparent"
    role="dialog"
    aria-modal="true"
>
    <!-- Backdrop -->
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        aria-hidden="true"
        onclick={handleModalClose}
        onkeydown={(e) => e.key === 'Escape' && handleModalClose()}
        role="presentation"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-white dark:bg-slate-900 w-[calc(100%-2rem)] sm:w-[500px] max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-xl rounded-2xl">
        <div class="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Account Balances
            </h2>
            <button
                type="button"
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onclick={handleModalClose}
                aria-label="Close account details"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 sm:p-6">
            <!-- Total Balance -->
            <div class="mb-6">
                <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Total Balance
                </div>
                <div class="text-2xl font-bold {totalBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}">
                    {formatEuro(totalBalance)}
                </div>
            </div>

            <!-- Individual Bank Accounts -->
            <div class="space-y-4">
                {#each banks as bank}
                    <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {bank.name}
                            </div>
                            <div class="text-lg font-semibold {bank.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}">
                                {formatEuro(bank.balance)}
                            </div>
                        </div>
                        {#if bank.accountCounts?.bank_account}
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {bank.accountCounts.bank_account} account{bank.accountCounts.bank_account === 1 ? '' : 's'}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
{/if}

<style>
    .account-dashboard {
        max-width: 400px;
        margin: 0 auto;
        height: auto;
    }

    /* Prevent layout shifts */
    :global(.account-dashboard) {
        contain: layout;
    }
</style> 