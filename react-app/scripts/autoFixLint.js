/**
 * 自动修复React前端ESLint问题的脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始自动修复React前端ESLint问题...');

// 批量修复规则
const fixRules = [
  // AccessibilityShowcase.tsx 修复
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

  // Login.tsx 修复
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

  // ErrorBoundary.tsx 修复
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

  // MobileShowcase.tsx 修复
  {
    file: 'src/components/MobileShowcase.tsx',
    fixes: [
      {
        search: '  Calendar,',
        replace: '  // Calendar,',
      },
    ],
  },

  // ModernNavigation.tsx 修复
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
          'const [notifications] = useState<NotificationItem[]>([]);\n  // const [notifications, setNotifications] = useState<NotificationItem[]>([]);',
      },
    ],
  },

  // ModernShowcase.tsx 修复
  {
    file: 'src/components/ModernShowcase.tsx',
    fixes: [
      {
        search: '  Calendar,\n  MapPin,',
        replace: '  // Calendar,\n  // MapPin,',
      },
    ],
  },

  // SystemMonitoringDashboard.tsx 修复
  {
    file: 'src/components/Monitoring/SystemMonitoringDashboard.tsx',
    fixes: [
      {
        search: '  LineChart,\n  Line,',
        replace: '  // LineChart,\n  // Line,',
      },
      {
        search: '  Legend,',
        replace: '  // Legend,',
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
];

// 应用修复
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

console.log('🎉 React前端自动修复完成！');
console.log('📋 请运行 "npm run lint" 检查剩余问题');
