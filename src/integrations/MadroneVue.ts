import { MadroneStateIntegration } from './MadroneState';

export default function MadroneVueFactory({ reactive, set, init } = {} as any) {
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
      keyItem = reactive({ [VALUE]: 0 });
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
  const depend = (cp, key?:string) => {
    if (FORBIDDEN.has(key)) return;

    const item = getOrAdd(cp, key);

    Reflect.get(item, VALUE);
  };
  // invalidate the reactive property
  const notify = (cp, key?:string) => {
    if (FORBIDDEN.has(key)) return;

    const item = getOrAdd(cp, key);

    reactiveSet(item);
  };

  const onChange = ({ target, key, keysChanged }) => {
    notify(target, key);

    if (keysChanged) {
      notify(target);
    }
  };

  function MadroneVue(ctx) {
    init?.(ctx);
    this.init(ctx, {
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
        onDelete: onChange,
        onSet: onChange,
      },
    });
    this.defineComputed = this.defineComputed.bind(this);
    this.defineProperty = this.defineProperty.bind(this);
    this.watch = this.watch.bind(this);
  }

  MadroneVue.prototype = {
    ...MadroneStateIntegration.prototype,
  };

  return {
    integrate: (ctx) => new MadroneVue(ctx),
  };
}
