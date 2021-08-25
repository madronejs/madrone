interface Plugin {
  name: string,
  mix: (toMix: Array<any>) => any,
  install: (ctx: object, values: any) => void
}
