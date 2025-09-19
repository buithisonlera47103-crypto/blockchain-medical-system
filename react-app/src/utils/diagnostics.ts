/**
 * 诊断工具 - 用于排查认证和路由问题
 */

import { apiRequest } from './apiClient';
import { getToken, getUser, isTokenValid } from './tokenManager';

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface DiagnosticReport {
  timestamp: string;
  results: DiagnosticResult[];
  summary: {
    total: number;
    success: number;
    warning: number;
    error: number;
  };
}

/**
 * 运行完整的诊断检查
 */
export const runDiagnostics = async (): Promise<DiagnosticReport> => {
  const results: DiagnosticResult[] = [];

  console.group('🔍 开始系统诊断...');

  // 1. 检查localStorage中的认证数据
  console.log('1️⃣ 检查本地存储的认证数据...');
  const authDataCheck = checkAuthData();
  results.push(authDataCheck);
  console.log(
    `   ${authDataCheck.status === 'success' ? '✅' : authDataCheck.status === 'warning' ? '⚠️' : '❌'} ${authDataCheck.message}`
  );

  // 2. 验证token有效性
  console.log('2️⃣ 验证token有效性...');
  const tokenCheck = checkTokenValidity();
  results.push(tokenCheck);
  console.log(
    `   ${tokenCheck.status === 'success' ? '✅' : tokenCheck.status === 'warning' ? '⚠️' : '❌'} ${tokenCheck.message}`
  );

  // 3. 测试API连接
  console.log('3️⃣ 测试API连接...');
  const apiCheck = await checkAPIConnection();
  results.push(apiCheck);
  console.log(
    `   ${apiCheck.status === 'success' ? '✅' : apiCheck.status === 'warning' ? '⚠️' : '❌'} ${apiCheck.message}`
  );

  // 4. 检查Redux状态
  console.log('4️⃣ 检查Redux认证状态...');
  const reduxCheck = checkReduxState();
  results.push(reduxCheck);
  console.log(
    `   ${reduxCheck.status === 'success' ? '✅' : reduxCheck.status === 'warning' ? '⚠️' : '❌'} ${reduxCheck.message}`
  );

  // 5. 检查路由状态
  console.log('5️⃣ 检查当前路由状态...');
  const routeCheck = checkRouteState();
  results.push(routeCheck);
  console.log(
    `   ${routeCheck.status === 'success' ? '✅' : routeCheck.status === 'warning' ? '⚠️' : '❌'} ${routeCheck.message}`
  );

  // 6. 检查浏览器环境
  console.log('6️⃣ 检查浏览器环境...');
  const browserCheck = checkBrowserEnvironment();
  results.push(browserCheck);
  console.log(
    `   ${browserCheck.status === 'success' ? '✅' : browserCheck.status === 'warning' ? '⚠️' : '❌'} ${browserCheck.message}`
  );

  // 生成报告
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    warning: results.filter(r => r.status === 'warning').length,
    error: results.filter(r => r.status === 'error').length,
  };

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    results,
    summary,
  };

  console.log('\n📊 诊断摘要:');
  console.log(`   总检查项: ${summary.total}`);
  console.log(`   ✅ 成功: ${summary.success}`);
  console.log(`   ⚠️ 警告: ${summary.warning}`);
  console.log(`   ❌ 错误: ${summary.error}`);

  if (summary.error > 0) {
    console.log('\n🚨 发现问题，建议解决方案:');
    results
      .filter(r => r.status === 'error')
      .forEach(result => {
        console.log(`   • ${result.category}: ${result.message}`);
      });
  }

  console.groupEnd();

  return report;
};

/**
 * 检查localStorage中的认证数据
 */
