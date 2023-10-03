export interface MadroneDescriptor extends PropertyDescriptor {
  /** Cache a computed property */
  cache?: boolean;
  /** Define a deeply reactive property */
  deep?: boolean;
}
export type MadroneComputedDescriptor = Pick<
  MadroneDescriptor,
  'get' | 'set' | 'cache' | 'enumerable' | 'configurable'
>;
export type MadronePropertyDescriptor = Pick<
  MadroneDescriptor,
  'configurable' | 'enumerable' | 'value' | 'deep'
>;

export interface MadroneDescriptorMap {
  [key: string]: MadroneDescriptor;
}

export type DecoratorDescriptorType = Omit<MadroneDescriptor, 'get' | 'set' | 'writable' | 'value'>;
export type DecoratorOptionType = {
  descriptors?: DecoratorDescriptorType;
};

export type WatcherOptions = {
  immediate?: boolean;
};

export interface Integration {
  defineProperty: (
    target: any,
    name: string,
    config: MadronePropertyDescriptor,
    options?: any
  ) => any;
  defineComputed: (
    target: any,
    name: string,
    config: MadroneComputedDescriptor,
    options?: any
  ) => any;
  toRaw?: <T>(target: T) => T;
  watch?: <T>(
    scope: () => any,
    handler: (val: T, old?: T) => any,
    options?: WatcherOptions
  ) => () => void;
  describeComputed?: (
    name: string,
    config: MadroneComputedDescriptor,
    options?: any
  ) => PropertyDescriptor;
  describeProperty?: (
    name: string,
    config: MadronePropertyDescriptor,
    options?: any
  ) => PropertyDescriptor;
}
