import MadroneVue from './MadroneVue';

export default ({ reactive, watch } = {} as any) => {
  const Integration = MadroneVue({ reactive, watch });

  return {
    integrate: (ctx) => Integration.create(ctx),
  };
}
