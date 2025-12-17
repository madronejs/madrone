export interface MadroneDescriptor extends PropertyDescriptor {
  /** Cache a computed property */
  cache?: boolean,
  /** Define a deeply reactive property */
  deep?: boolean,
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
  [key: string]: MadroneDescriptor,
}

export type DecoratorDescriptorType = Omit<MadroneDescriptor, 'get' | 'set' | 'writable' | 'value'>;
export type DecoratorOptionType = {
  descriptors?: DecoratorDescriptorType,
};

export type WatcherOptions = {
  immediate?: boolean,
};

export interface IntegrationOptions {
  reactive?: unknown,
  computed?: unknown,
}

export interface Integration {
  defineProperty: (
    target: object,
    name: string,
    config: MadronePropertyDescriptor,
    options?: IntegrationOptions
  ) => void,
  defineComputed: (
    target: object,
    name: string,
    config: MadroneComputedDescriptor,
    options?: IntegrationOptions
  ) => void,
  toRaw?: <T>(target: T) => T,
  watch?: <T>(
    scope: () => T,
    handler: (val: T, old?: T) => void,
    options?: WatcherOptions
  ) => () => void,
  describeComputed?: (
    name: string,
    config: MadroneComputedDescriptor,
    options?: IntegrationOptions
  ) => PropertyDescriptor,
  describeProperty?: (
    name: string,
    config: MadronePropertyDescriptor,
    options?: IntegrationOptions
  ) => PropertyDescriptor,
}
