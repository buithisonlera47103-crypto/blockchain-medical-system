import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { logout } from '../../store/slices/authSlice';
import { UserRole } from '../../types';
import './Navigation.css';

const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = user?.role === UserRole.SYSTEM_ADMIN || user?.role === UserRole.SUPER_ADMIN;

  return (
    <nav className="navigation">
      <div className="nav-links">
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
          {t('navigation.dashboard')}
        </Link>
        <Link
          to="/medical-records"
          className={`nav-link ${isActive('/medical-records') ? 'active' : ''}`}
        >
          {t('navigation.medicalRecords')}
        </Link>
        <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
          {t('navigation.profile')}
        </Link>
        {isAdmin && (
          <Link to="/admin/system" className={`nav-link ${isActive('/admin/system') ? 'active' : ''}`}>
            {t('navigation.system')}
          </Link>
        )}
      </div>

      <div className="nav-actions">
        <button onClick={handleLogout} className="nav-logout">
          {t('navigation.logout')}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
