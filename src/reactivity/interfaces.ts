export type TypeHandlerOptions<T extends object = any> = {
  name?: string;
  deep?: boolean;
  receiver?: any;
  target?: T;
  key?: keyof T;
  value?: T[keyof T];
  keysChanged?: boolean;
  valueChanged?: boolean;
};

export type HandlerHookType<T extends object = any> = (options: TypeHandlerOptions<T>) => void;
export type CheckProxyHookType<T extends object = any> = (options: {
  target: T;
  key: keyof T;
  value: T[keyof T];
}) => boolean;

export type ReactiveHandlerHooks<T extends object = any> = {
  onGet: HandlerHookType<T>;
  onSet: HandlerHookType<T>;
  onDelete: HandlerHookType<T>;
  onHas: HandlerHookType<T>;
  needsProxy: CheckProxyHookType<T>;
};

export type ReactiveOptions<T extends object = any> = {
  name?: any;
  deep?: boolean;
} & Partial<ReactiveHandlerHooks<T>>;
