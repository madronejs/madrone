// eslint-disable-next-line import/prefer-default-export
export function delay(t?, v?) {
  return new Promise((resolve) => {
    setTimeout(resolve.bind(null, v), t);
  });
}
