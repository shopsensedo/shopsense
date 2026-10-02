import { defineConfig, type Plugin } from 'vitest/config';
import path from 'path';

// The app's mockData.ts imports .jpg assets; stub them out for unit tests.
const stubAssets: Plugin = {
  name: 'stub-assets-for-tests',
  resolveId(id) {
    if (/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/.test(id)) {
      return path.resolve(import.meta.dirname, 'src/__tests__/assetStub.ts');
    }
    return null;
  },
};

// api/*.ts uses `.js` import extensions (Vercel ESM requirement, see the D2-1
// incident). Map them back to the .ts sources so unit tests can import the
// real handlers.
const apiJsAlias: Plugin = {
  name: 'api-js-alias-for-tests',
  resolveId(id, importer) {
    if (
      typeof importer === 'string' &&
      importer.includes(`${path.sep}api${path.sep}`) &&
      /^\.\/[^/]+\.js$/.test(id)
    ) {
      const target = path.resolve(
        path.dirname(importer),
        id.replace(/\.js$/, '.ts'),
      );
      return target;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [stubAssets, apiJsAlias],
  test: {
    environment: 'node',
  },
});
