import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so the build works at any path — needed for GitHub
  // Pages, which serves this repo at https://trex2012.github.io/game/.
  base: './',
});
