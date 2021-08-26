import omit from 'lodash/omit';
import computed from './testComputed';
import created from './testCreated';
import createNode from './testCreateNode';
import data from './testData';
import proxy from './testProxy';
import relationships from './testRelationships';
import toJSON from './testToJSON';
import watch from './testWatch';

const testObj = {
  // created,
  // data,
  computed,
  // watch, --
  // relationships,
  // createNode,
  // toJSON,
  // proxy,
};

export default function testAll(name, integration, { blacklist = [] } = {}) {
  const toTest = omit(testObj, blacklist);

  Object.values(toTest).forEach((item) => item(name, integration));
}
