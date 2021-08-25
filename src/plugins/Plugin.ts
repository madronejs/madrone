import { MadroneType } from '../Madrone';

export default interface Plugin {
  readonly name: string,
  mix?: (toMix: Array<any>) => any,
  install?: (ctx: MadroneType, values: any) => void
}