/**
 * Optimized Webpack Configuration for EMR React Application
 * Focuses on bundle size optimization, code splitting, and performance
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

module.exports = {
  mode: isProduction ? 'production' : 'development',

  entry: {
    main: './src/index.tsx',
  },

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: isProduction ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
    chunkFilename: isProduction
      ? 'static/js/[name].[contenthash:8].chunk.js'
      : 'static/js/[name].chunk.js',
    publicPath: '/',
    clean: true,
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@contexts': path.resolve(__dirname, 'src/contexts'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },

  // 模块配置
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/media/[name].[hash:8][ext]',
        },
      },
    ],
  },

  // 优化配置
  optimization: {
    // 代码分割
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // 第三方库单独打包
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all',
        },
        // React相关库单独打包
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
          name: 'react',
          priority: 20,
          chunks: 'all',
        },
        // UI库单独打包
        ui: {
          test: /[\\/]node_modules[\\/](bootstrap|tailwindcss|react-bootstrap)[\\/]/,
          name: 'ui',
          priority: 15,
          chunks: 'all',
        },
        // 工具库单独打包
        utils: {
          test: /[\\/]node_modules[\\/](axios|lodash|date-fns|uuid)[\\/]/,
          name: 'utils',
          priority: 15,
          chunks: 'all',
        },
        // 默认分组
        default: {
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },

    // 运行时代码单独提取
    runtimeChunk: {
      name: 'runtime',
    },

    // 压缩配置
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      // 使用默认的TerserPlugin进行JS压缩
      '...',
    ],
  },

  // 插件配置
  plugins: [
    // 生产环境启用Bundle分析器
    ...(process.env.ANALYZE === 'true'
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-report.html',
          }),
        ]
      : []),
  ],

  // 开发服务器配置
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'https://localhost:3001',
        secure: false,
        changeOrigin: true,
      },
    },
  },

  // 性能配置
  performance: {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000, // 500KB
  },

  // 开发工具
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
};

// 如果是分析模式，添加分析插件
if (process.env.ANALYZE === 'true') {
  module.exports.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      openAnalyzer: true,
    })
  );
}
