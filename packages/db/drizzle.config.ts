// @ts-nocheck
import { defineConfig } from 'drizzle-kit';
import process from 'node:process';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
});
