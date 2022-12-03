export type TypeHandlerOptions = {
  name?: string;
  deep?: boolean;
  receiver?: any;
  target?: any;
  key?: string;
  value?: any;
  keysChanged?: boolean;
  valueChanged?: boolean;
};

export type HandlerHookType = (options: TypeHandlerOptions) => void;
export type CheckProxyHookType = (options: { target: any; key: string; value: any }) => boolean;

export type ReactiveHandlerHooks = {
  onGet: HandlerHookType;
  onSet: HandlerHookType;
  onDelete: HandlerHookType;
  onHas: HandlerHookType;
  needsProxy: CheckProxyHookType;
};

export type ReactiveOptions = {
  name?: any;
  deep?: boolean;
} & Partial<ReactiveHandlerHooks>;
