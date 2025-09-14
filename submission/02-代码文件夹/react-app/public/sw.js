// Service Worker for EMR PWA
// 版本号，用于缓存更新
const CACHE_VERSION = 'emr-v1.2.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
];

// 需要缓存的API路径模式
const API_PATTERNS = [
  /^\/api\/auth\/profile$/,
  /^\/api\/users\/\d+$/,
  /^\/api\/records(\?.*)?$/,
  /^\/api\/monitoring\/health$/,
];

// 离线页面路径
const OFFLINE_PAGE = '/offline.html';

// 安装事件 - 缓存静态资源
self.addEventListener('install', event => {
  console.log('Service Worker installing...');

  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // 跳过等待，立即激活
      self.skipWaiting(),
    ])
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');

  event.waitUntil(
    Promise.all([
      // 清理旧版本缓存
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(
              cacheName =>
                cacheName.startsWith('static-') ||
                cacheName.startsWith('dynamic-') ||
                cacheName.startsWith('api-')
            )
            .filter(cacheName => !cacheName.includes(CACHE_VERSION))
            .map(cacheName => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // 立即控制所有客户端
      self.clients.claim(),
    ])
  );
});

// 获取事件 - 缓存策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const { url, method } = request;

  // 只处理GET请求
  if (method !== 'GET') {
    return;
  }

  // 处理不同类型的请求
  if (url.includes('/api/')) {
    // API请求 - 网络优先策略
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url)) {
    // 静态资源 - 缓存优先策略
    event.respondWith(handleStaticRequest(request));
  } else {
    // 页面请求 - 网络优先，离线时显示缓存
    event.respondWith(handlePageRequest(request));
  }
});

// 处理API请求（网络优先）
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // 尝试网络请求
    const networkResponse = await fetch(request);

    // 如果请求成功且匹配缓存模式，则缓存响应
    if (networkResponse.ok && shouldCacheApi(url.pathname)) {
      const cache = await caches.open(API_CACHE);
      const responseClone = networkResponse.clone();

      // 异步缓存，不阻塞响应
      cache
        .put(request, responseClone)
        .catch(err => console.warn('Failed to cache API response:', err));
    }

    return networkResponse;
  } catch (error) {
    console.log('Network failed for API request, trying cache:', url.pathname);

    // 网络失败，尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // 添加离线标识头
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-From-Cache', 'true');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      });
    }

    // 缓存中也没有，返回离线提示
    return new Response(
      JSON.stringify({
        error: 'OFFLINE',
        message: '当前处于离线状态，无法获取最新数据',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Response': 'true',
        },
      }
    );
  }
}

// 处理静态资源请求（缓存优先）
async function handleStaticRequest(request) {
  // 先尝试缓存
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // 缓存未命中，尝试网络请求
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 缓存新的静态资源
      const cache = await caches.open(DYNAMIC_CACHE);
      cache
        .put(request, networkResponse.clone())
        .catch(err => console.warn('Failed to cache static asset:', err));
    }

    return networkResponse;
  } catch (error) {
    console.log('Failed to fetch static asset:', request.url);

    // 如果是关键资源，返回默认响应
    if (request.url.includes('manifest.json')) {
      return new Response('{}', {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw error;
  }
}

// 处理页面请求（网络优先）
async function handlePageRequest(request) {
  try {
    // 尝试网络请求
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 缓存页面响应
      const cache = await caches.open(DYNAMIC_CACHE);
      cache
        .put(request, networkResponse.clone())
        .catch(err => console.warn('Failed to cache page:', err));
    }

    return networkResponse;
  } catch (error) {
    console.log('Network failed for page request, trying cache:', request.url);

    // 网络失败，尝试缓存
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 缓存也没有，返回离线页面
    const offlineResponse = await caches.match(OFFLINE_PAGE);
    if (offlineResponse) {
      return offlineResponse;
    }

    // 如果离线页面也没有，返回基本的离线提示
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>离线状态</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #f5f5f5; 
            }
            .offline-message { 
              background: white; 
              padding: 30px; 
              border-radius: 8px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <h1>🔌 当前处于离线状态</h1>
            <p>请检查网络连接后重试</p>
            <button onclick="location.reload()">重新加载</button>
          </div>
        </body>
      </html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// 判断是否为静态资源
function isStaticAsset(url) {
  return (
    url.includes('/static/') ||
    url.includes('/icons/') ||
    url.includes('/images/') ||
    url.includes('/fonts/') ||
    url.endsWith('.css') ||
    url.endsWith('.js') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.gif') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.woff') ||
    url.endsWith('.woff2')
  );
}

// 判断API是否应该被缓存
function shouldCacheApi(pathname) {
  return API_PATTERNS.some(pattern => pattern.test(pathname));
}

// 后台同步事件
self.addEventListener('sync', event => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// 执行后台同步
async function doBackgroundSync() {
  try {
    // 同步离线时的操作
    const offlineActions = await getOfflineActions();

    for (const action of offlineActions) {
      try {
        await syncAction(action);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// 推送通知事件
self.addEventListener('push', event => {
  console.log('Push message received');

  const options = {
    body: '您有新的医疗记录更新',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'emr-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: '查看详情',
        icon: '/icons/action-view.png',
      },
      {
        action: 'dismiss',
        title: '关闭',
        icon: '/icons/action-dismiss.png',
      },
    ],
    data: {
      url: '/records',
      timestamp: Date.now(),
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.warn('Failed to parse push data:', error);
    }
  }

  event.waitUntil(self.registration.showNotification('电子病历系统', options));
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    // 打开指定页面
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
  } else if (event.action === 'dismiss') {
    // 关闭通知
    console.log('Notification dismissed');
  } else {
    // 默认行为 - 打开应用
    event.waitUntil(clients.openWindow('/'));
  }
});

// 消息事件 - 与主线程通信
self.addEventListener('message', event => {
  console.log('Service Worker received message:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(cacheUrls(event.data.urls));
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearCache(event.data.cacheNames));
  }
});

// 缓存指定URL
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  return cache.addAll(urls);
}

// 清理指定缓存
async function clearCache(cacheNames) {
  if (!cacheNames || cacheNames.length === 0) {
    // 清理所有缓存
    const allCaches = await caches.keys();
    return Promise.all(allCaches.map(cacheName => caches.delete(cacheName)));
  }

  return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}

// 离线操作存储（使用IndexedDB）
async function getOfflineActions() {
  // 这里应该从IndexedDB获取离线操作
  // 简化实现，返回空数组
  return [];
}

async function removeOfflineAction(actionId) {
  // 这里应该从IndexedDB删除已同步的操作
  console.log('Removing offline action:', actionId);
}

async function syncAction(action) {
  // 这里应该执行具体的同步操作
  console.log('Syncing action:', action);
}
