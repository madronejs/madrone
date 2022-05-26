import omit from 'lodash/omit';
import auto from './testAuto';
import testClass from './testClass';

const testObj = {
  auto,
  testClass,
};

export default function testAll(
  name: string,
  integration,
  options?: {
    blacklist?: Array<keyof typeof testObj>;
  }
) {
  const { blacklist } = options || {};
  const toTest = omit(testObj, blacklist || []);

  Object.values(toTest).forEach((item: any) => item(name, integration));
}
