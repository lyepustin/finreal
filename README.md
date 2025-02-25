# FinReal - Financial Management Application

A SvelteKit application for managing personal finances with real-time transaction categorization.

## Project Structure

```
src/
├── lib/                    # Library code (shared across the application)
│   ├── api/               # API endpoint handlers
│   │   └── transactions.ts  # Transaction-related API handlers
│   ├── db/                # Database connections and configurations
│   │   └── supabase.ts     # Supabase client configuration
│   ├── models/            # Data models and database operations
│   │   └── transactions.ts  # Transaction-related database operations
│   ├── stores/            # Svelte stores for state management
│   │   └── transactions.ts  # Transaction-related state management
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts        # Shared type definitions
│   └── utils/             # Utility functions
│       └── styles.ts       # Styling utilities
│
├── routes/                # SvelteKit routes (pages and API endpoints)
│   ├── transactions/      # Transaction-related routes
│   │   ├── [id]/           # Individual transaction routes
│   │   │   ├── +page.svelte  # Transaction edit page
│   │   │   ├── +page.server.ts  # Server-side load function
│   │   │   └── +server.ts    # API endpoints for single transaction
│   │   └── +page.svelte    # Transactions list page
│   └── +layout.svelte    # Root layout
```

## Architecture

The application follows a layered architecture:

1. **Database Layer** (`lib/db/`)
   - Handles database connections and configurations
   - Currently using Supabase as the backend

2. **Models Layer** (`lib/models/`)
   - Contains all database operations
   - Handles data validation and transformation
   - Returns strongly typed data

3. **API Layer** (`lib/api/`)
   - Handles API endpoint logic
   - Wraps model functions with HTTP-specific logic
   - Manages API-specific error responses

4. **State Management** (`lib/stores/`)
   - Svelte stores for client-side state
   - Handles UI state and caching
   - Manages optimistic updates

5. **UI Layer** (`routes/`)
   - SvelteKit pages and layouts
   - Components and views
   - Client-side routing

## Key Design Decisions

1. **Separation of Concerns**
   - Database operations are isolated in models
   - API handlers are separate from database operations
   - UI state is managed through stores

2. **Type Safety**
   - Comprehensive TypeScript types for all data structures
   - Shared types between client and server
   - Strong typing for API responses

3. **Error Handling**
   - Consistent error handling patterns
   - Proper error propagation
   - User-friendly error messages

4. **State Management**
   - Centralized state management using Svelte stores
   - Reactive updates using Svelte's runes
   - Optimistic UI updates

## Development

### Prerequisites
- Node.js
- npm/pnpm
- Supabase account

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```env
   PUBLIC_SUPABASE_URL=your_supabase_url
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run development server: `npm run dev`

### Building
```bash
npm run build
```

### Testing
```bash
npm run test
```
