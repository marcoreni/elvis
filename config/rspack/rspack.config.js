// config/rspack/rspack.config.js
const { generateRspackConfig, merge } = require('shakapacker/rspack')
const { rspack } = require('@rspack/core')
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin')

// 1. Generate base Shakapacker configuration for Rspack
const baseConfig = generateRspackConfig()

// 2. Define custom options to merge into the base configuration
const customConfig = {
  resolve: {
    extensions: ['.css', '.scss', '.js', '.jsx'],
    alias: {
      // NOTE: do not alias jquery to 'jquery/src/jquery' -- that is jQuery's AMD source build
      // (one bare `define([...], factory)` with no `typeof define` guard). Webpack's built-in
      // AMD parser rewrote it; rspack + swc do not, so it throws `define is not defined` at
      // runtime and the whole jquery module fails to load (which in turn stops
      // jquery/src/exports/global.js from running `window.jQuery = window.$ = jQuery`). Plain
      // 'jquery' resolves to the dist UMD build, which rspack handles natively.
      React: 'react',
      ReactDOM: 'react-dom',
    }
  },
  plugins: [
    // Use Rspack's built-in ProvidePlugin (matches Webpack's API)
    new rspack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    }),
    new rspack.IgnorePlugin({
      // FIXME: remove this after react18 migration
      resourceRegExp: /^react-dom\/client$/,
    }),
    // Only register the plugin when RSDOCTOR is true, as the plugin will increase the build time.
    process.env.RSDOCTOR &&
      new RsdoctorRspackPlugin({
        // plugin options
      }),
      ].filter(Boolean),
  module: {
    rules: [
      {
        test: /\.(s[ac]ss|css)$/i,
        use: [
          {
            loader: 'sass-loader',
            options: {
              api: 'modern-compiler',
            },
          },
        ],
        type: 'css',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'media/fonts/[name][ext][query]',
        },
      },
    ],
  },
  optimization: {
    splitChunks: {
      minSize: 0,
    },
  }
}

// 3. Merge custom configuration with Shakapacker base config
module.exports = merge(baseConfig, customConfig)
