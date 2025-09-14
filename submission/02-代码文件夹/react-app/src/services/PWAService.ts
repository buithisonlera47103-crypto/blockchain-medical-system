/**
 * PWA服务 - 管理PWA相关功能
 */

interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: any;
}

export class PWAService {
  private static instance: PWAService;
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstalled = false;
  private isSupported = false;
  private updateAvailable = false;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.init();
  }

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  /**
   * 初始化PWA服务
   */
  private async init(): Promise<void> {
    // 检查PWA支持
    this.isSupported = this.checkPWASupport();

    // 检查是否已安装
    this.isInstalled = this.checkInstallation();

    // 注册Service Worker
    if (this.isSupported) {
      await this.registerServiceWorker();
      this.setupEventListeners();
    }
  }

  /**
   * 检查PWA支持
   */
  private checkPWASupport(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * 检查是否已安装
   */
  private checkInstallation(): boolean {
    // 检查显示模式
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // 检查是否通过PWA启动
    const isPWA = (window.navigator as any).standalone === true || isStandalone;

    return isPWA;
  }

  /**
   * 注册Service Worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered successfully:', this.registration);

      // 监听更新
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // 监听Service Worker消息
      navigator.serviceWorker.addEventListener(
        'message',
        this.handleServiceWorkerMessage.bind(this)
      );
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * 处理Service Worker消息
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        this.updateAvailable = true;
        this.notifyUpdateAvailable();
        break;
      case 'OFFLINE_READY':
        this.notifyOfflineReady();
        break;
      default:
        console.log('Unknown service worker message:', event.data);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听安装提示
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      this.deferredPrompt = event as any;
      this.notifyInstallAvailable();
    });

    // 监听应用安装
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyInstallSuccess();
    });

    // 监听网络状态变化
    window.addEventListener('online', () => {
      this.notifyNetworkStatus(true);
    });

    window.addEventListener('offline', () => {
      this.notifyNetworkStatus(false);
    });
  }

  /**
   * 安装PWA应用
   */
  public async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('PWA install prompt not available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted PWA install');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('User dismissed PWA install');
        return false;
      }
    } catch (error) {
      console.error('PWA install failed:', error);
      return false;
    }
  }

  /**
   * 检查是否可以安装
   */
  public canInstall(): boolean {
    return !this.isInstalled && this.deferredPrompt !== null;
  }

  /**
   * 请求通知权限
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * 显示通知
   */
  public async showNotification(options: NotificationOptions): Promise<void> {
    const permission = await this.requestNotificationPermission();

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      requireInteraction: false,
      tag: 'emr-notification',
    };

    const notificationOptions = { ...defaultOptions, ...options };

    if (this.registration) {
      await this.registration.showNotification(notificationOptions.title, {
        body: notificationOptions.body,
        icon: notificationOptions.icon,
        badge: notificationOptions.badge,
        tag: notificationOptions.tag,
        requireInteraction: notificationOptions.requireInteraction,
        data: notificationOptions.data,
      });
    } else {
      new Notification(notificationOptions.title, notificationOptions);
    }
  }

  /**
   * 订阅推送通知
   */
  public async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('Service worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      console.log('Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  /**
   * 取消推送订阅
   */
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Push unsubscription successful');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }

  /**
   * 获取推送订阅状态
   */
  public async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      return null;
    }

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  /**
   * 更新应用
   */
  public async updateApp(): Promise<void> {
    if (!this.registration || !this.updateAvailable) {
      return;
    }

    if (this.registration.waiting) {
      // 告诉等待中的Service Worker跳过等待
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // 刷新页面以使用新版本
    window.location.reload();
  }

  /**
   * 缓存重要页面
   */
  public async cacheImportantPages(urls: string[]): Promise<void> {
    if (!this.registration) {
      return;
    }

    this.registration.active?.postMessage({
      type: 'CACHE_URLS',
      urls,
    });
  }

  /**
   * 清理缓存
   */
  public async clearCache(cacheNames?: string[]): Promise<void> {
    if (!this.registration) {
      return;
    }

    this.registration.active?.postMessage({
      type: 'CLEAR_CACHE',
      cacheNames,
    });
  }

  /**
   * 获取缓存大小
   */
  public async getCacheSize(): Promise<number> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * 检查网络状态
   */
  public isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * 获取连接信息
   */
  public getConnectionInfo(): any {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }

    return null;
  }

  /**
   * 工具方法：将VAPID公钥转换为Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * 通知事件处理方法
   */
  private notifyInstallAvailable(): void {
    console.log('PWA install available');
    this.dispatchEvent('pwa-install-available');
  }

  private notifyInstallSuccess(): void {
    console.log('PWA installed successfully');
    this.dispatchEvent('pwa-install-success');
  }

  private notifyUpdateAvailable(): void {
    console.log('PWA update available');
    this.dispatchEvent('pwa-update-available');
  }

  private notifyOfflineReady(): void {
    console.log('PWA ready for offline use');
    this.dispatchEvent('pwa-offline-ready');
  }

  private notifyNetworkStatus(online: boolean): void {
    console.log('Network status changed:', online ? 'online' : 'offline');
    this.dispatchEvent('pwa-network-status', { online });
  }

  /**
   * 分发自定义事件
   */
  private dispatchEvent(type: string, detail?: any): void {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // Getter方法
  public get installed(): boolean {
    return this.isInstalled;
  }

  public get supported(): boolean {
    return this.isSupported;
  }

  public get hasUpdate(): boolean {
    return this.updateAvailable;
  }

  public get serviceWorkerRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
}

// 导出单例实例
export const pwaService = PWAService.getInstance();
