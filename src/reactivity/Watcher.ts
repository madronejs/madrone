import cloneDeep from 'lodash/cloneDeep';
import Observer from './Observer';

function Watcher() {}

/**
 * Watch an observable for changes
 * @param get the getter function returning the item to watch
 * @param handler the callback whenever the value returned from `get` changes
 * @param {Boolean} [options.deep] deeply watch the value
 * @returns a disposer
 */
Watcher.create = (get, handler, { deep = false } = {}) => {
  let getter = get;

  if (deep) {
    getter = () => cloneDeep(get());
  }

  const obs = Observer.create({
    get: getter,
    onChange: ({ value, prev }) => handler(value, prev),
  });

  // run the observer immediately to get the dependencies
  obs.run();

  // return disposer to stop watching
  return () => obs.dispose();
};

export default Watcher;
