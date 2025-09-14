#!/usr/bin/env node

/**
 * Bundle Analysis Script for React Frontend
 * Analyzes bundle size, identifies optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.reactAppPath = path.join(this.projectRoot, 'react-app');
    this.buildPath = path.join(this.reactAppPath, 'build');
    this.reportsPath = path.join(this.projectRoot, 'performance', 'bundle-analysis');
  }

  async analyze() {
    console.log('🔍 Starting bundle analysis...');

    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsPath)) {
      fs.mkdirSync(this.reportsPath, { recursive: true });
    }

    try {
      // 1. Build the application with analysis
      await this.buildWithAnalysis();

      // 2. Analyze bundle composition
      await this.analyzeBundleComposition();

      // 3. Check for duplicate dependencies
      await this.checkDuplicateDependencies();

      // 4. Analyze chunk sizes
      await this.analyzeChunkSizes();

      // 5. Generate recommendations
      await this.generateRecommendations();

      console.log('✅ Bundle analysis completed');
      console.log(`📊 Reports available in: ${this.reportsPath}`);
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  async buildWithAnalysis() {
    console.log('🏗️ Building application with bundle analysis...');

    const buildCommand = `
      cd ${this.reactAppPath} && 
      npm run build -- --analyze
    `;

    try {
      execSync(buildCommand, { stdio: 'inherit' });
    } catch (error) {
      // Try alternative build command
      const altCommand = `
        cd ${this.reactAppPath} && 
        ANALYZE=true npm run build
      `;
      execSync(altCommand, { stdio: 'inherit' });
    }
  }

  async analyzeBundleComposition() {
    console.log('📦 Analyzing bundle composition...');

    const staticPath = path.join(this.buildPath, 'static');
    const jsPath = path.join(staticPath, 'js');
    const cssPath = path.join(staticPath, 'css');

    const analysis = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      gzippedSize: 0,
      files: {
        javascript: [],
        css: [],
        assets: [],
      },
      chunks: {},
    };

    // Analyze JavaScript files
    if (fs.existsSync(jsPath)) {
      const jsFiles = fs.readdirSync(jsPath);

      for (const file of jsFiles) {
        const filePath = path.join(jsPath, file);
        const stats = fs.statSync(filePath);

        const fileInfo = {
          name: file,
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          type: this.getFileType(file),
        };

        // Try to get gzipped size
        try {
          const gzipCommand = `gzip -c "${filePath}" | wc -c`;
          const gzippedSize = parseInt(execSync(gzipCommand, { encoding: 'utf8' }).trim());
          fileInfo.gzippedSize = gzippedSize;
          fileInfo.gzippedSizeFormatted = this.formatBytes(gzippedSize);
          fileInfo.compressionRatio = (((stats.size - gzippedSize) / stats.size) * 100).toFixed(1);
        } catch (error) {
          // Gzip analysis failed
        }

        analysis.files.javascript.push(fileInfo);
        analysis.totalSize += stats.size;
      }
    }

    // Analyze CSS files
    if (fs.existsSync(cssPath)) {
      const cssFiles = fs.readdirSync(cssPath);

      for (const file of cssFiles) {
        const filePath = path.join(cssPath, file);
        const stats = fs.statSync(filePath);

        const fileInfo = {
          name: file,
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
        };

        analysis.files.css.push(fileInfo);
        analysis.totalSize += stats.size;
      }
    }

    // Sort files by size
    analysis.files.javascript.sort((a, b) => b.size - a.size);
    analysis.files.css.sort((a, b) => b.size - a.size);

    // Save analysis
    const reportPath = path.join(this.reportsPath, 'bundle-composition.json');
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

    console.log(`📊 Bundle composition analysis saved to: ${reportPath}`);

    // Generate summary
    this.generateCompositionSummary(analysis);
  }

  generateCompositionSummary(analysis) {
    console.log('\n📊 Bundle Composition Summary:');
    console.log(`Total Size: ${this.formatBytes(analysis.totalSize)}`);

    console.log('\n🔸 JavaScript Files:');
    analysis.files.javascript.slice(0, 5).forEach(file => {
      const compression = file.compressionRatio ? ` (${file.compressionRatio}% compression)` : '';
      console.log(`  • ${file.name}: ${file.sizeFormatted}${compression}`);
    });

    if (analysis.files.css.length > 0) {
      console.log('\n🔸 CSS Files:');
      analysis.files.css.slice(0, 3).forEach(file => {
        console.log(`  • ${file.name}: ${file.sizeFormatted}`);
      });
    }
  }

  async checkDuplicateDependencies() {
    console.log('🔍 Checking for duplicate dependencies...');

    try {
      // Use webpack-bundle-analyzer if available
      const analyzeCommand = `
        cd ${this.reactAppPath} && 
        npx webpack-bundle-analyzer build/static/js/*.js --mode static --report ${this.reportsPath}/bundle-report.html --no-open
      `;

      execSync(analyzeCommand, { stdio: 'pipe' });
      console.log('📊 Webpack bundle analyzer report generated');
    } catch (error) {
      console.log('⚠️ Webpack bundle analyzer not available, using alternative analysis');

      // Alternative: analyze package.json dependencies
      const packageJsonPath = path.join(this.reactAppPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        const duplicateAnalysis = {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          potentialDuplicates: [],
          heavyDependencies: [],
        };

        // Check for potential duplicates (similar names)
        const allDeps = { ...duplicateAnalysis.dependencies, ...duplicateAnalysis.devDependencies };
        const depNames = Object.keys(allDeps);

        for (let i = 0; i < depNames.length; i++) {
          for (let j = i + 1; j < depNames.length; j++) {
            const dep1 = depNames[i];
            const dep2 = depNames[j];

            // Check for similar names (potential duplicates)
            if (this.areSimilarDependencies(dep1, dep2)) {
              duplicateAnalysis.potentialDuplicates.push([dep1, dep2]);
            }
          }
        }

        // Identify heavy dependencies
        const heavyDeps = [
          'lodash',
          'moment',
          'antd',
          'material-ui',
          '@mui/material',
          'react-router-dom',
          'axios',
          'redux',
          '@reduxjs/toolkit',
        ];

        duplicateAnalysis.heavyDependencies = depNames.filter(dep =>
          heavyDeps.some(heavy => dep.includes(heavy))
        );

        const reportPath = path.join(this.reportsPath, 'duplicate-dependencies.json');
        fs.writeFileSync(reportPath, JSON.stringify(duplicateAnalysis, null, 2));

        console.log(`📊 Duplicate dependencies analysis saved to: ${reportPath}`);
      }
    }
  }

  async analyzeChunkSizes() {
    console.log('📏 Analyzing chunk sizes...');

    const jsPath = path.join(this.buildPath, 'static', 'js');

    if (!fs.existsSync(jsPath)) {
      console.log('⚠️ No JavaScript files found for chunk analysis');
      return;
    }

    const files = fs.readdirSync(jsPath);
    const chunks = [];

    for (const file of files) {
      const filePath = path.join(jsPath, file);
      const stats = fs.statSync(filePath);

      chunks.push({
        name: file,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        type: this.getChunkType(file),
      });
    }

    // Sort by size
    chunks.sort((a, b) => b.size - a.size);

    const chunkAnalysis = {
      timestamp: new Date().toISOString(),
      totalChunks: chunks.length,
      totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
      chunks,
      recommendations: this.generateChunkRecommendations(chunks),
    };

    const reportPath = path.join(this.reportsPath, 'chunk-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(chunkAnalysis, null, 2));

    console.log(`📊 Chunk analysis saved to: ${reportPath}`);

    // Display summary
    console.log('\n📏 Chunk Size Summary:');
    chunks.slice(0, 5).forEach(chunk => {
      console.log(`  • ${chunk.name} (${chunk.type}): ${chunk.sizeFormatted}`);
    });
  }

  generateChunkRecommendations(chunks) {
    const recommendations = [];
    const maxChunkSize = 250 * 1024; // 250KB
    const maxMainChunkSize = 500 * 1024; // 500KB

    chunks.forEach(chunk => {
      if (chunk.type === 'main' && chunk.size > maxMainChunkSize) {
        recommendations.push({
          type: 'warning',
          chunk: chunk.name,
          message: `Main chunk is ${chunk.sizeFormatted}, consider code splitting`,
          suggestion: 'Implement lazy loading for routes and components',
        });
      } else if (chunk.size > maxChunkSize) {
        recommendations.push({
          type: 'info',
          chunk: chunk.name,
          message: `Chunk is ${chunk.sizeFormatted}, consider optimization`,
          suggestion: 'Review dependencies and implement tree shaking',
        });
      }
    });

    return recommendations;
  }

  async generateRecommendations() {
    console.log('💡 Generating optimization recommendations...');

    const recommendations = {
      timestamp: new Date().toISOString(),
      categories: {
        bundleSize: [],
        codesplitting: [],
        dependencies: [],
        assets: [],
        performance: [],
      },
    };

    // Bundle size recommendations
    recommendations.categories.bundleSize.push(
      {
        priority: 'high',
        title: 'Implement Tree Shaking',
        description: 'Remove unused code from bundles',
        implementation: 'Configure webpack to eliminate dead code and unused imports',
      },
      {
        priority: 'medium',
        title: 'Enable Gzip Compression',
        description: 'Reduce bundle size by 60-80%',
        implementation: 'Configure server to serve gzipped assets',
      }
    );

    // Code splitting recommendations
    recommendations.categories.codesplitting.push(
      {
        priority: 'high',
        title: 'Route-based Code Splitting',
        description: 'Split code by routes using React.lazy()',
        implementation: 'Implement lazy loading for route components',
      },
      {
        priority: 'medium',
        title: 'Component-based Code Splitting',
        description: 'Split large components into separate chunks',
        implementation: 'Use dynamic imports for heavy components',
      }
    );

    // Dependencies recommendations
    recommendations.categories.dependencies.push(
      {
        priority: 'high',
        title: 'Replace Heavy Dependencies',
        description: 'Replace large libraries with lighter alternatives',
        implementation: 'Consider date-fns instead of moment.js, lodash-es instead of lodash',
      },
      {
        priority: 'medium',
        title: 'Bundle Analysis',
        description: 'Regular bundle analysis to identify bloat',
        implementation: 'Set up automated bundle size monitoring',
      }
    );

    const reportPath = path.join(this.reportsPath, 'optimization-recommendations.json');
    fs.writeFileSync(reportPath, JSON.stringify(recommendations, null, 2));

    console.log(`💡 Optimization recommendations saved to: ${reportPath}`);

    // Display key recommendations
    console.log('\n💡 Key Optimization Recommendations:');
    Object.entries(recommendations.categories).forEach(([category, items]) => {
      if (items.length > 0) {
        console.log(`\n🔸 ${category.toUpperCase()}:`);
        items.slice(0, 2).forEach(item => {
          console.log(`  • ${item.title} (${item.priority} priority)`);
          console.log(`    ${item.description}`);
        });
      }
    });
  }

  // Helper methods
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileType(filename) {
    if (filename.includes('.chunk.')) return 'chunk';
    if (filename.includes('main.')) return 'main';
    if (filename.includes('vendor.')) return 'vendor';
    if (filename.includes('runtime.')) return 'runtime';
    return 'other';
  }

  getChunkType(filename) {
    if (filename.includes('main.')) return 'main';
    if (filename.includes('vendor.') || filename.includes('node_modules')) return 'vendor';
    if (filename.includes('runtime.')) return 'runtime';
    if (filename.includes('.chunk.')) return 'async';
    return 'other';
  }

  areSimilarDependencies(dep1, dep2) {
    // Check for common patterns that might indicate duplicates
    const patterns = [
      [/^@types\/(.+)/, /^(.+)$/], // @types/package vs package
      [/^(.+)-js$/, /^(.+)$/], // package-js vs package
      [/^(.+)\.js$/, /^(.+)$/], // package.js vs package
    ];

    for (const [pattern1, pattern2] of patterns) {
      const match1 = dep1.match(pattern1);
      const match2 = dep2.match(pattern2);

      if (match1 && match2 && match1[1] === match2[1]) {
        return true;
      }
    }

    return false;
  }
}

// CLI execution
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('Bundle analysis failed:', error);
    process.exit(1);
  });
}

module.exports = BundleAnalyzer;
