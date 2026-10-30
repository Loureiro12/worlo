import { defineConfig } from 'drizzle-kit';

// `pnpm db:generate` after editing src/schema.ts. The `expo` driver also emits
// drizzle/migrations.js, which the app bundles and runs on startup.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/schema.ts',
  out: './drizzle',
});
