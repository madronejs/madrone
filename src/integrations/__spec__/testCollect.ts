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
  });
}
