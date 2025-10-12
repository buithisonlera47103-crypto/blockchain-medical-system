import React from 'react';
import { motion } from 'framer-motion';

const AnimatedLogo: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background Glow Effects - Sky Blue Theme */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-blue-300 to-cyan-300 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-sky-300 to-blue-300 blur-3xl"
        />
      </div>

      {/* Main Logo Container */}
      <div className="relative z-10">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            duration: 1.5
          }}
          className="relative"
        >
          {/* Outer Ring - Blockchain Representation */}
          <motion.svg
            width="400"
            height="400"
            viewBox="0 0 400 400"
            className="drop-shadow-2xl"
          >
            {/* Outer Rotating Ring - Enhanced with proper connections */}
            <motion.g
              animate={{ rotate: 360 }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ transformOrigin: "200px 200px" }}
            >
              {/* Base Hexagon Stroke to guarantee 6 edges */}
              <motion.polygon
                points={[
                  0, 60, 120, 180, 240, 300
                ]
                  .map((a) => {
                    const x = 200 + 140 * Math.cos((a * Math.PI) / 180);
                    const y = 200 + 140 * Math.sin((a * Math.PI) / 180);
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#lineGlow)"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: [0.7, 0.95, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              {/* Connection Lines - All 6 lines forming complete ring */}
              {[0, 60, 120, 180, 240, 300].map((angle, index) => {
                // Calculate current hexagon position
                const x1 = 200 + 140 * Math.cos((angle * Math.PI) / 180);
                const y1 = 200 + 140 * Math.sin((angle * Math.PI) / 180);
                
                // Calculate next hexagon position (complete the ring)
                const angles = [0, 60, 120, 180, 240, 300];
                const nextAngle = angles[(index + 1) % 6];
                const x2 = 200 + 140 * Math.cos((nextAngle * Math.PI) / 180);
                const y2 = 200 + 140 * Math.sin((nextAngle * Math.PI) / 180);
                
                // Calculate line length for proper dash animation
                const lineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                
                return (
                  <motion.g key={`line-${index}`}>
                    {/* Glowing connection line - always visible */}
                    <motion.line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="url(#lineGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      filter="url(#lineGlow)"
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: [0.7, 0.95, 0.7]
                      }}
                      transition={{
                        opacity: {
                          duration: 2.5,
                          repeat: Infinity,
                          delay: index * 0.3
                        }
                      }}
                    />
                    {/* Data flow particles on line */}
                    <motion.circle
                      cx={x1}
                      cy={y1}
                      r="3"
                      fill="#7DD3FC"
                      initial={{ opacity: 0 }}
                      animate={{
                        cx: [x1, x2],
                        cy: [y1, y2],
                        opacity: [0, 0.8, 1, 0.8, 0]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: index * 0.4,
                        ease: "linear"
                      }}
                    />
                  </motion.g>
                );
              })}
              
              {/* Hexagon Chain Pattern */}
              {[0, 60, 120, 180, 240, 300].map((angle, index) => {
                const x = 200 + 140 * Math.cos((angle * Math.PI) / 180);
                const y = 200 + 140 * Math.sin((angle * Math.PI) / 180);
                return (
                  <motion.g
                    key={`hex-${index}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      opacity: { delay: index * 0.2 },
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.3
                      }
                    }}
                  >
                    {/* Outer glow for hexagon */}
                    <motion.path
                      d={`M ${x} ${y - 18} 
                          L ${x + 15.6} ${y - 9} 
                          L ${x + 15.6} ${y + 9} 
                          L ${x} ${y + 18} 
                          L ${x - 15.6} ${y + 9} 
                          L ${x - 15.6} ${y - 9} Z`}
                      fill="url(#hexagonGlowGradient)"
                      opacity="0.4"
                    />
                    {/* Main Hexagon Block */}
                    <motion.path
                      d={`M ${x} ${y - 15} 
                          L ${x + 13} ${y - 7.5} 
                          L ${x + 13} ${y + 7.5} 
                          L ${x} ${y + 15} 
                          L ${x - 13} ${y + 7.5} 
                          L ${x - 13} ${y - 7.5} Z`}
                      fill="url(#hexagonGradient)"
                      stroke="url(#borderGradient)"
                      strokeWidth="2.5"
                      filter="url(#glow)"
                    />
                    {/* Inner highlight */}
                    <circle
                      cx={x}
                      cy={y}
                      r="3"
                      fill="white"
                      opacity="0.9"
                    />
                    {/* Block number indicator */}
                    <text
                      x={x}
                      y={y + 2}
                      textAnchor="middle"
                      fill="white"
                      fontSize="8"
                      fontWeight="bold"
                      opacity="0.7"
                    >
                      {index + 1}
                    </text>
                  </motion.g>
                );
              })}
            </motion.g>

            {/* Middle Ring - Data Flow */}
            <motion.g
              animate={{ rotate: -360 }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ transformOrigin: "200px 200px" }}
            >
              <motion.circle
                cx="200"
                cy="200"
                r="100"
                fill="none"
                stroke="url(#dataFlowGradient)"
                strokeWidth="3"
                strokeDasharray="10 5"
              />
              {[0, 90, 180, 270].map((angle, index) => {
                const x = 200 + 100 * Math.cos((angle * Math.PI) / 180);
                const y = 200 + 100 * Math.sin((angle * Math.PI) / 180);
                return (
                  <motion.circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="6"
                    fill="url(#dotGradient)"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.5
                    }}
                  />
                );
              })}
            </motion.g>

            {/* Enhanced Center Medical Cross */}
            <motion.g
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0 
              }}
              transition={{ 
                delay: 0.5, 
                type: "spring", 
                stiffness: 200,
                damping: 10
              }}
            >
              {/* Outer ring decoration */}
              <motion.circle
                cx="200"
                cy="200"
                r="75"
                fill="none"
                stroke="url(#borderGradient)"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.5"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "200px 200px" }}
              />
              
              {/* Background Circle with enhanced glow */}
              <motion.circle
                cx="200"
                cy="200"
                r="70"
                fill="url(#centerGradient)"
                filter="url(#strongGlow)"
                animate={{
                  r: [70, 72, 70]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Rotating inner ring - add tiny closing arc to avoid visual gap */}
              <motion.circle
                cx="200"
                cy="200"
                r="65"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                strokeDasharray="3 3 0.01 0.01"
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "200px 200px" }}
              />
              
              {/* Medical Cross with shadow */}
              <g filter="url(#glow)">
                {/* Cross shadow */}
                <g fill="rgba(0,0,0,0.2)">
                  <rect x="187" y="152" width="30" height="100" rx="5" />
                  <rect x="162" y="187" width="80" height="30" rx="5" />
                </g>
                {/* Main Cross */}
                <g fill="white">
                  <motion.rect 
                    x="185" 
                    y="150" 
                    width="30" 
                    height="100" 
                    rx="5"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: 1, duration: 0.5, type: "spring" }}
                    style={{ transformOrigin: "200px 200px" }}
                  />
                  <motion.rect 
                    x="160" 
                    y="185" 
                    width="80" 
                    height="30" 
                    rx="5"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
                    style={{ transformOrigin: "200px 200px" }}
                  />
                </g>
              </g>

              {/* Enhanced Shield Outline with animation - ensure fully connected */}
              <motion.path
                d="M 200 140 
                   L 230 155 
                   L 230 210 
                   Q 230 235, 200 250 
                   Q 170 235, 170 210 
                   L 170 155 Z"
                fill="none"
                stroke="white"
                strokeWidth="3"
                opacity="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ vectorEffect: 'non-scaling-stroke' }}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1 }}
              />
              
              {/* Mini sparkles around cross */}
              {[0, 90, 180, 270].map((angle, index) => {
                const x = 200 + 55 * Math.cos((angle * Math.PI) / 180);
                const y = 200 + 55 * Math.sin((angle * Math.PI) / 180);
                return (
                  <motion.circle
                    key={`sparkle-${index}`}
                    cx={x}
                    cy={y}
                    r="2"
                    fill="white"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.5 + 1.5
                    }}
                  />
                );
              })}
            </motion.g>

            {/* Pulse Circles */}
            {[0, 1, 2].map((index) => (
              <motion.circle
                key={index}
                cx="200"
                cy="200"
                r="70"
                fill="none"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="2"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{
                  scale: [1, 1.5, 2],
                  opacity: [0.6, 0.3, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 1
                }}
              />
            ))}

            {/* Sky Blue Theme Gradients */}
            <defs>
              <linearGradient id="hexagonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.95">
                  <animate attributeName="stop-color" values="#60A5FA;#93C5FD;#60A5FA" dur="4s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.95">
                  <animate attributeName="stop-color" values="#22D3EE;#67E8F9;#22D3EE" dur="4s" repeatCount="indefinite" />
                </stop>
              </linearGradient>

              <linearGradient id="hexagonGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#67E8F9" stopOpacity="0.6" />
              </linearGradient>

              <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="50%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#67E8F9" />
              </linearGradient>

              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60A5FA">
                  <animate attributeName="stop-color" values="#60A5FA;#93C5FD;#60A5FA" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#22D3EE">
                  <animate attributeName="stop-color" values="#22D3EE;#67E8F9;#22D3EE" dur="3s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#93C5FD">
                  <animate attributeName="stop-color" values="#93C5FD;#BFDBFE;#93C5FD" dur="3s" repeatCount="indefinite" />
                </stop>
              </linearGradient>

              <linearGradient id="dataFlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="50%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>

              <radialGradient id="dotGradient">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#93C5FD" />
                <stop offset="100%" stopColor="#60A5FA" />
              </radialGradient>

              <radialGradient id="centerGradient">
                <stop offset="0%" stopColor="#60A5FA">
                  <animate attributeName="stop-color" values="#60A5FA;#93C5FD;#BFDBFE;#93C5FD;#60A5FA" dur="5s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#3B82F6">
                  <animate attributeName="stop-color" values="#3B82F6;#60A5FA;#93C5FD;#60A5FA;#3B82F6" dur="5s" repeatCount="indefinite" />
                </stop>
              </radialGradient>

              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <filter id="strongGlow">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </motion.svg>

          {/* Floating Particles */}
          <div className="absolute inset-0">
            {[...Array(8)].map((_, index) => {
              const angle = (index * 360) / 8;
              const distance = 180;
              const x = 200 + distance * Math.cos((angle * Math.PI) / 180);
              const y = 200 + distance * Math.sin((angle * Math.PI) / 180);
              
              return (
                <motion.div
                  key={index}
                  className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.4
                  }}
                />
              );
            })}
          </div>
        </motion.div>

        {/* Logo Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="text-center mt-8"
        >
          <h3 className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-500 bg-clip-text text-transparent mb-2">
            MedChain
          </h3>
          <p className="text-lg text-gray-600 font-medium">
            区块链医疗数据管理平台
          </p>
          <motion.div
            animate={{
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full border border-sky-200"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">系统运行中</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative Corner Elements */}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 4,
          repeat: Infinity
        }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full blur-2xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 5,
          repeat: Infinity
        }}
      />
    </div>
  );
};

export default AnimatedLogo;

