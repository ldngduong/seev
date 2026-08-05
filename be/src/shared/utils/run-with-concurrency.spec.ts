import { runWithConcurrency } from './run-with-concurrency';

describe('runWithConcurrency', () => {
  it('keeps result order while limiting active workers', async () => {
    let activeWorkers = 0;
    let peakWorkers = 0;

    const results = await runWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (item) => {
        activeWorkers += 1;
        peakWorkers = Math.max(peakWorkers, activeWorkers);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeWorkers -= 1;
        return item * 2;
      },
    );

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(peakWorkers).toBe(2);
  });

  it('uses at least one worker for invalid low concurrency values', async () => {
    await expect(
      runWithConcurrency(['job'], 0, (item) => Promise.resolve(item)),
    ).resolves.toEqual(['job']);
  });
});
