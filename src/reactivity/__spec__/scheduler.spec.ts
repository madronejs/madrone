import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { schedule } from '../global';
import { delay } from '@/test/util';

describe('scheduler', () => {
  it('executes tasks asynchronously', async () => {
    const order: number[] = [];

    order.push(1);
    schedule(() => order.push(3));
    order.push(2);

    expect(order).toEqual([1, 2]);
    await delay();
    expect(order).toEqual([1, 2, 3]);
  });

  it('batches multiple tasks into one microtask', async () => {
    const order: number[] = [];

    schedule(() => order.push(1));
    schedule(() => order.push(2));
    schedule(() => order.push(3));

    expect(order).toEqual([]);
    await delay();
    expect(order).toEqual([1, 2, 3]);
  });

  it('processes tasks scheduled during execution in same batch', async () => {
    const order: number[] = [];
    let batchCount = 0;

    // Track when batches start/end by scheduling a marker at the end
    const markBatchEnd = () => {
      batchCount += 1;
    };

    schedule(() => {
      order.push(1);
      // Schedule another task during execution
      schedule(() => {
        order.push(2);
        // Schedule yet another task
        schedule(() => {
          order.push(3);
        });
      });
    });
    schedule(markBatchEnd);

    await delay();

    expect(order).toEqual([1, 2, 3]);
    // All tasks should complete in one batch
    expect(batchCount).toEqual(1);
  });

  it('handles deeply nested task scheduling', async () => {
    const order: number[] = [];
    const depth = 10;

    const scheduleNested = (n: number) => {
      order.push(n);

      if (n < depth) {
        schedule(() => scheduleNested(n + 1));
      }
    };

    schedule(() => scheduleNested(1));

    await delay();

    expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('handles multiple tasks each scheduling follow-ups', async () => {
    const order: string[] = [];

    schedule(() => {
      order.push('a1');
      schedule(() => order.push('a2'));
    });

    schedule(() => {
      order.push('b1');
      schedule(() => order.push('b2'));
    });

    schedule(() => {
      order.push('c1');
      schedule(() => order.push('c2'));
    });

    await delay();

    // Initial tasks run in order, then their follow-ups
    expect(order).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'c2']);
  });

  it('starts new batch after previous completes', async () => {
    const order: number[] = [];

    schedule(() => order.push(1));

    await delay();
    expect(order).toEqual([1]);

    // New batch after previous completed
    schedule(() => order.push(2));

    await delay();
    expect(order).toEqual([1, 2]);
  });

  describe('error handling', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('continues processing tasks after one throws', async () => {
      const order: number[] = [];

      schedule(() => order.push(1));
      schedule(() => {
        throw new Error('task error');
      });
      schedule(() => order.push(3));

      await delay();

      // Tasks before and after the error should still run
      expect(order).toEqual([1, 3]);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('allows scheduling new tasks after error', async () => {
      const order: number[] = [];

      schedule(() => {
        throw new Error('first batch error');
      });

      await delay();

      // Scheduler should recover and allow new tasks
      schedule(() => order.push(1));
      schedule(() => order.push(2));

      await delay();

      expect(order).toEqual([1, 2]);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('processes nested tasks after parent throws', async () => {
      const order: number[] = [];

      schedule(() => {
        order.push(1);
        schedule(() => order.push(2));
        throw new Error('error after scheduling nested task');
      });
      schedule(() => order.push(3));

      await delay();

      // Task 1 ran, threw, but 2 and 3 should still run
      expect(order).toEqual([1, 3, 2]);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('handles multiple errors in same batch', async () => {
      const order: number[] = [];

      schedule(() => order.push(1));
      schedule(() => {
        throw new Error('error 1');
      });
      schedule(() => order.push(2));
      schedule(() => {
        throw new Error('error 2');
      });
      schedule(() => order.push(3));

      await delay();

      expect(order).toEqual([1, 2, 3]);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });
  });
});
