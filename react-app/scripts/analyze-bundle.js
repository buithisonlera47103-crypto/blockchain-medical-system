#!/usr/bin/env node

/**
 * Bundle Analysis Script for EMR React Application
 * Analyzes bundle size, identifies optimization opportunities, and provides recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'white') {
  console.log(colorize(message, color));
}

function logSection(title) {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize(title.toUpperCase(), 'cyan'));
  console.log(colorize('='.repeat(60), 'cyan'));
}

function logSubSection(title) {
  console.log('\n' + colorize('-'.repeat(40), 'blue'));
  console.log(colorize(title, 'blue'));
  console.log(colorize('-'.repeat(40), 'blue'));
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
  let totalSize = 0;

  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        calculateSize(path.join(currentPath, file));
      });
    }
  }

  if (fs.existsSync(dirPath)) {
    calculateSize(dirPath);
  }

  return totalSize;
}

function analyzePackageJson() {
  logSection('Package.json Analysis');

  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    log('package.json not found!', 'red');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  logSubSection('Dependencies Overview');
  log(`Production dependencies: ${Object.keys(dependencies).length}`, 'green');
  log(`Development dependencies: ${Object.keys(devDependencies).length}`, 'yellow');

  logSubSection('Large Dependencies (Potential Bundle Bloat)');
  const largeDependencies = [
    '@mui/material',
    '@mui/icons-material',
    'antd',
    '@ant-design/icons',
    'bootstrap',
    'framer-motion',
    'chart.js',
    'react-chartjs-2',
  ];

  largeDependencies.forEach(dep => {
    if (dependencies[dep]) {
      log(`⚠️  ${dep}: ${dependencies[dep]}`, 'yellow');
    }
  });

  logSubSection('UI Library Conflicts');
  const uiLibraries = ['@mui/material', 'antd', 'bootstrap'];
  const foundUiLibs = uiLibraries.filter(lib => dependencies[lib]);

  if (foundUiLibs.length > 1) {
    log('🚨 Multiple UI libraries detected:', 'red');
    foundUiLibs.forEach(lib => log(`   - ${lib}`, 'red'));
    log('Recommendation: Use only one UI library to reduce bundle size', 'yellow');
  } else {
    log('✅ Single UI library detected', 'green');
  }

  logSubSection('Optimization Opportunities');
  const optimizationTips = [
    {
      condition: dependencies['lodash'],
      message: 'Consider using lodash-es or individual lodash functions to enable tree shaking',
    },
    {
      condition: dependencies['moment'],
      message: 'Consider replacing moment.js with date-fns for smaller bundle size',
    },
    {
      condition: dependencies['@mui/material'] && dependencies['@mui/icons-material'],
      message: 'Use babel-plugin-import for Material-UI to import only used components',
    },
    {
      condition: dependencies['antd'],
      message: 'Use babel-plugin-import for Ant Design to import only used components',
    },
  ];

  optimizationTips.forEach(tip => {
    if (tip.condition) {
      log(`💡 ${tip.message}`, 'cyan');
    }
  });
}

function analyzeBuildOutput() {
  logSection('Build Output Analysis');

  const buildPath = path.join(process.cwd(), 'build');
  if (!fs.existsSync(buildPath)) {
    log('Build directory not found. Run "npm run build" first.', 'red');
    return;
  }

  logSubSection('Build Directory Size');
  const totalSize = getDirectorySize(buildPath);
  log(`Total build size: ${formatBytes(totalSize)}`, 'green');

  // Analyze static files
  const staticPath = path.join(buildPath, 'static');
  if (fs.existsSync(staticPath)) {
    logSubSection('Static Assets Breakdown');

    const jsPath = path.join(staticPath, 'js');
    const cssPath = path.join(staticPath, 'css');
    const mediaPath = path.join(staticPath, 'media');

    if (fs.existsSync(jsPath)) {
      const jsSize = getDirectorySize(jsPath);
      log(`JavaScript: ${formatBytes(jsSize)}`, 'yellow');

      // Analyze individual JS files
      const jsFiles = fs
        .readdirSync(jsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const filePath = path.join(jsPath, file);
          const stats = fs.statSync(filePath);
          return { name: file, size: stats.size };
        })
        .sort((a, b) => b.size - a.size);

      log('\nLargest JavaScript files:', 'blue');
      jsFiles.slice(0, 5).forEach(file => {
        log(`  ${file.name}: ${formatBytes(file.size)}`, 'white');
      });
    }

    if (fs.existsSync(cssPath)) {
      const cssSize = getDirectorySize(cssPath);
      log(`\nCSS: ${formatBytes(cssSize)}`, 'yellow');
    }

    if (fs.existsSync(mediaPath)) {
      const mediaSize = getDirectorySize(mediaPath);
      log(`Media: ${formatBytes(mediaSize)}`, 'yellow');
    }
  }

  logSubSection('Bundle Size Recommendations');
  const jsSize = getDirectorySize(path.join(staticPath, 'js'));

  if (jsSize > 2 * 1024 * 1024) {
    // 2MB
    log('🚨 JavaScript bundle is very large (>2MB)', 'red');
    log('Recommendations:', 'yellow');
    log('  - Implement code splitting', 'cyan');
    log('  - Use dynamic imports for routes', 'cyan');
    log('  - Remove unused dependencies', 'cyan');
    log('  - Enable tree shaking', 'cyan');
  } else if (jsSize > 1 * 1024 * 1024) {
    // 1MB
    log('⚠️  JavaScript bundle is large (>1MB)', 'yellow');
    log('Consider implementing code splitting', 'cyan');
  } else {
    log('✅ JavaScript bundle size is reasonable', 'green');
  }
}

function runBundleAnalyzer() {
  logSection('Running Bundle Analyzer');

  try {
    log('Building with bundle analyzer...', 'yellow');
    execSync('ANALYZE=true npm run build', { stdio: 'inherit' });
    log('✅ Bundle analysis complete! Check bundle-report.html', 'green');
  } catch (error) {
    log('❌ Failed to run bundle analyzer', 'red');
    log(error.message, 'red');
  }
}

function checkWebpackConfig() {
  logSection('Webpack Configuration Check');

  const webpackConfigPath = path.join(process.cwd(), 'webpack.config.js');
  if (!fs.existsSync(webpackConfigPath)) {
    log('❌ webpack.config.js not found', 'red');
    return;
  }

  const webpackConfig = fs.readFileSync(webpackConfigPath, 'utf8');

  logSubSection('Optimization Features');

  const checks = [
    {
      name: 'Code Splitting',
      pattern: /splitChunks/,
      enabled: webpackConfig.includes('splitChunks'),
    },
    {
      name: 'Tree Shaking',
      pattern: /sideEffects.*false/,
      enabled: webpackConfig.includes('sideEffects'),
    },
    {
      name: 'Minification',
      pattern: /TerserPlugin/,
      enabled: webpackConfig.includes('TerserPlugin'),
    },
    {
      name: 'CSS Extraction',
      pattern: /MiniCssExtractPlugin/,
      enabled: webpackConfig.includes('MiniCssExtractPlugin'),
    },
    {
      name: 'Compression',
      pattern: /CompressionPlugin/,
      enabled: webpackConfig.includes('CompressionPlugin'),
    },
  ];

  checks.forEach(check => {
    const status = check.enabled ? '✅' : '❌';
    const color = check.enabled ? 'green' : 'red';
    log(`${status} ${check.name}`, color);
  });
}

function generateOptimizationReport() {
  logSection('Optimization Recommendations');

  const recommendations = [
    {
      category: 'Bundle Splitting',
      items: [
        'Implement route-based code splitting',
        'Split vendor libraries into separate chunks',
        'Use dynamic imports for heavy components',
        'Implement lazy loading for below-the-fold content',
      ],
    },
    {
      category: 'Dependency Optimization',
      items: [
        'Remove unused dependencies',
        'Use tree-shakable alternatives (lodash-es vs lodash)',
        'Replace heavy libraries with lighter alternatives',
        'Use babel-plugin-import for UI libraries',
      ],
    },
    {
      category: 'Asset Optimization',
      items: [
        'Optimize images (WebP format, proper sizing)',
        'Use SVG icons instead of icon fonts',
        'Implement progressive image loading',
        'Compress static assets',
      ],
    },
    {
      category: 'Runtime Optimization',
      items: [
        'Implement service worker for caching',
        'Use React.memo for expensive components',
        'Implement virtual scrolling for large lists',
        'Optimize re-renders with useMemo and useCallback',
      ],
    },
  ];

  recommendations.forEach(category => {
    logSubSection(category.category);
    category.items.forEach(item => {
      log(`• ${item}`, 'cyan');
    });
  });
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  console.log(colorize('EMR React Bundle Analyzer', 'magenta'));
  console.log(colorize('========================', 'magenta'));

  if (args.includes('--help') || args.includes('-h')) {
    console.log('\nUsage: node analyze-bundle.js [options]');
    console.log('\nOptions:');
    console.log('  --package     Analyze package.json only');
    console.log('  --build       Analyze build output only');
    console.log('  --webpack     Check webpack configuration only');
    console.log('  --analyze     Run webpack bundle analyzer');
    console.log('  --help, -h    Show this help message');
    console.log('\nWith no options, runs all analyses.');
    return;
  }

  if (args.includes('--package')) {
    analyzePackageJson();
  } else if (args.includes('--build')) {
    analyzeBuildOutput();
  } else if (args.includes('--webpack')) {
    checkWebpackConfig();
  } else if (args.includes('--analyze')) {
    runBundleAnalyzer();
  } else {
    // Run all analyses
    analyzePackageJson();
    analyzeBuildOutput();
    checkWebpackConfig();
    generateOptimizationReport();

    log('\n' + colorize('To run detailed bundle analysis:', 'magenta'));
    log(colorize('node scripts/analyze-bundle.js --analyze', 'cyan'));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzePackageJson,
  analyzeBuildOutput,
  checkWebpackConfig,
  generateOptimizationReport,
};
