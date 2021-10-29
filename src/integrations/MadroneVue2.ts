import * as MadroneState from './MadroneState';

export default ({ observable, set }) => {
  const VALUE = 'value';
  const FORBIDDEN = new Set(['__proto__']);
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
  const depend = (cp, key?: string) => {
    if (FORBIDDEN.has(key)) return;

    Reflect.get(getOrAdd(cp, key), VALUE);
  };
  // invalidate the reactive property
  const notify = (cp, key?: string) => {
    if (FORBIDDEN.has(key)) return;

    reactiveSet(getOrAdd(cp, key));
  };

  const deleteIfNeeded = (parent, key) => {
    const item = reactiveMappings.get(parent);

    if (item) notify(item, key);

    reactiveMappings.delete(parent);
  };

  const onDelete = ({ target, key }) => {
    deleteIfNeeded(target, key);
  };

  const onChange = ({ target, key, keysChanged }) => {
    notify(target, key);

    if (keysChanged) notify(target);
  };

  const options = {
    computed: {
      onGet: (cp) => {
        depend(cp, cp.name);
      },
      onImmediateChange: (cp) => {
        notify(cp, cp.name);
      },
    },
    reactive: {
      onGet: ({ target, key }) => {
        depend(target, key);
      },
      onHas: ({ target }) => {
        depend(target);
      },
      onDelete,
      onSet: onChange,
    },
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
    integrate: (ctx) => {
      // HACK: TDR 2021-04-23 -- make Vue think this is a Vue item
      // so it doesn't try to observe/traverse the structure
      Object.defineProperties(ctx, {
        _isVue: { value: true },
        _data: { value: {} },
        $refs: { value: {} },
      });

      return {
        ctx,
        defineComputed: (name, config) => defineComputed(ctx, name, config),
        defineProperty: (name, config) => defineProperty(ctx, name, config),
        watch: (path, config) => MadroneState.watchItem(ctx, path, config),
      };
    },
    watch: MadroneState.watch,
    describeProperty,
    defineProperty,
    describeComputed,
    defineComputed,
  };
};
