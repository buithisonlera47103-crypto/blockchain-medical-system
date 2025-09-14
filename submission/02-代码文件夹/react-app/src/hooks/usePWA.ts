import { useState, useEffect, useCallback } from 'react';

import { pwaService } from '../services/PWAService';

interface PWAState {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  hasUpdate: boolean;
  isOnline: boolean;
  isInstalling: boolean;
  isUpdating: boolean;
  connectionInfo: any;
  cacheSize: number;
}

interface PWAActions {
  installApp: () => Promise<boolean>;
  updateApp: () => Promise<void>;
  showNotification: (options: any) => Promise<void>;
  subscribeToPush: (vapidKey: string) => Promise<PushSubscription | null>;
  unsubscribeFromPush: () => Promise<boolean>;
  clearCache: (cacheNames?: string[]) => Promise<void>;
  getCacheSize: () => Promise<number>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

interface UsePWAReturn extends PWAState, PWAActions {}

/**
 * PWA功能管理Hook
 */
export function usePWA(): UsePWAReturn {
  // 状态管理
  const [state, setState] = useState<PWAState>({
    isSupported: pwaService.supported,
    isInstalled: pwaService.installed,
    canInstall: pwaService.canInstall(),
    hasUpdate: pwaService.hasUpdate,
    isOnline: navigator.onLine,
    isInstalling: false,
    isUpdating: false,
    connectionInfo: pwaService.getConnectionInfo(),
    cacheSize: 0,
  });

  // 更新状态的通用方法
  const updateState = useCallback((updates: Partial<PWAState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  // 初始化和事件监听
  useEffect(() => {
    // 获取初始缓存大小
    pwaService.getCacheSize().then(size => {
      updateState({ cacheSize: size });
    });

    // PWA事件监听器
    const handleInstallAvailable = () => {
      updateState({ canInstall: true });
    };

    const handleInstallSuccess = () => {
      updateState({
        isInstalled: true,
        canInstall: false,
        isInstalling: false,
      });
    };

    const handleUpdateAvailable = () => {
      updateState({ hasUpdate: true });
    };

    const handleOfflineReady = () => {
      console.log('PWA is ready for offline use');
    };

    const handleNetworkStatus = (event: CustomEvent) => {
      updateState({
        isOnline: event.detail.online,
        connectionInfo: pwaService.getConnectionInfo(),
      });
    };

    // 注册事件监听器
    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-install-success', handleInstallSuccess);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-offline-ready', handleOfflineReady);
    window.addEventListener('pwa-network-status', handleNetworkStatus as EventListener);

    // 原生网络事件监听
    const handleOnline = () => {
      updateState({
        isOnline: true,
        connectionInfo: pwaService.getConnectionInfo(),
      });
    };

    const handleOffline = () => {
      updateState({
        isOnline: false,
        connectionInfo: null,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 监听连接变化（如果支持）
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    const handleConnectionChange = () => {
      updateState({ connectionInfo: pwaService.getConnectionInfo() });
    };

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // 清理函数
    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-install-success', handleInstallSuccess);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-offline-ready', handleOfflineReady);
      window.removeEventListener('pwa-network-status', handleNetworkStatus as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateState]);

  // 操作方法
  const installApp = useCallback(async (): Promise<boolean> => {
    updateState({ isInstalling: true });

    try {
      const success = await pwaService.installApp();
      if (!success) {
        updateState({ isInstalling: false });
      }
      // 成功的话，状态会通过事件监听器更新
      return success;
    } catch (error) {
      console.error('Install failed:', error);
      updateState({ isInstalling: false });
      return false;
    }
  }, [updateState]);

  const updateApp = useCallback(async (): Promise<void> => {
    updateState({ isUpdating: true });

    try {
      await pwaService.updateApp();
      // 页面会刷新，所以这里的状态更新可能不会生效
    } catch (error) {
      console.error('Update failed:', error);
      updateState({ isUpdating: false });
    }
  }, [updateState]);

  const showNotification = useCallback(async (options: any): Promise<void> => {
    await pwaService.showNotification(options);
  }, []);

  const subscribeToPush = useCallback(
    async (vapidKey: string): Promise<PushSubscription | null> => {
      return await pwaService.subscribeToPush(vapidKey);
    },
    []
  );

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    return await pwaService.unsubscribeFromPush();
  }, []);

  const clearCache = useCallback(
    async (cacheNames?: string[]): Promise<void> => {
      await pwaService.clearCache(cacheNames);
      // 重新获取缓存大小
      const newSize = await pwaService.getCacheSize();
      updateState({ cacheSize: newSize });
    },
    [updateState]
  );

  const getCacheSize = useCallback(async (): Promise<number> => {
    const size = await pwaService.getCacheSize();
    updateState({ cacheSize: size });
    return size;
  }, [updateState]);

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    return await pwaService.requestNotificationPermission();
  }, []);

  return {
    // 状态
    ...state,

    // 操作方法
    installApp,
    updateApp,
    showNotification,
    subscribeToPush,
    unsubscribeFromPush,
    clearCache,
    getCacheSize,
    requestNotificationPermission,
  };
}

export default usePWA;
