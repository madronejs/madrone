/* eslint-disable max-classes-per-file */
import {
  describe, test, expect, beforeAll, afterAll,
} from 'vitest';
import { collect } from '@/test/collect';
import Madrone, { computed, reactive } from '../../index';

export default function testCollect(integrationName, integration) {
  beforeAll(() => {
    Madrone.use(integration);
  });
  afterAll(() => {
    Madrone.unuse(integration);
  });

  describe(`${integrationName}: collection`, () => {
    test('an auto object whose computed read a long-lived source can be collected', async () => {
      const source = Madrone.auto({ label: 'a' });
      // a function, so no local of the test's own frame keeps the owner
      const readOnce = () => {
        const owner = Madrone.auto({
          get text() {
            return source.label;
          },
        });

        expect(owner.text).toEqual('a');

        return new WeakRef(owner);
      };
      const ref = readOnce();

      await collect();
      expect(ref.deref()).toBeUndefined();
    });

    test('a class instance whose @computed read a long-lived source can be collected', async () => {
      class Source {
        @reactive label = 'a';
      }

      class Owner {
        constructor(private source: Source) {}

        @computed get text() {
          return this.source.label;
        }
      }

      const source = new Source();
      const readOnce = () => {
        const owner = new Owner(source);

        expect(owner.text).toEqual('a');

        return new WeakRef(owner);
      };
      const ref = readOnce();

      await collect();
      expect(ref.deref()).toBeUndefined();
    });

    test('a computed whose owner is alive still updates', async () => {
      const source = Madrone.auto({ label: 'a' });
      const owner = Madrone.auto({
        get text() {
          return source.label;
        },
      });

      expect(owner.text).toEqual('a');
      await collect();
      source.label = 'b';
      expect(owner.text).toEqual('b');
    });

    test('a watcher whose disposer was dropped keeps firing', async () => {
      const source = Madrone.auto({ label: 'a' });
      const seen: string[] = [];

      Madrone.watch(() => source.label, (val) => {
        seen.push(val);
      });

      await collect();
      source.label = 'b';
      await collect();
      expect(seen).toEqual(['b']);
    });

    test('a watcher on a computed whose owner is otherwise unreferenced keeps firing', async () => {
      const source = Madrone.auto({ label: 'a' });
      const seen: string[] = [];
      // a function, so no local of the test's own frame keeps the owner
      const watchOwner = () => {
        const owner = Madrone.auto({
          get text() {
            return source.label;
          },
        });

        Madrone.watch(() => owner.text, (val) => {
          seen.push(val);
        });
      };

      watchOwner();
      await collect();
      source.label = 'b';
      await collect();
      expect(seen).toEqual(['b']);
    });

    test('a watcher on a chain of computeds whose owners are otherwise unreferenced keeps firing', async () => {
      const source = Madrone.auto({ label: 'a' });
      const seen: string[] = [];
      const watchChain = () => {
        const inner = Madrone.auto({
          get text() {
            return source.label;
          },
        });
        const outer = Madrone.auto({
          get upper() {
            return inner.text.toUpperCase();
          },
        });

        Madrone.watch(() => outer.upper, (val) => {
          seen.push(val);
        });
      };

      watchChain();
      await collect();
      source.label = 'b';
      await collect();
      source.label = 'c';
      await collect();
      expect(seen).toEqual(['B', 'C']);
    });

    test('a disposed watcher whose disposer is still held does not keep what it read', async () => {
      const source = Madrone.auto({ label: 'a' });
      const seen: string[] = [];
      const watchOnce = () => {
        const owner = Madrone.auto({
          get text() {
            return source.label;
          },
        });
        const stop = Madrone.watch(() => owner.text, (val) => {
          seen.push(val);
        });

        stop();

        return { stop, ref: new WeakRef(owner) };
      };
      const { stop, ref } = watchOnce();

      await collect();
      expect(ref.deref()).toBeUndefined();
      source.label = 'b';
      await collect();
      expect(seen).toEqual([]);
      // stopping again is harmless
      stop();
    });

    test('a computed that was watched can be collected once its watcher is disposed', async () => {
      const source = Madrone.auto({ label: 'a' });
      const watchOnce = () => {
        const owner = Madrone.auto({
          get text() {
            return source.label;
          },
        });
        const stop = Madrone.watch(() => owner.text, () => {});

        stop();

        return new WeakRef(owner);
      };
      const ref = watchOnce();

      await collect();
      expect(ref.deref()).toBeUndefined();
    });
  });
}
