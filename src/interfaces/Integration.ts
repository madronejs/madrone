export interface MadroneDescriptor extends PropertyDescriptor {
  cache?: boolean;
}

export interface MadroneDescriptorMap {
  [key: string]: MadroneDescriptor;
}

export default interface Integration {
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
  watch?: (scope: () => any, handler: () => any, options?: { deep?: boolean }) => () => void;
  describeComputed?: (name: string, config: MadroneDescriptor, options?: any) => PropertyDescriptor;
  describeProperty?: (
    name: string,
    config: PropertyDescriptor,
    options?: any
  ) => PropertyDescriptor;
}
