import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupServer } from 'msw/node';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Set up MSW server if needed (can be expanded later)
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterAll(() => server.close());
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
