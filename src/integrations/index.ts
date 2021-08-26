export interface Integration {
  defineProperty: (name: string, value: any) => void
  defineComputed: (name: string, config: { get: () => any, set: (any) => void, cache: boolean }) => void
  watch: (path: Array<string>, config: { handler: Function, deep: boolean }) => Function
}

export { default as MadroneState } from './MadroneState';