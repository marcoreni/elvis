// config/rspack/rspack.config.js
const { generateRspackConfig, merge } = require('shakapacker/rspack')
const { rspack } = require('@rspack/core')

// 1. Generate base Shakapacker configuration for Rspack
const baseConfig = generateRspackConfig()

// 2. Define custom options to merge into the base configuration
const customConfig = {
  resolve: {
    extensions: ['.css', '.scss', '.js', '.jsx'],
    alias: {
      jquery: 'jquery/src/jquery',
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
  ],
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
