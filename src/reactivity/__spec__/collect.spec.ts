import { describe, it, expect } from 'vitest';
import { collect } from '@/test/collect';
import Computed from '../Computed';
import { getObservers } from '../global';
import Reactive from '../Reactive';

describe('weak observers', () => {
  it('does not grow a never-changing source by one entry per collected observer', async () => {
    const source = Reactive({ label: 'a' });

    for (let round = 0; round < 5; round += 1) {
      for (let i = 0; i < 1000; i += 1) {
        expect(Computed({ get: () => source.label, weak: true }).value).toEqual('a');
      }

      await collect();
    }

    expect(getObservers(source).get('label').size).toBeLessThan(2000);

    const live = Array.from({ length: 10 }, () => Computed({ get: () => source.label, weak: true }));

    for (const cp of live) expect(cp.value).toEqual('a');

    source.label = 'b';

    for (const cp of live) expect(cp.value).toEqual('b');
  });

  it('keeps a strong observer that nothing else references', async () => {
    const source = Reactive({ label: 'a' });
    const seen: string[] = [];

    Computed({
      get: () => source.label,
      onChange: (obs) => {
        seen.push(obs.value);
      },
    }).run();

    await collect();
    source.label = 'b';
    await collect();
    expect(seen).toEqual(['b']);
  });
});
