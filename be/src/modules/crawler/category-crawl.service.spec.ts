import type { Job, Queue } from 'bullmq';

import { CategoryCrawlService } from './category-crawl.service';

describe('CategoryCrawlService.trigger', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-11T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createService(existing: Partial<Job> | undefined) {
    const queue = {
      getJob: jest.fn().mockResolvedValue(existing),
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as Queue<{ runId: string }>;

    const service = new CategoryCrawlService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      queue,
      {} as never,
    );

    return { queue, service };
  }

  it('keeps an existing successful job by default', async () => {
    const existing = {
      getState: jest.fn().mockResolvedValue('completed'),
      remove: jest.fn(),
    };
    const { queue, service } = createService(existing);

    await expect(service.trigger()).resolves.toEqual({
      runId: 'category-crawl-2026-08-11',
      enqueued: false,
    });
    expect(existing.remove).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('removes the existing job and enqueues a new one when forceRetry is true', async () => {
    const existing = {
      getState: jest.fn().mockResolvedValue('completed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const { queue, service } = createService(existing);

    await expect(service.trigger(true)).resolves.toEqual({
      runId: 'category-crawl-2026-08-11',
      enqueued: true,
    });
    expect(existing.remove).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'run-category-crawl',
      { runId: 'category-crawl-2026-08-11' },
      expect.objectContaining({ jobId: 'category-crawl-run-2026-08-11' }),
    );
  });

  it('continues to retry failed jobs without forceRetry', async () => {
    const existing = {
      getState: jest.fn().mockResolvedValue('failed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const { queue, service } = createService(existing);

    await expect(service.trigger()).resolves.toMatchObject({ enqueued: true });
    expect(existing.remove).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});
