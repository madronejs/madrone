export default interface Integration {
  defineProperty: (name: string, value: any) => void;
  defineComputed: (
    name: string,
    config: { get: () => any; set: (any) => void; cache: boolean }
  ) => void;
  watch: (
    path: Array<string>,
    config: { handler: (val: any, old: any) => void; deep: boolean }
  ) => () => void;
}
