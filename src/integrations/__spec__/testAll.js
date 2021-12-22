import omit from 'lodash/omit';
import auto from './testAuto';
import testClass from './testClass';

const testObj = {
  auto,
  testClass,
};

export default function testAll(name, integration, { blacklist = [] } = {}) {
  const toTest = omit(testObj, blacklist);

  Object.values(toTest).forEach((item) => item(name, integration));
}
