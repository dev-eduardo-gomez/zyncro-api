import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { AppModule, ObserveModule } from './app.module.js';

const observeModule = expect.objectContaining({ module: ObserveModule });

describe('AppModule', () => {
  it('keeps Observe out of the static module that the tests import', () => {
    const imports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    );

    expect(imports).not.toContainEqual(observeModule);
  });

  describe('forRoot', () => {
    it('leaves Observe out when there are no credentials', () => {
      expect(AppModule.forRoot(null)).toEqual({ module: AppModule });
    });

    it('registers Observe when there are credentials', () => {
      const { imports } = AppModule.forRoot({
        appKey: 'key',
        appSecret: 'secret',
      });

      expect(imports).toEqual([observeModule]);
    });
  });
});
