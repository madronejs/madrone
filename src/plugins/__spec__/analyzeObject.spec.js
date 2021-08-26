import { analyzeObject } from '../index';

describe('analyzeObject', () => {
  it('gets feature shape for data', () => {
    const obj = { foo: true, bar: false };
    const shape = analyzeObject(obj);

    expect(Object.keys(shape).length).toEqual(1);
    expect(shape.data()).toEqual(obj);
  });

  it('gets feature shape for computed', () => {
    const obj = {
      get foo() {
        return true;
      },
      get bar() {
        return false;
      },
      set bar(val) {
        this.test = val;
      }
    };
    const shape = analyzeObject(obj);

    expect(Object.keys(shape).length).toEqual(1);
    expect(Object.keys(shape.computed)).toEqual(['foo', 'bar']);
    expect(shape.computed.foo.get).toBeTruthy();
    expect(shape.computed.foo.set).toBeFalsy();
    expect(shape.computed.bar.get).toBeTruthy();
    expect(shape.computed.bar.set).toBeTruthy();
  });
});
