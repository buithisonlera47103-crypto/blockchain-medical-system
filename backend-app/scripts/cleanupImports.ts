#!/usr/bin/env ts-node

/**
 * Import Cleanup Utility
 * Removes unused imports and standardizes import patterns across the codebase
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ImportCleanupRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

interface UnusedImportPattern {
  pattern: RegExp;
  description: string;
}

class ImportCleanupUtility {
  private readonly sourceDir: string;
  private readonly excludePatterns: RegExp[];
  private readonly cleanupRules: ImportCleanupRule[];
  private readonly unusedImportPatterns: UnusedImportPattern[];

  constructor(sourceDir: string = './src') {
    this.sourceDir = sourceDir;
    this.excludePatterns = [/node_modules/, /\.d\.ts$/, /\.test\.ts$/, /\.spec\.ts$/];

    this.cleanupRules = [
      // Standardize logger imports
      {
        pattern: /import\s+{\s*logger\s*}\s+from\s+['"]\.\.\/middleware['"]/g,
        replacement: "import { logger } from '../utils/logger'",
        description: 'Standardize logger import path',
      },

      // Standardize crypto imports
      {
        pattern: /import\s+\*\s+as\s+crypto\s+from\s+['"]crypto['"]/g,
        replacement: "import * as crypto from 'crypto'",
        description: 'Standardize crypto import',
      },

      // Remove commented imports
      {
        pattern: /\/\/\s*import.*$/gm,
        replacement: '',
        description: 'Remove commented imports',
      },

      // Standardize uuid imports
      {
        pattern: /import\s+{\s*v4\s+as\s+uuidv4\s*}\s+from\s+['"]uuid['"]/g,
        replacement: "import { v4 as uuidv4 } from 'uuid'",
        description: 'Standardize uuid import',
      },

      // Standardize winston imports
      {
        pattern: /import\s+winston\s+from\s+['"]winston['"]/g,
        replacement: "import winston from 'winston'",
        description: 'Standardize winston import',
      },
    ];

    this.unusedImportPatterns = [
      {
        pattern: /import\s+{\s*promises\s+as\s+fs\s*}\s+from\s+['"]fs['"];?\s*$/gm,
        description: 'Unused fs promises import',
      },
      {
        pattern: /import\s+{\s*pipeline\s*}\s+from\s+['"]stream\/promises['"];?\s*$/gm,
        description: 'Unused stream pipeline import',
      },
      {
        pattern: /import\s+{\s*promisify\s*}\s+from\s+['"]util['"];?\s*$/gm,
        description: 'Unused util promisify import',
      },
      {
        pattern: /import\s+{\s*exec\s*}\s+from\s+['"]child_process['"];?\s*$/gm,
        description: 'Unused child_process exec import',
      },
    ];
  }

  /**
   * Main cleanup method
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Starting import cleanup...');

    const files = this.findTypeScriptFiles();
    console.log(`📁 Found ${files.length} TypeScript files to process`);

    let totalChanges = 0;

    for (const file of files) {
      const changes = await this.cleanupFile(file);
      totalChanges += changes;
    }

    console.log(`✅ Cleanup completed! Made ${totalChanges} changes across ${files.length} files`);

    // Run TypeScript compiler to check for errors
    console.log('🔍 Running TypeScript compiler check...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('✅ TypeScript compilation successful');
    } catch (error) {
      console.log('⚠️  TypeScript compilation has errors - please review manually');
    }
  }

  /**
   * Find all TypeScript files in the source directory
   */
  private findTypeScriptFiles(): string[] {
    const files: string[] = [];

    const walkDir = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          // Check if file should be excluded
          const shouldExclude = this.excludePatterns.some(pattern => pattern.test(fullPath));

          if (!shouldExclude) {
            files.push(fullPath);
          }
        }
      }
    };

    walkDir(this.sourceDir);
    return files;
  }

  /**
   * Cleanup a single file
   */
  private async cleanupFile(filePath: string): Promise<number> {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let changes = 0;

      // Apply cleanup rules
      for (const rule of this.cleanupRules) {
        const newContent = content.replace(rule.pattern, rule.replacement);
        if (newContent !== content) {
          content = newContent;
          changes++;
          console.log(`  📝 ${path.relative(process.cwd(), filePath)}: ${rule.description}`);
        }
      }

      // Remove unused imports
      for (const unusedPattern of this.unusedImportPatterns) {
        if (unusedPattern.pattern.test(content)) {
          // Check if the import is actually used
          const importMatch = content.match(unusedPattern.pattern);
          if (importMatch) {
            const importName = this.extractImportName(importMatch[0]);
            if (importName && !this.isImportUsed(content, importName)) {
              content = content.replace(unusedPattern.pattern, '');
              changes++;
              console.log(
                `  🗑️  ${path.relative(process.cwd(), filePath)}: Removed ${unusedPattern.description}`
              );
            }
          }
        }
      }

      // Remove empty lines left by removed imports
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

      // Write file if changes were made
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
      }

      return changes;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      return 0;
    }
  }

  /**
   * Extract import name from import statement
   */
  private extractImportName(importStatement: string): string | null {
    // Extract the imported name from various import patterns
    const patterns = [
      /import\s+{\s*([^}]+)\s*}/, // { name }
      /import\s+([^{][^\s]+)/, // default import
      /import\s+\*\s+as\s+(\w+)/, // * as name
    ];

    for (const pattern of patterns) {
      const match = importStatement.match(pattern);
      if (match) {
        return match[1].trim().split(',')[0].trim();
      }
    }

    return null;
  }

  /**
   * Check if an import is actually used in the file
   */
  private isImportUsed(content: string, importName: string): boolean {
    // Remove the import statement itself from the search
    const contentWithoutImports = content.replace(/^import.*$/gm, '');

    // Simple check - look for the import name in the code
    // This is a basic implementation and could be enhanced
    const usagePattern = new RegExp(`\\b${importName}\\b`, 'g');
    return usagePattern.test(contentWithoutImports);
  }

  /**
   * Analyze import usage across the codebase
   */
  async analyzeImports(): Promise<void> {
    console.log('📊 Analyzing import usage...');

    const files = this.findTypeScriptFiles();
    const importStats: Record<string, { count: number; files: string[] }> = {};

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const imports = this.extractImports(content);

        for (const imp of imports) {
          if (!importStats[imp]) {
            importStats[imp] = { count: 0, files: [] };
          }
          importStats[imp].count++;
          importStats[imp].files.push(path.relative(process.cwd(), file));
        }
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
      }
    }

    // Sort by usage count
    const sortedImports = Object.entries(importStats).sort(([, a], [, b]) => b.count - a.count);

    console.log('\n📈 Most used imports:');
    sortedImports.slice(0, 10).forEach(([imp, stats]) => {
      console.log(`  ${stats.count}x: ${imp}`);
    });

    console.log('\n📉 Least used imports (potential candidates for removal):');
    sortedImports.slice(-10).forEach(([imp, stats]) => {
      if (stats.count === 1) {
        console.log(`  ${stats.count}x: ${imp} (in ${stats.files[0]})`);
      }
    });
  }

  /**
   * Extract all imports from file content
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /^import\s+.*$/gm;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[0].trim());
    }

    return imports;
  }
}

// CLI interface
if (require.main === module) {
  const utility = new ImportCleanupUtility();

  const command = process.argv[2];

  switch (command) {
    case 'analyze':
      utility.analyzeImports().catch(console.error);
      break;
    case 'cleanup':
    default:
      utility.cleanup().catch(console.error);
      break;
  }
}

export default ImportCleanupUtility;