const checkAuthData = (): DiagnosticResult => {
  try {
    const token = getToken();
    const user = getUser();

    if (!token && !user) {
      return {
        category: '本地认证数据',
        status: 'warning',
        message: '未找到token和用户数据，用户可能未登录',
        details: { token: null, user: null },
      };
    }

    if (!token) {
      return {
        category: '本地认证数据',
        status: 'error',
        message: '缺少认证token',
        details: { token: null, user },
      };
    }

    if (!user) {
      return {
        category: '本地认证数据',
        status: 'error',
        message: '缺少用户数据',
        details: { token: '***', user: null },
      };
    }

    return {
      category: '本地认证数据',
      status: 'success',
      message: '认证数据完整',
      details: {
        token: token.substring(0, 20) + '...',
        user: { id: user.id, username: user.username, role: user.role },
      },
    };
  } catch (error) {
    return {
      category: '本地认证数据',
      status: 'error',
      message: `读取认证数据失败: ${error}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * 检查token有效性
 */
const checkTokenValidity = (): DiagnosticResult => {
  try {
    const token = getToken();

    if (!token) {
      return {
        category: 'Token有效性',
        status: 'warning',
        message: '无token可验证',
        details: null,
      };
    }

    const isValid = isTokenValid();

    if (!isValid) {
      return {
        category: 'Token有效性',
        status: 'error',
        message: 'Token无效或已过期',
        details: { token: token.substring(0, 20) + '...' },
      };
    }

    // 尝试解析token获取过期时间
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      const expiry = payload.exp ? new Date(payload.exp * 1000) : null;

      return {
        category: 'Token有效性',
        status: 'success',
        message: 'Token有效',
        details: {
          expiry: expiry?.toISOString(),
          userId: payload.userId || payload.sub,
          iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
        },
      };
    } catch (parseError) {
      return {
        category: 'Token有效性',
        status: 'warning',
        message: 'Token格式异常但通过基本验证',
        details: {
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        },
      };
    }
  } catch (error) {
    return {
      category: 'Token有效性',
      status: 'error',
      message: `Token验证失败: ${error}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * 测试API连接
 */
const checkAPIConnection = async (): Promise<DiagnosticResult> => {
  try {
    // 测试健康检查端点
    const healthResponse = await fetch('http://localhost:3001/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!healthResponse.ok) {
      return {
        category: 'API连接',
        status: 'error',
        message: `健康检查失败: ${healthResponse.status} ${healthResponse.statusText}`,
        details: { status: healthResponse.status, statusText: healthResponse.statusText },
      };
    }

    const healthData = await healthResponse.json();

    // 测试认证API
    const token = getToken();
    if (token) {
      try {
        const auth = await apiRequest('/api/v1/auth/verify');
        return {
          category: 'API连接',
          status: 'success',
          message: 'API连接正常，认证验证成功',
          details: { health: healthData, auth },
        };
      } catch (authError: any) {
        return {
          category: 'API连接',
          status: 'warning',
          message: `API连接正常但认证验证失败: ${authError.response?.data?.message || authError.message}`,
          details: { health: healthData, authError: authError.response?.data || authError.message },
        };
      }
    }

    return {
      category: 'API连接',
      status: 'success',
      message: 'API连接正常',
      details: { health: healthData },
    };
  } catch (error: any) {
    return {
      category: 'API连接',
      status: 'error',
      message: `API连接失败: ${error.message || error}`,
      details: { error: error.message || String(error) },
    };
  }
};

/**
 * 检查Redux状态
 */
const checkReduxState = (): DiagnosticResult => {
  try {
    // 尝试从window对象获取Redux store（仅在开发环境）
    const store = (window as any).__REDUX_STORE__ || (window as any).store;

    if (!store) {
      return {
        category: 'Redux状态',
        status: 'warning',
        message: '无法访问Redux store（正常情况，除非在开发模式）',
        details: null,
      };
    }

    const state = store.getState();
    const authState = state.auth;

    if (!authState) {
      return {
        category: 'Redux状态',
        status: 'error',
        message: '未找到认证状态',
        details: { availableStates: Object.keys(state) },
      };
    }

    return {
      category: 'Redux状态',
      status: 'success',
      message: `认证状态: ${authState.isAuthenticated ? '已认证' : '未认证'}`,
      details: {
        isAuthenticated: authState.isAuthenticated,
        user: authState.user ? { id: authState.user.id, username: authState.user.username } : null,
        loading: authState.loading,
        error: authState.error,
      },
    };
  } catch (error) {
    return {
      category: 'Redux状态',
      status: 'warning',
      message: `无法检查Redux状态: ${error}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * 检查路由状态
 */
const checkRouteState = (): DiagnosticResult => {
  try {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const currentHash = window.location.hash;

    const protectedRoutes = ['/dashboard', '/medical-records', '/profile'];
    const isProtectedRoute = protectedRoutes.includes(currentPath);

    return {
      category: '路由状态',
      status: 'success',
      message: `当前路径: ${currentPath}${isProtectedRoute ? ' (受保护路由)' : ''}`,
      details: {
        pathname: currentPath,
        search: currentSearch,
        hash: currentHash,
        isProtectedRoute,
        href: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host,
      },
    };
  } catch (error) {
    return {
      category: '路由状态',
      status: 'error',
      message: `路由检查失败: ${error}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * 检查浏览器环境
 */
const checkBrowserEnvironment = (): DiagnosticResult => {
  try {
    const details = {
      userAgent: navigator.userAgent,
      localStorage: typeof Storage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      console: typeof console !== 'undefined',
      location: typeof window.location !== 'undefined',
    };

    const issues = [];
    if (!details.localStorage) issues.push('localStorage不可用');
    if (!details.fetch) issues.push('fetch API不可用');

    if (issues.length > 0) {
      return {
        category: '浏览器环境',
        status: 'error',
        message: `浏览器环境问题: ${issues.join(', ')}`,
        details,
      };
    }

    return {
      category: '浏览器环境',
      status: 'success',
      message: '浏览器环境正常',
      details,
    };
  } catch (error) {
    return {
      category: '浏览器环境',
      status: 'error',
      message: `环境检查失败: ${error}`,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
};

/**
 * 快速诊断 - 仅检查关键项目
 */
export const quickDiagnostics = (): DiagnosticResult[] => {
  return [checkAuthData(), checkTokenValidity(), checkRouteState()];
};

/**
 * 导出诊断报告为JSON
 */
export const exportDiagnosticReport = (report: DiagnosticReport): void => {
  const dataStr = JSON.stringify(report, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `diagnostic-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
