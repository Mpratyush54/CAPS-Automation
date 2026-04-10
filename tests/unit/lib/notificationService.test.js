import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/lib/api', () => ({
  api: { get: vi.fn() },
  unwrap: vi.fn((x) => x),
}));

import { api } from '../../../src/lib/api';
import { notificationService } from '../../../src/services/notificationService';

describe('Unit: services/notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps notifications when backend returns rows[]', async () => {
    api.get.mockResolvedValue({
      rows: [{ id: '1', title: 'Hello', body: 'World', read: false }],
    });

    const result = await notificationService.getNotifications();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Hello');
  });

  it('maps notifications when backend returns notifications[]', async () => {
    api.get.mockResolvedValue({
      notifications: [{ id: '2', title: 'Broadcast', body: 'Body', read: true }],
    });

    const result = await notificationService.getNotifications();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});
