// 优化后的CRACO配置 - 阶段2: 构建优化
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionWebpackPlugin = require('compression-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // 生产环境优化
      if (env === 'production') {
        // 启用代码压缩
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimize: true,
          
          // 代码分割优化
          splitChunks: {
            chunks: 'all',
            maxSize: 244000, // 244KB
            cacheGroups: {
              // Vendor chunk - 第三方库
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
              },
              // Ant Design单独分离
              antd: {
                test: /[\\/]node_modules[\\/]antd[\\/]/,
                name: 'antd',
                chunks: 'all',
                priority: 20,
                reuseExistingChunk: true,
              },
              // React相关库
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
                name: 'react-vendor',
                chunks: 'all',
                priority: 15,
                reuseExistingChunk: true,
              },
              // 公共代码
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 5,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          },
        };

        // 添加Gzip压缩插件
        webpackConfig.plugins.push(
          new CompressionWebpackPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240, // 只压缩大于10KB的文件
            minRatio: 0.8,
          })
        );

        // Bundle分析（仅在ANALYZE=true时）
        if (process.env.ANALYZE === 'true') {
          webpackConfig.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
              reportFilename: 'bundle-report.html',
              defaultSizes: 'parsed',
              generateStatsFile: true,
              statsFilename: 'bundle-stats.json',
            })
          );
        }
      }

      // 移除TypeScript检查器（运行时不需要，加快构建）
      webpackConfig.plugins = (webpackConfig.plugins || []).filter(
        (plugin) => {
          return (
            plugin &&
            plugin.constructor &&
            plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
          );
        }
      );

      // 优化resolve配置
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
        alias: {
          ...webpackConfig.resolve.alias,
          // 添加路径别名
          '@': paths.appSrc,
          '@components': `${paths.appSrc}/components`,
          '@utils': `${paths.appSrc}/utils`,
          '@hooks': `${paths.appSrc}/hooks`,
          '@contexts': `${paths.appSrc}/contexts`,
        },
      };

      return webpackConfig;
    },
  },

  // 开发服务器配置
  devServer: {
    port: 3000,
    open: false,
    compress: true,
    hot: true,
    historyApiFallback: true,
  },

  // Babel配置
  babel: {
    plugins: [
      // 按需导入Ant Design组件
      [
        'import',
        {
          libraryName: 'antd',
          libraryDirectory: 'es',
          style: true,
        },
      ],
    ],
  },
};
