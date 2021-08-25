import Madrone from '../Madrone';

describe('Madrone.isMadrone', () => {
  it('returns true if instance of model is Madrone', () => {
    const model = Madrone.Model.create({});
    const instance = model.create();

    expect(Madrone.isMadrone(instance)).toEqual(true);
  });

  it('returns false if instance of model is regular object', () => {
    expect(Madrone.isMadrone({})).toEqual(false);
  });
});
