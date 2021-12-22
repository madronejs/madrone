import cloneDeep from 'lodash/cloneDeep';
import Observer from './Observer';

/**
 * Watch an observable for changes
 * @param get the getter function returning the item to watch
 * @param handler the callback whenever the value returned from `get` changes
 * @param {Boolean} [options.deep] deeply watch the value
 * @returns a disposer
 */
export default function Watcher(
  get: () => any,
  handler: (val?: any, old?: any) => any,
  options?: { deep?: boolean }
) {
  let getter = get;

  if (options?.deep) {
    getter = () => cloneDeep(get());
  }

  const obs = Observer({
    get: getter,
    onChange: ({ value, prev }) => handler(value, prev),
  });

  // run the observer immediately to get the dependencies
  obs.run();

  // return disposer to stop watching
  return () => obs.dispose();
}
