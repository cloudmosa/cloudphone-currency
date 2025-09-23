import { pluginHtmlMinifierTerser } from "rsbuild-plugin-html-minifier-terser";
import { defineConfig } from "@rsbuild/core";

const BASE_PATH = process.env.BASE_PATH || '/';
const NODE_ENV = process.env.NODE_ENV;

export default defineConfig({
  output: {
    assetPrefix: BASE_PATH,
    dataUriLimit: {
      image: 25000,
    },
  },
  performance: {
    removeConsole: (NODE_ENV !== 'development'),
  },
  plugins: [
    pluginHtmlMinifierTerser({
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
    }),
  ],
  server: {
    publicDir: false,
  },
  html: {
    template: "index.html",
    appIcon: {
      name: 'Currency Converter',
      icons: [
        { src: './assets/img/favicon-16x16.png', size: 16 },
        { src: './assets/img/favicon-32x32.png', size: 32 },
        { src: './assets/img/android-chrome-192x192.png', size: 192 },
        { src: './assets/img/android-chrome-512x512.png', size: 512 },
      ],
    },
    favicon: './assets/img/favicon.ico',
  },
  source: {
    define: {
      'process.env.BUILD_HASH': JSON.stringify(process.env.BUILD_HASH),
    },
  },
});
