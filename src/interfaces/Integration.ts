export default interface Integration {
  defineProperty: (
    name: string,
    config: {
      value: any;
      enumerable: boolean;
      configurable: boolean;
    }
  ) => void;
  defineComputed: (
    name: string,
    config: {
      get: () => any;
      set: (any) => void;
      cache: boolean;
      enumerable: boolean;
      configurable: boolean;
    }
  ) => void;
  watch: (
    path: Array<string>,
    config: { handler: (val: any, old: any) => void; deep: boolean }
  ) => () => void;
}
