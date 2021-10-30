import Integration from './Integration';
import { MadroneType } from '../Madrone';

interface ComputedConfig extends PropertyDescriptor {
  cache?: boolean;
}

export default interface Plugin {
  readonly name: string;
  mix?: (toMix: Array<any>) => any;
  mergeValues?: (shape: any) => void;
  install?: (ctx: MadroneType, values: any) => void;
  integrate?: (ctx: any) => Integration;
  watch?: (scope: () => any, handler: () => any, options?: { deep?: boolean }) => () => void;
  describeComputed?: (name: string, config: ComputedConfig) => PropertyDescriptor;
  describeProperty?: (name: string, config: PropertyDescriptor) => PropertyDescriptor;
}
