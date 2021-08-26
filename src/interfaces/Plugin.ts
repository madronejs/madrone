import Integration from './Integration';
import { MadroneType } from '../Madrone';

export default interface Plugin {
  readonly name: string
  mix?: (toMix: Array<any>) => any
  mergeValues?: (shape: any) => void
  install?: (ctx: MadroneType, values: any) => void
  integrate?: (ctx: MadroneType) => Integration
}