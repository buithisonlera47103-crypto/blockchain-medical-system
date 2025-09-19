/*
 * CRACO config to reduce CRA build memory usage while keeping functionality
 */

/** @type {import('@craco/craco').CracoConfig} */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 1) Disable JS/CSS minimization to save a lot of memory/CPU
      if (!webpackConfig.optimization) webpackConfig.optimization = {};
      webpackConfig.optimization.minimize = false;

      // 2) Remove TypeScript ForkTsChecker from build (we run tsc separately)
      webpackConfig.plugins = (webpackConfig.plugins || []).filter(
        (plugin) => plugin && plugin.constructor && plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );

      return webpackConfig;
    }
  }
};
