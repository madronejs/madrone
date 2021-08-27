import difference from 'lodash/difference';
import intersection from 'lodash/intersection';
import lodashSet from 'lodash/set';
import uniqueId from 'lodash/uniqueId';
import Madrone from '../index';
import { toFlatObject } from '../util';
import { Plugin } from '../interfaces';
import ComputedPlugin from './Computed';

const relationshipDescriptors = Object.getOwnPropertyDescriptors({
  /**
   * Test if a property defined on the model is a relationship
   * @param {String} property the property to test
   * @returns {Boolean} if the property is a relationship
   */
  $isRelationship(property) {
    return !!this.$relationships.values[property];
  },

  /**
   * Check if a property is the join for a relationship
   * @param {String} property the property key to check
   * @returns {Boolean} if the property is the join for a relationship
   */
  $isRelationshipJoin(property) {
    return !!this.$relationships.mappings[property];
  },

  /**
   * Get the property this relationship joins on
   * @param {String} property the property to get relationship info from
   * @returns {String|void} the join information for the given property
   */
  $relationshipJoin(property) {
    return this.$relationships.values[property]?.joinOn;
  },

  /**
   * Get the value of the join
   * @param {String} property the property to get relationship info from
   * @returns {any} the value of the join
   */
  $relationshipJoinValue(property) {
    return this[this.$relationshipJoin(property)];
  },

  /**
   * All the keys that are NOT joins
   * @returns {Array.<String>} the keys
   */
  get $nonRelationshipJoinKeys() {
    return difference(Object.keys(this), this.$relationshipJoinKeys);
  },

  /**
   * All the keys that ARE joins
   * @returns {Array.<String>} the keys
   */
  get $relationshipJoinKeys() {
    return Object.keys(this.$relationships.mappings);
  },

  /**
   * All the keys that ARE relationships
   * @return {Array.<String>} the keys
   */
  get $relationshipKeys() {
    return Object.keys(this.$relationships.values);
  },

  /**
   * Override the default behavior for JSON.stringify
   * @param {Object} options Options for how to stringify
   * @return {Object} object representation of Madrone, handling circular references
   */
  toJSON(options) {
    if (typeof this.$traverse === 'function') {
      const obj = {};

      this.$traverse?.(
        this,
        ({ val, inheritance }) => {
          lodashSet(obj, inheritance, val);
        },
        options
      );

      return obj;
    }

    return this;
  },

  /**
   * @instance
   * @param {Object} node something to traverse
   * @param {Function} cb the callback function
   * @param {Object} options traverse options
   * @param {Array} [options.whitelist] the keys to whitelist
   * @param {Number} [options.maxDepth] the max depth to traverse
   * @param {Boolean} [options.useDataKeys] only use data properties
   * @param {Boolean} [options.infinite=false] traverse the entire tree
   * @param {Boolean} [options.useNodeIds=true] resolve relationships by ids
   * @returns {void}
   */
  $traverse(node, cb, options) {
    const {
      maxDepth = 2,
      infinite = false,
      useDataKeys = false,
      useNodeIds = true,
      observed = new WeakMap(),
      inheritance = [],
      whitelist = undefined,
      numRuns = 0,
    } = options && typeof options === 'object' ? options : {};
    const canRecurse = maxDepth > 0 || numRuns === 0 || infinite;

    if (!canRecurse) return;

    const makeOptions = (key, newMaxDepth = maxDepth) => ({
      ...options,
      inheritance: [...inheritance, key],
      maxDepth: Math.max(newMaxDepth, 0),
      numRuns: numRuns + 1,
      observed,
      parent: node,
      whitelist,
      key,
    });

    const addToObserved = () => observed.set(node, inheritance);
    const getObservedInfo = () => {
      const info = {
        __circular__: true, // eslint-disable-line no-underscore-dangle
        inheritance: observed.get(node),
      } as any;

      if (Madrone.isMadrone(node)) {
        info.resolved = !!info.inheritance;
      }

      return info;
    };

    const callback = (val) => {
      cb({ inheritance, val });
    };

    if (node && typeof node === 'object' && !observed.has(node)) {
      if (typeof node.$traverse === 'function') {
        addToObserved();

        let keys;

        if (useNodeIds) {
          keys = node.$nonRelationshipJoinKeys;
        } else {
          keys = Object.keys(node);
        }

        if (useDataKeys) {
          keys = intersection(keys, this.$dataKeys);
        }

        if (Array.isArray(whitelist)) {
          keys = intersection(keys, whitelist);
        }

        keys.forEach((key) => {
          let val;

          if (useNodeIds && node.$isRelationship?.(key)) {
            val = node.$relationshipJoinValue(key);
          } else {
            val = node[key];
          }

          node.$traverse(val, cb, makeOptions(key, maxDepth - 1));
        });
      } else if (Array.isArray(node)) {
        callback([]);
        addToObserved();
        node.forEach((val, index) => this.$traverse(val, cb, makeOptions(index)));
      } else if (node instanceof Set) {
        callback([]);
        addToObserved();
        Array.from(node).forEach((val, index) => this.$traverse(val, cb, makeOptions(index)));
      } else if (node instanceof Map) {
        callback({});
        addToObserved();
        node.forEach((key, val) => this.$traverse(val, cb, makeOptions(key)));
      } else if (node && typeof node === 'object') {
        callback({});
        addToObserved();
        Object.keys(node).forEach((key) => this.$traverse(node[key], cb, makeOptions(key)));
      } else {
        callback(node);
      }
    } else if (typeof node !== 'object') {
      callback(node);
    } else if (observed.has(node)) {
      callback(getObservedInfo());
    }
  },
});

Object.keys(relationshipDescriptors).forEach((key) => {
  relationshipDescriptors[key].enumerable = false;
});

const Relationships: Plugin = {
  name: 'relationships',
  mix: (vals) => {
    const merged = toFlatObject(vals);

    Object.values(merged).forEach((value: any) => {
      if (value && value.joinOn == null) {
        value.joinOn = uniqueId('__relationship');
      }
    });

    return merged;
  },
  mergeValues: (model) => {
    const { relationships: allRelationships, computed: allComputeds } = model;
    const toMixComputed = {};
    const toMixData = {};
    const count = Object.keys(allRelationships || {}).length;

    if (count > 0) {
      Object.keys(allRelationships || {}).forEach((key) => {
        const relationship = allRelationships[key] || {};
        const { resolve, cache, default: defaultVal, setRelationship, joinOn } = relationship;

        allRelationships[key].joinOn = joinOn;
        toMixData[joinOn] = defaultVal;
        toMixComputed[key] = {
          cache,
          get() {
            return resolve?.call(this, this[joinOn]);
          },
          set(val) {
            if (typeof setRelationship === 'function') {
              setRelationship?.call(this, joinOn, val);
            } else {
              this[joinOn] = val;
            }
          },
        };
      });

      model.data.push(() => toMixData);
      model.computed = ComputedPlugin.mix([toMixComputed, allComputeds].filter((item) => !!item));
    }
  },
  install: (ctx, allRelationships) => {
    const mappings = {};

    Object.entries(allRelationships || {}).forEach(([key, val]) => {
      // @ts-ignore
      mappings[val.joinOn] = key;
    });

    Object.defineProperties(ctx, {
      ...relationshipDescriptors,
      $relationships: {
        configurable: true,
        value: {
          values: allRelationships || {},
          mappings,
        },
      },
    });
  },
};

export default Relationships;
