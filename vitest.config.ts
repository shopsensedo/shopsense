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

export default defineConfig({
  plugins: [stubAssets],
  test: {
    environment: 'node',
  },
});
