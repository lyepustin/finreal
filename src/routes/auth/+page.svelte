<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  
  export let form: ActionData;
</script>

<div class="auth-container">
  <form method="POST" action="?/login" class="auth-form" use:enhance>
    {#if form?.error}
      <div class="error-message">
        {form.error}
      </div>
    {/if}
    {#if form?.message}
      <div class="success-message">
        {form.message}
      </div>
    {/if}
    
    <div class="form-field">
      <label for="email">
        Email
        <input 
          id="email"
          name="email" 
          type="email" 
          value={form?.email ?? ''} 
          required
        />
      </label>
    </div>

    <div class="form-field">
      <label for="password">
        Password
        <input 
          id="password"
          name="password" 
          type="password"
          required
        />
      </label>
    </div>

    <div class="button-group">
      <button type="submit" class="primary">Login</button>
      <button type="submit" formaction="?/signup">Sign up</button>
    </div>
  </form>
</div>

<style>
  .auth-container {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-field input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  button.primary {
    background: #4a90e2;
    color: white;
    border-color: #357abd;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .success-message {
    background: #e8f5e9;
    color: #2e7d32;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
</style>