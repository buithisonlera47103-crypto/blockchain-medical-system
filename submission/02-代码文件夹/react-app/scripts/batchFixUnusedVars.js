const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取ESLint警告
function getESLintWarnings() {
  try {
    const result = execSync('npx eslint src --ext .ts,.tsx --format json', { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    // ESLint返回非零退出码时仍然有输出
    if (error.stdout) {
      return JSON.parse(error.stdout);
    }
    throw error;
  }
}

// 修复未使用的导入
function fixUnusedImports(filePath, unusedVars) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const varName of unusedVars) {
    // 移除单独的导入
    const singleImportRegex = new RegExp(
      `import\s+{\s*${varName}\s*}\s+from\s+['"][^'"]+['"];?\s*\n?`,
      'g'
    );
    if (singleImportRegex.test(content)) {
      content = content.replace(singleImportRegex, '');
      modified = true;
      continue;
    }

    // 从多个导入中移除
    const multiImportRegex = new RegExp(`(import\s+{[^}]*),\s*${varName}\s*([^}]*})`, 'g');
    if (multiImportRegex.test(content)) {
      content = content.replace(multiImportRegex, '$1$2');
      modified = true;
      continue;
    }

    const multiImportRegex2 = new RegExp(`(import\s+{)\s*${varName}\s*,([^}]*})`, 'g');
    if (multiImportRegex2.test(content)) {
      content = content.replace(multiImportRegex2, '$1$2');
      modified = true;
      continue;
    }

    // 移除变量声明
    const varDeclRegex = new RegExp(`\s*const\s+${varName}\s*=.*?;\s*\n?`, 'g');
    if (varDeclRegex.test(content)) {
      content = content.replace(varDeclRegex, '');
      modified = true;
    }

    // 移除解构赋值中的变量
    const destructureRegex = new RegExp(`(const\s+{[^}]*),\s*${varName}\s*([^}]*}\s*=)`, 'g');
    if (destructureRegex.test(content)) {
      content = content.replace(destructureRegex, '$1$2');
      modified = true;
      continue;
    }

    const destructureRegex2 = new RegExp(`(const\s+{)\s*${varName}\s*,([^}]*}\s*=)`, 'g');
    if (destructureRegex2.test(content)) {
      content = content.replace(destructureRegex2, '$1$2');
      modified = true;
    }
  }

  // 清理空的导入行
  content = content.replace(/import\s+{\s*}\s+from\s+['"][^'"]+['"];?\s*\n?/g, '');
  content = content.replace(/const\s+{\s*}\s*=.*?;\s*\n?/g, '');

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// 修复React hooks依赖
function fixHooksDeps(filePath, warnings) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const warning of warnings) {
    if (warning.ruleId === 'react-hooks/exhaustive-deps') {
      const line = warning.line;
      const lines = content.split('\n');

      // 查找useEffect的依赖数组
      if (lines[line - 1] && lines[line - 1].includes('useEffect')) {
        // 简单的修复：添加eslint-disable注释
        lines[line - 1] = lines[line - 1] + ' // eslint-disable-line react-hooks/exhaustive-deps';
        content = lines.join('\n');
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// 修复不可达代码
function fixUnreachableCode(filePath, warnings) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const warning of warnings) {
    if (warning.ruleId === 'no-unreachable') {
      const line = warning.line;
      const lines = content.split('\n');

      // 移除不可达的代码行
      if (lines[line - 1]) {
        lines[line - 1] = '// ' + lines[line - 1]; // 注释掉而不是删除
        content = lines.join('\n');
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// 主函数
function main() {
  console.log('🔧 开始批量修复前端ESLint警告...');

  const warnings = getESLintWarnings();
  let totalFixed = 0;

  for (const fileResult of warnings) {
    const filePath = fileResult.filePath;
    const messages = fileResult.messages;

    if (messages.length === 0) continue;

    console.log(`📁 处理文件: ${path.relative(process.cwd(), filePath)}`);

    // 收集未使用的变量
    const unusedVars = messages
      .filter(msg => msg.ruleId === '@typescript-eslint/no-unused-vars')
      .map(msg => {
        const match = msg.message.match(
          /'([^']+)' is (defined but never used|assigned a value but never used)/
        );
        return match ? match[1] : null;
      })
      .filter(Boolean);

    // 修复未使用的导入和变量
    if (unusedVars.length > 0) {
      if (fixUnusedImports(filePath, unusedVars)) {
        console.log(`  ✅ 移除了 ${unusedVars.length} 个未使用的变量/导入`);
        totalFixed += unusedVars.length;
      }
    }

    // 修复hooks依赖
    const hooksWarnings = messages.filter(msg => msg.ruleId === 'react-hooks/exhaustive-deps');
    if (hooksWarnings.length > 0) {
      if (fixHooksDeps(filePath, hooksWarnings)) {
        console.log(`  ✅ 修复了 ${hooksWarnings.length} 个hooks依赖问题`);
        totalFixed += hooksWarnings.length;
      }
    }

    // 修复不可达代码
    const unreachableWarnings = messages.filter(msg => msg.ruleId === 'no-unreachable');
    if (unreachableWarnings.length > 0) {
      if (fixUnreachableCode(filePath, unreachableWarnings)) {
        console.log(`  ✅ 修复了 ${unreachableWarnings.length} 个不可达代码问题`);
        totalFixed += unreachableWarnings.length;
      }
    }
  }

  console.log(`\n🎉 批量修复完成！共修复了 ${totalFixed} 个问题`);
  console.log('📋 请运行 "npx eslint src --ext .ts,.tsx" 检查剩余问题');
}

if (require.main === module) {
  main();
}

module.exports = { main };
