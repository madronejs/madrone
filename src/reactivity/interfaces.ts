export type TypeHandlerOptions<T extends object = object> = {
  name?: string,
  deep?: boolean,
  receiver?: T,
  target?: T,
  key?: PropertyKey,
  value?: unknown,
  keysChanged?: boolean,
  valueChanged?: boolean,
};

export type HandlerHookType<T extends object = object> = (options: TypeHandlerOptions<T>) => void;
export type CheckProxyHookType<T extends object = object> = (options: {
  target: T,
  key: PropertyKey,
  value: unknown,
}) => boolean;

export type ReactiveHandlerHooks<T extends object = object> = {
  onGet: HandlerHookType<T>,
  onSet: HandlerHookType<T>,
  onDelete: HandlerHookType<T>,
  onHas: HandlerHookType<T>,
  needsProxy: CheckProxyHookType<T>,
};

export type ReactiveOptions<T extends object = object> = {
  name?: string,
  deep?: boolean,
} & Partial<ReactiveHandlerHooks<T>>;
