<script lang="ts">
  // Import the FinancialDashboard component
  import FinancialDashboard from '$lib/components/FinancialDashboard.svelte';
  import AccountBalances from '$lib/components/AccountBalances.svelte';

  // Format currency
  function formatEuro(value: number): string {
      const roundedValue = Math.round(value);
      const formattedValue = roundedValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${formattedValue}€`;
  }
</script>

<!-- Account Balances Section -->
<div>
  <AccountBalances />
</div>

<!-- Financial Dashboard Section -->
<div class="mt-2">
  <FinancialDashboard />
</div>


