import Observer from './Observer';

/**
 * Create a new computed instance
 * @param options the computed options
 * @returns the created instance
 */
export default function Computed(options) {
  return Observer(options);
}
