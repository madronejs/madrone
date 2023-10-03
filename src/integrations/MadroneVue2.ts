import { objectAccessed } from '@/global';
import { ReactiveOptions } from '@/reactivity/interfaces';
import { ObservableHooksType } from '@/reactivity/Observer';
import { Integration } from '@/interfaces';
import MStateDefault from './MadroneState';
import * as MadroneState from './MadroneState';

type KeyType = string | number | symbol;

const FORBIDDEN = new Set<KeyType>(['__proto__', '__ob__']);
const VALUE = 'value';

export default function MadroneVue2(opts): Integration {
  const { observable, set } = opts;
  // store all reactive properties
  const reactiveMappings = new WeakMap();
  // get or add a tracked property
  const getOrAdd = (parent, key) => {
    let item = reactiveMappings.get(parent);

    if (!item) {
      item = new Map();
      reactiveMappings.set(parent, item);
    }

    let keyItem = item.get(key);

    if (!keyItem) {
      keyItem = observable({ [VALUE]: 0 });
      item.set(key, keyItem);
    }

    return keyItem;
  };
  // reactive setter
  const reactiveSet = set
    ? (item) => set(item, VALUE, item[VALUE] + 1)
    : (item) => {
        item[VALUE] += 1;
      };
  // depend on a reactive property
  const depend = (cp, key?: KeyType) => {
    if (FORBIDDEN.has(key)) return;

    Reflect.get(getOrAdd(cp, key), VALUE);
  };
  // invalidate the reactive property
  const notify = (cp, key?: KeyType) => {
    if (FORBIDDEN.has(key)) return;

    reactiveSet(getOrAdd(cp, key));
  };

  const deleteIfNeeded = (parent, key: KeyType) => {
    const item = reactiveMappings.get(parent);

    if (item) notify(item, key);

    reactiveMappings.delete(parent);
  };

  const reactiveOptions: ReactiveOptions = {
    onGet: ({ target, key }) => {
      objectAccessed(target);
      depend(target, key);
    },
    onHas: ({ target, key }) => {
      depend(target, key);
    },
    onDelete: ({ target, key }) => {
      deleteIfNeeded(target, key);
    },
    onSet: ({ target, key, keysChanged }) => {
      notify(target, key);

      if (keysChanged) notify(target);
    },
    needsProxy: ({ key }) => !FORBIDDEN.has(key),
  };
  const computedOptions: ObservableHooksType<any> = {
    onGet: (cp) => {
      depend(cp, cp.name);
    },
    onImmediateChange: (cp) => {
      notify(cp, cp.name);
    },
  };

  const options = {
    computed: computedOptions,
    reactive: reactiveOptions,
  };

  function describeComputed(name, config) {
    return MadroneState.describeComputed(name, config, options);
  }

  function describeProperty(name, config) {
    return MadroneState.describeProperty(name, config, options);
  }

  function defineComputed(target, name, config) {
    return MadroneState.defineComputed(target, name, config, options);
  }

  function defineProperty(target, name, config) {
    return MadroneState.defineProperty(target, name, config, options);
  }

  return {
    toRaw: MStateDefault.toRaw,
    watch: MadroneState.watch,
    describeProperty,
    defineProperty,
    describeComputed,
    defineComputed,
  };
}
