import React, { useState, useEffect } from 'react';

interface MetricData {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
}

interface DeviceData {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  batteryLevel: number;
  lastUpdate: string;
  readings: number[];
}

const ModernMedicalUI: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const metrics: MetricData[] = [
    {
      id: 'patients',
      label: '在线患者',
      value: 1247,
      unit: '人',
      trend: 'up',
      color: 'from-blue-500 to-blue-600',
      icon: '👥',
    },
    {
      id: 'heartrate',
      label: '平均心率',
      value: 72,
      unit: 'BPM',
      trend: 'stable',
      color: 'from-red-500 to-red-600',
      icon: '❤️',
    },
    {
      id: 'temperature',
      label: '平均体温',
      value: 36.8,
      unit: '°C',
      trend: 'stable',
      color: 'from-orange-500 to-orange-600',
      icon: '🌡️',
    },
    {
      id: 'alerts',
      label: '紧急警报',
      value: 3,
      unit: '条',
      trend: 'down',
      color: 'from-yellow-500 to-yellow-600',
      icon: '⚠️',
    },
  ];

  const devices: DeviceData[] = [
    {
      id: 'monitor1',
      name: '心电监护仪 #001',
      status: 'online',
      batteryLevel: 85,
      lastUpdate: '2分钟前',
      readings: [72, 75, 71, 73, 74, 72, 76, 73, 71, 74],
    },
    {
      id: 'monitor2',
      name: '血压监测仪 #002',
      status: 'online',
      batteryLevel: 92,
      lastUpdate: '1分钟前',
      readings: [120, 118, 122, 119, 121, 120, 123, 118, 120, 119],
    },
    {
      id: 'monitor3',
      name: '血氧仪 #003',
      status: 'maintenance',
      batteryLevel: 45,
      lastUpdate: '15分钟前',
      readings: [98, 97, 99, 98, 97, 98, 99, 97, 98, 99],
    },
    {
      id: 'monitor4',
      name: '体温计 #004',
      status: 'offline',
      batteryLevel: 12,
      lastUpdate: '1小时前',
      readings: [36.5, 36.7, 36.8, 36.6, 36.9, 36.7, 36.8, 36.6, 36.7, 36.8],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      case 'maintenance':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'maintenance':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '➡️';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* 顶部状态栏 */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg">
              <span className="text-2xl">🏥</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">医疗监控中心</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                实时监控 • 数据分析 • 智能预警
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentTime.toLocaleTimeString('zh-CN')}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentTime.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 数据仪表盘 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={metric.id}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-gradient-to-r ${metric.color} rounded-xl shadow-lg`}>
                <span className="text-xl">{metric.icon}</span>
              </div>
              <div className="text-right">
                <span className="text-lg">{getTrendIcon(metric.trend)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {metric.label}
              </h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{metric.unit}</span>
              </div>
            </div>

            {/* 迷你图表 */}
            <div className="mt-4 h-8">
              <svg viewBox="0 0 100 20" className="w-full h-full">
                <defs>
                  <linearGradient id={`gradient-${metric.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop
                      offset="0%"
                      stopColor={
                        metric.color.includes('blue')
                          ? '#3b82f6'
                          : metric.color.includes('red')
                            ? '#ef4444'
                            : metric.color.includes('orange')
                              ? '#f97316'
                              : '#eab308'
                      }
                      stopOpacity="0.8"
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        metric.color.includes('blue')
                          ? '#1d4ed8'
                          : metric.color.includes('red')
                            ? '#dc2626'
                            : metric.color.includes('orange')
                              ? '#ea580c'
                              : '#ca8a04'
                      }
                      stopOpacity="0.3"
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M0,15 Q25,5 50,10 T100,8"
                  stroke={`url(#gradient-${metric.id})`}
                  strokeWidth="2"
                  fill="none"
                >
                  <animate
                    attributeName="stroke-dasharray"
                    values="0,100;100,0;0,100"
                    dur="3s"
                    repeatCount="indefinite"
                    begin={`${index * 0.5}s`}
                  />
                </path>
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* 设备监控面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 设备列表 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-3">📱</span>
              医疗设备状态
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">实时监控</span>
            </div>
          </div>

          <div className="space-y-4">
            {devices.map(device => (
              <div
                key={device.id}
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  selectedDevice === device.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSelectedDevice(selectedDevice === device.id ? null : device.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(device.status)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{device.name}</h4>
                      <p className={`text-sm ${getStatusColor(device.status)}`}>
                        {device.status === 'online'
                          ? '在线'
                          : device.status === 'offline'
                            ? '离线'
                            : '维护中'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">电量</span>
                      <div className="w-12 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            device.batteryLevel > 60
                              ? 'bg-green-500'
                              : device.batteryLevel > 30
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${device.batteryLevel}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {device.batteryLevel}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{device.lastUpdate}</p>
                  </div>
                </div>

                {/* 展开的详细信息 */}
                {selectedDevice === device.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          最近读数
                        </h5>
                        <div className="h-16">
                          <svg viewBox="0 0 200 40" className="w-full h-full">
                            <defs>
                              <linearGradient
                                id={`device-gradient-${device.id}`}
                                x1="0%"
                                y1="0%"
                                x2="0%"
                                y2="100%"
                              >
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                              </linearGradient>
                            </defs>
                            <path
                              d={`M${device.readings
                                .map(
                                  (reading, i) =>
                                    `${i * 20},${40 - (reading / Math.max(...device.readings)) * 30}`
                                )
                                .join(' L')}`}
                              stroke="#3b82f6"
                              strokeWidth="2"
                              fill="none"
                            />
                            <path
                              d={`M${device.readings
                                .map(
                                  (reading, i) =>
                                    `${i * 20},${40 - (reading / Math.max(...device.readings)) * 30}`
                                )
                                .join(' L')} L180,40 L0,40 Z`}
                              fill={`url(#device-gradient-${device.id})`}
                            />
                          </svg>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          设备信息
                        </h5>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <div>序列号: {device.id.toUpperCase()}</div>
                          <div>固件版本: v2.1.3</div>
                          <div>连接方式: WiFi</div>
                          <div>数据同步: 实时</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 医疗设备线框图 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="mr-3">🔧</span>
              设备架构图
            </h3>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  animationPhase % 2 === 0 ? 'bg-blue-500' : 'bg-green-500'
                }`}
              ></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">系统运行中</span>
            </div>
          </div>

          <div className="h-80">
            <svg viewBox="0 0 400 300" className="w-full h-full">
              <defs>
                <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 中央处理器 */}
              <rect
                x="150"
                y="120"
                width="100"
                height="60"
                fill="none"
                stroke="url(#wire-gradient)"
                strokeWidth="2"
                rx="8"
                filter="url(#glow)"
              >
                <animate
                  attributeName="stroke-width"
                  values="2;3;2"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </rect>
              <text
                x="200"
                y="145"
                textAnchor="middle"
                className="text-xs fill-current text-gray-700 dark:text-gray-300"
              >
                中央处理器
              </text>
              <text
                x="200"
                y="160"
                textAnchor="middle"
                className="text-xs fill-current text-gray-500 dark:text-gray-400"
              >
                CPU
              </text>

              {/* 传感器模块 */}
              <rect
                x="50"
                y="50"
                width="80"
                height="40"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                rx="6"
              >
                <animate
                  attributeName="opacity"
                  values="1;0.5;1"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </rect>
              <text
                x="90"
                y="68"
                textAnchor="middle"
                className="text-xs fill-current text-gray-700 dark:text-gray-300"
              >
                心率传感器
              </text>

              <rect
                x="270"
                y="50"
                width="80"
                height="40"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                rx="6"
              >
                <animate
                  attributeName="opacity"
                  values="1;0.5;1"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </rect>
              <text
                x="310"
                y="68"
                textAnchor="middle"
                className="text-xs fill-current text-gray-700 dark:text-gray-300"
              >
                血压传感器
              </text>

              <rect
                x="50"
                y="210"
                width="80"
                height="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                rx="6"
              >
                <animate
                  attributeName="opacity"
                  values="1;0.5;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </rect>
              <text
                x="90"
                y="228"
                textAnchor="middle"
                className="text-xs fill-current text-gray-700 dark:text-gray-300"
              >
                体温传感器
              </text>

              <rect
                x="270"
                y="210"
                width="80"
                height="40"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                rx="6"
              >
                <animate
                  attributeName="opacity"
                  values="1;0.5;1"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </rect>
              <text
                x="310"
                y="228"
                textAnchor="middle"
                className="text-xs fill-current text-gray-700 dark:text-gray-300"
              >
                血氧传感器
              </text>

              {/* 连接线 */}
              <line x1="130" y1="70" x2="150" y2="140" stroke="url(#wire-gradient)" strokeWidth="2">
                <animate
                  attributeName="stroke-dasharray"
                  values="0,20;20,0;0,20"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </line>
              <line x1="270" y1="70" x2="250" y2="140" stroke="url(#wire-gradient)" strokeWidth="2">
                <animate
                  attributeName="stroke-dasharray"
                  values="0,20;20,0;0,20"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="0.5s"
                />
              </line>
              <line
                x1="130"
                y1="230"
                x2="150"
                y2="160"
                stroke="url(#wire-gradient)"
                strokeWidth="2"
              >
                <animate
                  attributeName="stroke-dasharray"
                  values="0,20;20,0;0,20"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="1s"
                />
              </line>
              <line
                x1="270"
                y1="230"
                x2="250"
                y2="160"
                stroke="url(#wire-gradient)"
                strokeWidth="2"
              >
                <animate
                  attributeName="stroke-dasharray"
                  values="0,20;20,0;0,20"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="1.5s"
                />
              </line>

              {/* 数据流指示器 */}
              <circle cx="140" cy="105" r="3" fill="#3b82f6">
                <animate attributeName="r" values="3;6;3" dur="1s" repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="260" cy="105" r="3" fill="#10b981">
                <animate
                  attributeName="r"
                  values="3;6;3"
                  dur="1s"
                  repeatCount="indefinite"
                  begin="0.3s"
                />
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="1s"
                  repeatCount="indefinite"
                  begin="0.3s"
                />
              </circle>
              <circle cx="140" cy="195" r="3" fill="#f59e0b">
                <animate
                  attributeName="r"
                  values="3;6;3"
                  dur="1s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="1s"
                  repeatCount="indefinite"
                  begin="0.6s"
                />
              </circle>
              <circle cx="260" cy="195" r="3" fill="#ef4444">
                <animate
                  attributeName="r"
                  values="3;6;3"
                  dur="1s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="1s"
                  repeatCount="indefinite"
                  begin="0.9s"
                />
              </circle>
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">数据采集</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">数据处理</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">数据传输</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">异常警报</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernMedicalUI;
