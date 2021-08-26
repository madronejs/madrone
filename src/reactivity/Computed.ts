import Observer from './Observer';

function Computed() {}

/**
 * Create a new computed instance
 * @param options the computed options
 * @returns the created instance
 */
Computed.create = (options) => {
  return Observer(options);
};

export default Computed;
