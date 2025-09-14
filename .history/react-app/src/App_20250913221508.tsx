import React, { useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import only essential components that are needed immediately
import { LanguageSwitcher } from './components/LanguageSwitcher/LanguageSwitcher';
import Navigation from './components/Navigation/Navigation';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth as useContextAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeLanguage } from './i18n/config';
import { ErrorProvider } from './providers/ErrorProvider';
import { store } from './store';
import { createLazyRoute } from './utils/lazyLoading';
import './App.css';

// Lazy load all page components to reduce initial bundle size
const Landing = createLazyRoute(() => import('./components/Landing'), 'Landing');
const Login = createLazyRoute(() => import('./components/Login'), 'Login');
const Register = createLazyRoute(() => import('./components/Auth/Register'), 'Register');
const AdminLogin = createLazyRoute(() => import('./components/AdminLogin'), 'Admin Login');
const Dashboard = createLazyRoute(() => import('./components/Dashboard'), 'Dashboard');
const Query = createLazyRoute(() => import('./components/Query'), 'Medical Records');
const Profile = createLazyRoute(() => import('./components/Profile'), 'Profile');
const Upload = createLazyRoute(() => import('./components/Upload'), 'Upload');
const Transfer = createLazyRoute(() => import('./components/Transfer'), 'Transfer');
const Search = createLazyRoute(() => import('./components/Search'), 'Search');
const History = createLazyRoute(() => import('./components/History'), 'History');
const ChatPage = createLazyRoute(() => import('./components/ChatPage'), 'Chat');
const Notifications = createLazyRoute(() => import('./components/Notifications'), 'Notifications');
const Settings = createLazyRoute(() => import('./components/Settings'), 'Settings');
const PerformanceMonitor = createLazyRoute(() => import('./components/PerformanceMonitor'), 'Performance Monitor');

// Lazy load public pages
const About = createLazyRoute(() => import('./components/About'), 'About');
const TechArchitecturePage = createLazyRoute(() => import('./components/TechArchitecturePage'), 'Architecture');
const FeatureSpecsPage = createLazyRoute(() => import('./components/FeatureSpecsPage'), 'Features');
const UseCasesPage = createLazyRoute(() => import('./components/UseCasesPage'), 'Use Cases');
const OnlineDemoPage = createLazyRoute(() => import('./components/OnlineDemoPage'), 'Demo');

// Lazy load admin pages
const AdminSystemSettingsPage = createLazyRoute(() => import('./pages/Admin/SettingsPage'), 'Admin Settings');

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useContextAuth();

  // 初始化语言设置
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {isAuthenticated && (
        <header className="app-header">
          <h1>{t('app.title')}</h1>
          <div className="header-controls">
            <LanguageSwitcher />
            {isAuthenticated && <Navigation />}
          </div>
        </header>
      )}

      <main className="app-main">
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
          />
          <Route
            path="/admin-login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AdminLogin />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medical-records"
            element={
              <ProtectedRoute>
                <Query />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transfer"
            element={
              <ProtectedRoute>
                <Transfer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/query"
            element={
              <ProtectedRoute>
                <Query />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <AdminRoute>
                <AdminSystemSettingsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <PerformanceMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/architecture"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <TechArchitecturePage />
            }
          />
          <Route
            path="/features"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <FeatureSpecsPage />}
          />
          <Route
            path="/use-cases"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <UseCasesPage />}
          />
          <Route
            path="/demo"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <OnlineDemoPage />}
          />
          <Route
            path="/about"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <About />}
          />
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />}
          />
          <Route path="*" element={<div>{t('common.pageNotFound')}</div>} />
        </Routes>
      </main>

      {isAuthenticated && (
        <footer className="app-footer">
          <p>{t('app.footer')}</p>
        </footer>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </ErrorProvider>
    </Provider>
  );
};

export default App;
