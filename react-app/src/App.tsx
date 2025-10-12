import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import essential components
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeLanguage } from './i18n/config';
import { ErrorProvider } from './providers/ErrorProvider';
import { store } from './store';
import { createLazyRoute } from './utils/lazyLoading';
import './App.css';
import './styles/theme.css';

// Lazy load components - 信息安全竞赛精简版
const LandingPage = createLazyRoute(() => import('./pages/LandingPage'), 'LandingPage');
const AdminLogin = createLazyRoute(() => import('./pages/AdminLogin'), 'AdminLogin');
const Login = createLazyRoute(() => import('./components/Login'), 'Login');
const Register = createLazyRoute(() => import('./components/Auth/Register'), 'Register');
const NewDashboard = createLazyRoute(() => import('./components/NewDashboard'), 'Dashboard');
const AdminDashboard = createLazyRoute(() => import('./components/Admin'), 'AdminDashboard');

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // 初始化语言设置
  useEffect(() => {
    initializeLanguage();
  }, []);

  return (
    <div className="app">
      <main className="app-main">
        <Routes>
                {/* 介绍页面 - Landing Page */}
                <Route
                  path="/"
                  element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
                />
                
                {/* 管理员登录页面 */}
                <Route
                  path="/admin-login"
                  element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AdminLogin />}
                />
                
                {/* 登录页面 */}
                <Route
                  path="/login"
                  element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
                />
          
          {/* 注册页面 */}
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
          />
          
          {/* 主应用 - 新版Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <NewDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* 管理员面板 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* 404重定向 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorProvider>
        <Router>
          <ThemeProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </Router>
      </ErrorProvider>
    </Provider>
  );
};

export default App;
