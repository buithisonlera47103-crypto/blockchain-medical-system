import React, { useEffect, useState } from 'react';

interface MedicalThemeBackgroundProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
}

const MedicalThemeBackground: React.FC<MedicalThemeBackgroundProps> = ({
  children,
  variant = 'primary',
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 8);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return 'from-red-50/30 via-orange-50/20 to-yellow-50/30';
      case 'secondary':
        return 'from-blue-50/30 via-indigo-50/20 to-purple-50/30';
      case 'accent':
        return 'from-green-50/30 via-teal-50/20 to-cyan-50/30';
      default:
        return 'from-red-50/30 via-orange-50/20 to-yellow-50/30';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* 主背景渐变 */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${getGradientColors()} dark:from-gray-900/50 dark:via-gray-800/30 dark:to-gray-900/50`}
      />

      {/* 医疗主题网格 */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern
              id="medical-grid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-red-300 dark:text-red-700"
              />
              <circle
                cx="20"
                cy="20"
                r="1"
                fill="currentColor"
                className="text-red-400 dark:text-red-600"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#medical-grid)" />
        </svg>
      </div>

      {/* DNA 双螺旋结构 */}
      <div className="absolute top-20 right-20 opacity-20 dark:opacity-10">
        <svg width="200" height="400" viewBox="0 0 200 400">
          <defs>
            <linearGradient id="dna-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>

          {/* DNA 螺旋线 */}
          <path
            d="M50,0 Q100,50 50,100 Q0,150 50,200 Q100,250 50,300 Q0,350 50,400"
            stroke="url(#dna-gradient)"
            strokeWidth="3"
            fill="none"
          >
            <animate
              attributeName="stroke-dasharray"
              values="0,400;400,0;0,400"
              dur="8s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M150,0 Q100,50 150,100 Q200,150 150,200 Q100,250 150,300 Q200,350 150,400"
            stroke="url(#dna-gradient)"
            strokeWidth="3"
            fill="none"
          >
            <animate
              attributeName="stroke-dasharray"
              values="0,400;400,0;0,400"
              dur="8s"
              repeatCount="indefinite"
              begin="1s"
            />
          </path>

          {/* DNA 连接线 */}
          {Array.from({ length: 20 }, (_, i) => {
            const y = i * 20;
            const x1 = 50 + 50 * Math.sin((y / 100) * Math.PI);
            const x2 = 150 - 50 * Math.sin((y / 100) * Math.PI);
            return (
              <line
                key={i}
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke="url(#dna-gradient)"
                strokeWidth="2"
                opacity="0.6"
              >
                <animate
                  attributeName="opacity"
                  values="0.6;0.2;0.6"
                  dur="2s"
                  repeatCount="indefinite"
                  begin={`${i * 0.1}s`}
                />
              </line>
            );
          })}
        </svg>
      </div>

      {/* 分子结构图 */}
      <div className="absolute bottom-20 left-20 opacity-15 dark:opacity-8">
        <svg width="300" height="300" viewBox="0 0 300 300">
          <defs>
            <radialGradient id="molecule-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </radialGradient>
          </defs>

          {/* 分子节点 */}
          <circle cx="150" cy="150" r="15" fill="url(#molecule-gradient)">
            <animate attributeName="r" values="15;20;15" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="100" r="10" fill="url(#molecule-gradient)">
            <animate
              attributeName="r"
              values="10;15;10"
              dur="3s"
              repeatCount="indefinite"
              begin="0.5s"
            />
          </circle>
          <circle cx="200" cy="100" r="10" fill="url(#molecule-gradient)">
            <animate
              attributeName="r"
              values="10;15;10"
              dur="3s"
              repeatCount="indefinite"
              begin="1s"
            />
          </circle>
          <circle cx="100" cy="200" r="10" fill="url(#molecule-gradient)">
            <animate
              attributeName="r"
              values="10;15;10"
              dur="3s"
              repeatCount="indefinite"
              begin="1.5s"
            />
          </circle>
          <circle cx="200" cy="200" r="10" fill="url(#molecule-gradient)">
            <animate
              attributeName="r"
              values="10;15;10"
              dur="3s"
              repeatCount="indefinite"
              begin="2s"
            />
          </circle>

          {/* 分子连接线 */}
          <line
            x1="150"
            y1="150"
            x2="100"
            y2="100"
            stroke="url(#molecule-gradient)"
            strokeWidth="2"
          >
            <animate
              attributeName="stroke-width"
              values="2;4;2"
              dur="3s"
              repeatCount="indefinite"
            />
          </line>
          <line
            x1="150"
            y1="150"
            x2="200"
            y2="100"
            stroke="url(#molecule-gradient)"
            strokeWidth="2"
          >
            <animate
              attributeName="stroke-width"
              values="2;4;2"
              dur="3s"
              repeatCount="indefinite"
              begin="0.5s"
            />
          </line>
          <line
            x1="150"
            y1="150"
            x2="100"
            y2="200"
            stroke="url(#molecule-gradient)"
            strokeWidth="2"
          >
            <animate
              attributeName="stroke-width"
              values="2;4;2"
              dur="3s"
              repeatCount="indefinite"
              begin="1s"
            />
          </line>
          <line
            x1="150"
            y1="150"
            x2="200"
            y2="200"
            stroke="url(#molecule-gradient)"
            strokeWidth="2"
          >
            <animate
              attributeName="stroke-width"
              values="2;4;2"
              dur="3s"
              repeatCount="indefinite"
              begin="1.5s"
            />
          </line>
        </svg>
      </div>

      {/* 心电图波形 */}
      <div className="absolute top-1/2 left-10 opacity-20 dark:opacity-10 transform -translate-y-1/2">
        <svg width="400" height="100" viewBox="0 0 400 100">
          <defs>
            <linearGradient id="ecg-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>

          <path
            d="M0,50 L50,50 L60,20 L70,80 L80,10 L90,50 L150,50 L160,20 L170,80 L180,10 L190,50 L250,50 L260,20 L270,80 L280,10 L290,50 L400,50"
            stroke="url(#ecg-gradient)"
            strokeWidth="2"
            fill="none"
          >
            <animate
              attributeName="stroke-dasharray"
              values="0,800;800,0;0,800"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>

      {/* 医疗十字图标 */}
      <div className="absolute top-32 left-1/3 opacity-10 dark:opacity-5">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <defs>
            <linearGradient id="cross-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          <rect x="30" y="10" width="20" height="60" fill="url(#cross-gradient)" rx="10">
            <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="10" y="30" width="60" height="20" fill="url(#cross-gradient)" rx="10">
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="2s"
              repeatCount="indefinite"
              begin="0.5s"
            />
          </rect>
        </svg>
      </div>

      {/* 药丸图标 */}
      <div className="absolute bottom-1/3 right-1/3 opacity-15 dark:opacity-8">
        <svg width="60" height="120" viewBox="0 0 60 120">
          <defs>
            <linearGradient id="pill-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          <rect x="10" y="30" width="40" height="60" fill="url(#pill-gradient)" />
          <circle cx="30" cy="30" r="20" fill="#f97316" />
          <circle cx="30" cy="90" r="20" fill="#ef4444" />

          <animate
            attributeName="transform"
            values="rotate(0 30 60);rotate(360 30 60)"
            dur="10s"
            repeatCount="indefinite"
          />
        </svg>
      </div>

      {/* 半透明几何形状 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 大圆形 */}
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-red-200/20 to-orange-200/20 dark:from-red-900/10 dark:to-orange-900/10 rounded-full blur-3xl"
          style={{
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
            transform: `translate(-50%, -50%) rotate(${animationPhase * 45}deg)`,
          }}
        />

        {/* 中等圆形 */}
        <div
          className="absolute w-64 h-64 bg-gradient-to-r from-orange-200/15 to-yellow-200/15 dark:from-orange-900/8 dark:to-yellow-900/8 rounded-full blur-2xl"
          style={{
            right: `${mousePosition.x * 0.01}px`,
            bottom: `${mousePosition.y * 0.01}px`,
            transform: `translate(50%, 50%) rotate(${-animationPhase * 30}deg)`,
          }}
        />

        {/* 小圆形 */}
        <div
          className="absolute w-32 h-32 bg-gradient-to-r from-yellow-200/25 to-red-200/25 dark:from-yellow-900/12 dark:to-red-900/12 rounded-full blur-xl"
          style={{
            left: `${50 + mousePosition.x * 0.005}%`,
            top: `${50 + mousePosition.y * 0.005}%`,
            transform: `translate(-50%, -50%) rotate(${animationPhase * 60}deg)`,
          }}
        />
      </div>

      {/* 浮动粒子效果 */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-red-400/30 dark:bg-red-600/20 rounded-full"
            style={{
              left: `${(i * 5) % 100}%`,
              top: `${(i * 7) % 100}%`,
              animation: `float ${3 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* CSS 动画定义 */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.8;
          }
        }
      `}</style>

      {children}
    </div>
  );
};

export default MedicalThemeBackground;
