import Observer, { ObservableOptions } from './Observer';

/**
 * Create a new computed instance
 * @param options the computed options
 * @returns the created instance
 */
export default function Computed<T>(options: ObservableOptions<T>) {
  return Observer(options);
}
