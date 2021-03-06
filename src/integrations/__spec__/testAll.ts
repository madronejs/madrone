import omit from 'lodash/omit';
import auto from './testAuto';
import testClass from './testClass';
import testAccess from './testAccess';

const testObj = {
  auto,
  testClass,
  testAccess,
};

export default function testAll(
  name: string,
  integration,
  options?: {
    blacklist?: Array<string>;
  }
) {
  const toTest = omit(testObj, options?.blacklist || []);

  Object.values(toTest).forEach((item: any) => item(name, integration));
}
