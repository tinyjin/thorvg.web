import { swc } from "rollup-plugin-swc3";
import { dts } from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import pkg from './package.json' assert { type: 'json' };
import path from 'path';

const name = 'ThorVG';
const commonOutput = {
  name,
  minifyInternalExports: true,
  inlineDynamicImports: true,
  sourcemap: true,
};

const PresetModule = {
  Default: "default",
  SW: "sw",
  GL: "gl",
  WG: "wg",
  SW_LITE: "sw-lite",
  GL_LITE: "gl-lite",
  WG_LITE: "wg-lite",
};

const presetMap = {
  [PresetModule.Default]: {
    path: '/dist',
    renderer: null, // Runtime selection
    input: "./src/index.ts",
    output: {
      umd: './dist/webcanvas.js',
      cjs: pkg.exports['.'].require,
      esm: pkg.exports['.'].import,
    }
  },
  [PresetModule.SW]: {
    path: '/dist/sw',
    renderer: 'sw',
    input: "./src/preset-index.ts",
    output: {
      umd: './dist/sw/webcanvas.js',
      cjs: pkg.exports['./sw'].require,
      esm: pkg.exports['./sw'].import,
    }
  },
  [PresetModule.GL]: {
    path: '/dist/gl',
    renderer: 'gl',
    input: "./src/preset-index.ts",
    output: {
      umd: './dist/gl/webcanvas.js',
      cjs: pkg.exports['./gl'].require,
      esm: pkg.exports['./gl'].import,
    }
  },
  [PresetModule.WG]: {
    path: '/dist/wg',
    renderer: 'wg',
    input: "./src/preset-index.ts",
    output: {
      umd: './dist/wg/webcanvas.js',
      cjs: pkg.exports['./wg'].require,
      esm: pkg.exports['./wg'].import,
    }
  },
  [PresetModule.SW_LITE]: {
    path: '/dist/sw-lite',
    renderer: 'sw',
    input: "./src/preset-index.ts",
    output: {
      umd: './dist/sw-lite/webcanvas.js',
      cjs: pkg.exports['./sw-lite'].require,
      esm: pkg.exports['./sw-lite'].import,
    }
  },
  [PresetModule.GL_LITE]: {
    path: '/dist/gl-lite',
    renderer: 'gl',
    input: "./src/preset-index.ts",
    output: {
      umd: './dist/gl-lite/webcanvas.js',
      cjs: pkg.exports['./gl-lite'].require,
      esm: pkg.exports['./gl-lite'].import,
    }
  },
  [PresetModule.WG_LITE]: {
    path: '/dist/wg-lite',
    renderer: 'wg',
    input: "./src/preset-index.ts",
    output: {
      umd: './dist/wg-lite/webcanvas.js',
      cjs: pkg.exports['./wg-lite'].require,
      esm: pkg.exports['./wg-lite'].import,
    }
  },
};

const createWebCanvasConfig = (preset) => {
  const config = presetMap[preset];
  const replaceValues = {
    '__THORVG_VERSION__': process.env.THORVG_VERSION,
  };

  // For preset builds, replace renderer placeholder and dist path
  if (config.renderer) {
    replaceValues['__RENDERER__'] = config.renderer;
    replaceValues['/dist'] = config.path;
  }

  return {
    input: config.input,
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    },
    output: [
      {
        file: config.output.esm,
        format: "esm",
        ...commonOutput,
      },
      {
        file: config.output.cjs,
        format: "cjs",
        ...commonOutput,
      },
      {
        file: config.output.umd,
        format: "umd",
        hoistTransitiveImports: true,
        ...commonOutput,
      },
    ],
    plugins: [
      // Alias thorvg module import to preset-specific directory
      ...(config.renderer ? [
        alias({
          entries: [
            { find: '../dist/thorvg', replacement: path.join('..', config.path, 'thorvg') },
          ]
        }),
      ] : []),
      replace({
        include: ['src/**/*.ts'],
        preventAssignment: true,
        values: replaceValues,
      }),
      commonjs({
        include: /node_modules/
      }),
      swc({
        include: /\.[mc]?[jt]sx?$/,
        exclude: /node_modules/,
        tsconfig: "tsconfig.json",
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: false,
            decorators: false,
            declaration: true,
            dynamicImport: true,
          },
          target: "es2020",
        },
      }),
      nodeResolve(),
      terser({
        compress: {
          pure_getters: true,
          passes: 3,
          drop_console: true,
          drop_debugger: true
        },
        mangle: true,
        output: {
          comments: false,
        },
      }),
    ],
  };
};

export default [
  // Default (all engines)
  createWebCanvasConfig(PresetModule.Default),
  // Full presets (single engine, all loaders)
  createWebCanvasConfig(PresetModule.SW),
  createWebCanvasConfig(PresetModule.GL),
  createWebCanvasConfig(PresetModule.WG),
  // Lite presets (single engine, minimal loaders)
  createWebCanvasConfig(PresetModule.SW_LITE),
  createWebCanvasConfig(PresetModule.GL_LITE),
  createWebCanvasConfig(PresetModule.WG_LITE),
  // Type definitions (single, shared across all presets)
  {
    input: "./src/index.ts",
    treeshake: true,
    output: [
      {
        file: pkg.types,
        format: "esm",
      }
    ],
    plugins: [
      dts(),
    ],
  }
];
