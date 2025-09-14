import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { pwaService } from '../../services/PWAService';
import './PWAInstallPrompt.css';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  autoShow?: boolean;
  showDelay?: number;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onInstall,
  onDismiss,
  autoShow = true,
  showDelay = 3000,
}) => {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // 检查是否可以安装
    const checkInstallability = () => {
      setCanInstall(pwaService.canInstall());
    };

    // 监听PWA安装可用事件
    const handleInstallAvailable = () => {
      setCanInstall(true);
      if (autoShow) {
        setTimeout(() => {
          setShowPrompt(true);
        }, showDelay);
      }
    };

    // 监听PWA安装成功事件
    const handleInstallSuccess = () => {
      setShowPrompt(false);
      setCanInstall(false);
      onInstall?.();
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-success', handleInstallSuccess);

    // 初始检查
    checkInstallability();

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-success', handleInstallSuccess);
    };
  }, [autoShow, showDelay, onInstall]);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const success = await pwaService.installApp();
      if (success) {
        setShowPrompt(false);
        onInstall?.();
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
  };

  const handleNotNow = () => {
    setShowPrompt(false);
    // 24小时后再次提示
    setTimeout(
      () => {
        if (pwaService.canInstall()) {
          setShowPrompt(true);
        }
      },
      24 * 60 * 60 * 1000
    );
  };

  if (!canInstall || !showPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-overlay">
      <div className="pwa-install-prompt">
        {/* 关闭按钮 */}
        <button
          className="pwa-close-btn"
          onClick={handleDismiss}
          disabled={isInstalling}
          aria-label={t('common.close')}
        >
          ×
        </button>

        {/* 应用图标 */}
        <div className="pwa-app-icon">
          <img src="/icons/icon-192x192.png" alt="EMR App" />
        </div>

        {/* 安装内容 */}
        <div className="pwa-install-content">
          <h3 className="pwa-install-title">{t('pwa.install.title', '安装电子病历系统')}</h3>

          <p className="pwa-install-description">
            {t('pwa.install.description', '将应用添加到主屏幕，获得更好的使用体验：')}
          </p>

          <ul className="pwa-benefits-list">
            <li>
              <span className="benefit-icon">🚀</span>
              {t('pwa.benefits.faster', '更快的启动速度')}
            </li>
            <li>
              <span className="benefit-icon">📱</span>
              {t('pwa.benefits.native', '原生应用般的体验')}
            </li>
            <li>
              <span className="benefit-icon">🔄</span>
              {t('pwa.benefits.offline', '离线访问功能')}
            </li>
            <li>
              <span className="benefit-icon">🔔</span>
              {t('pwa.benefits.notifications', '推送通知提醒')}
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="pwa-install-actions">
          <button
            className="pwa-install-btn primary"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <>
                <div className="loading-spinner"></div>
                {t('pwa.install.installing', '正在安装...')}
              </>
            ) : (
              <>
                <span>📱</span>
                {t('pwa.install.install', '安装应用')}
              </>
            )}
          </button>

          <button
            className="pwa-install-btn secondary"
            onClick={handleNotNow}
            disabled={isInstalling}
          >
            {t('pwa.install.notNow', '稍后提醒')}
          </button>
        </div>

        {/* 系统要求提示 */}
        <div className="pwa-system-info">
          <small>{t('pwa.install.systemInfo', '支持 iOS Safari、Chrome、Edge 等现代浏览器')}</small>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
