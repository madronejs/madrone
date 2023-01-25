export interface MadroneDescriptor extends PropertyDescriptor {
  cache?: boolean;
}

export interface MadroneDescriptorMap {
  [key: string]: MadroneDescriptor;
}

export type DecoratorDescriptorType = Omit<
  PropertyDescriptor,
  'get' | 'set' | 'writable' | 'value'
>;
export type DecoratorOptionType = {
  descriptors?: DecoratorDescriptorType;
};

export type WatcherOptions = {
  deep?: boolean;
  immediate?: boolean;
};

export interface Integration {
  defineProperty: (
    target: any,
    name: string,
    config: {
      value?: any;
      enumerable?: boolean;
      configurable?: boolean;
    },
    options?: any
  ) => any;
  defineComputed: (
    target: any,
    name: string,
    config: {
      get: () => any;
      set?: (any) => void;
      cache?: boolean;
      enumerable?: boolean;
      configurable?: boolean;
    },
    options?: any
  ) => any;
  toRaw?: <T>(target: T) => T;
  watch?: <T>(
    scope: () => any,
    handler: (val: T, old?: T) => any,
    options?: WatcherOptions
  ) => () => void;
  describeComputed?: (name: string, config: MadroneDescriptor, options?: any) => PropertyDescriptor;
  describeProperty?: (
    name: string,
    config: PropertyDescriptor,
    options?: any
  ) => PropertyDescriptor;
}
