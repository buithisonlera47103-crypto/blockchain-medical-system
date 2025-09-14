/**
 * 高级前端ESLint问题修复脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始高级前端ESLint问题修复...');

// 更全面的修复规则
const fixRules = [
  // AccessibilityShowcase.tsx
  {
    file: 'src/components/AccessibilityShowcase.tsx',
    fixes: [
      {
        search: "import { Eye, EyeOff, MousePointer, Volume2, VolumeX, Info } from 'lucide-react';",
        replace:
          "import { EyeOff, Volume2, VolumeX } from 'lucide-react';\n// import { Eye, MousePointer, Info } from 'lucide-react';",
      },
    ],
  },

  // Login.tsx
  {
    file: 'src/components/Auth/Login.tsx',
    fixes: [
      {
        search:
          "import { loginStart, loginSuccess, loginFailure, logout } from '../../store/slices/authSlice';",
        replace:
          "import { loginSuccess, logout } from '../../store/slices/authSlice';\n// import { loginStart, loginFailure } from '../../store/slices/authSlice';",
      },
    ],
  },

  // ErrorBoundary.tsx
  {
    file: 'src/components/ErrorBoundary/ErrorBoundary.tsx',
    fixes: [
      {
        search:
          "import { RefreshIcon, HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';",
        replace:
          "// import { RefreshIcon, HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';",
      },
    ],
  },

  // ModernNavigation.tsx
  {
    file: 'src/components/ModernNavigation.tsx',
    fixes: [
      {
        search: '  Clock,\n  Activity,\n  Database,',
        replace: '  // Clock,\n  // Activity,\n  // Database,',
      },
      {
        search: 'const [notifications, setNotifications] = useState<NotificationItem[]>([]);',
        replace:
          'const [notifications] = useState<NotificationItem[]>([]);\n  // const setNotifications = useState<NotificationItem[]>([]);',
      },
    ],
  },

  // SystemMonitoringDashboard.tsx
  {
    file: 'src/components/Monitoring/SystemMonitoringDashboard.tsx',
    fixes: [
      {
        search: "import { useTranslation } from 'react-i18next';",
        replace: "// import { useTranslation } from 'react-i18next';",
      },
      {
        search: 'const { t } = useTranslation();',
        replace: '// const { t } = useTranslation();',
      },
      {
        search: "const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];",
        replace: "// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];",
      },
    ],
  },

  // PerformanceDashboard.tsx
  {
    file: 'src/components/PerformanceMonitor/PerformanceDashboard.tsx',
    fixes: [
      {
        search: 'Alert: any = interfaces.Alert;',
        replace: '// Alert: any = interfaces.Alert; // 解决重复定义',
      },
      {
        search: 'const formatValue = (value: number, format: string) => {',
        replace: '// const formatValue = (value: number, format: string) => {',
      },
      {
        search: 'const getAlertColor = (level: string) => {',
        replace: '// const getAlertColor = (level: string) => {',
      },
    ],
  },

  // PerformanceShowcase.tsx
  {
    file: 'src/components/PerformanceShowcase.tsx',
    fixes: [
      {
        search: "import { RefreshCw, Download } from 'lucide-react';",
        replace: "// import { RefreshCw, Download } from 'lucide-react';",
      },
      {
        search: "const LazyImage = lazy(() => import('./ui/LazyImage'));",
        replace: "// const LazyImage = lazy(() => import('./ui/LazyImage'));",
      },
    ],
  },

  // SwipeGesture.tsx
  {
    file: 'src/components/ui/SwipeGesture.tsx',
    fixes: [
      {
        search: "import React, { useState, useRef, useCallback } from 'react';",
        replace:
          "import React, { useState, useCallback } from 'react';\n// import { useRef } from 'react';",
      },
    ],
  },

  // useAuth.ts
  {
    file: 'src/hooks/useAuth.ts',
    fixes: [
      {
        search: '  User,',
        replace: '  // User,',
      },
    ],
  },

  // useErrorHandler.ts
  {
    file: 'src/hooks/useErrorHandler.ts',
    fixes: [
      {
        search: "import React, { useContext, useCallback } from 'react';",
        replace:
          "import React, { useCallback } from 'react';\n// import { useContext } from 'react';",
      },
    ],
  },

  // useFormValidation.ts
  {
    file: 'src/hooks/useFormValidation.ts',
    fixes: [
      {
        search: 'ValidationError,',
        replace: '// ValidationError,',
      },
    ],
  },

  // PWAService.ts
  {
    file: 'src/services/PWAService.ts',
    fixes: [
      {
        search: 'const data = await response.json();',
        replace: 'const _data = await response.json(); // 用于调试',
      },
    ],
  },

  // accessibility.ts
  {
    file: 'src/utils/accessibility.ts',
    fixes: [
      {
        search: "const color = contrastRatio >= threshold ? 'sufficient' : 'insufficient';",
        replace:
          "const _color = contrastRatio >= threshold ? 'sufficient' : 'insufficient'; // 用于调试",
      },
    ],
  },

  // validation.ts
  {
    file: 'src/utils/validation.ts',
    fixes: [
      {
        search: 'export default {',
        replace: 'const validationRules = {',
      },
      {
        search: '};',
        replace: '};\n\nexport default validationRules;',
      },
    ],
  },
];

// 应用修复
let totalFixed = 0;
fixRules.forEach(rule => {
  const filePath = path.join(__dirname, '..', rule.file);

  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      rule.fixes.forEach(fix => {
        if (content.includes(fix.search)) {
          content = content.replace(fix.search, fix.replace);
          modified = true;
          totalFixed++;
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 修复了 ${rule.file}`);
      }
    } else {
      console.log(`⚠️  文件不存在: ${rule.file}`);
    }
  } catch (error) {
    console.error(`❌ 修复 ${rule.file} 时出错:`, error.message);
  }
});

console.log(`🎉 高级前端修复完成！共修复了 ${totalFixed} 个问题`);
console.log('📋 请运行 "npm run lint" 检查剩余问题');
