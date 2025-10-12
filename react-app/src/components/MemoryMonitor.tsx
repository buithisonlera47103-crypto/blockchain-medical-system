// 阶段3: 实时内存监控组件
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Progress, Button, Statistic, Row, Col, Tag } from 'antd';

interface MemoryData {
  used: number;
  total: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

const MemoryMonitor: React.FC = () => {
  const [memory, setMemory] = useState<MemoryData>({
    used: 0,
    total: 0,
    percentage: 0,
    trend: 'stable',
  });
  const [visible, setVisible] = useState(false);

  // 更新内存数据
  const updateMemory = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const used = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
      const total = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
      const percentage = Math.round((used / total) * 100);

      setMemory((prev) => {
        const trend = used > prev.used ? 'up' : used < prev.used ? 'down' : 'stable';
        return { used, total, percentage, trend };
      });

      // 内存警告
      if (percentage > 85) {
        console.warn(`⚠️ 内存使用率过高: ${percentage}%`);
        handleMemoryWarning();
      }
    }
  }, []);

  // 内存警告处理
  const handleMemoryWarning = useCallback(() => {
    // 尝试触发垃圾回收
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
        console.log('🗑️ 手动触发垃圾回收');
      } catch (error) {
        console.log('垃圾回收不可用');
      }
    }
  }, []);

  // 手动清理内存
  const cleanupMemory = useCallback(() => {
    console.log('🧹 开始内存清理...');
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
    console.log('✅ 内存清理完成');
  }, []);

  // 设置监控间隔
  useEffect(() => {
    const interval = setInterval(updateMemory, 3000);
    updateMemory(); // 立即执行一次
    return () => clearInterval(interval);
  }, [updateMemory]);

  const getProgressColor = () => {
    if (memory.percentage > 80) return '#ff4d4f';
    if (memory.percentage > 60) return '#faad14';
    return '#52c41a';
  };

  if (!visible) {
    return (
      <Button
        type="text"
        size="small"
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 9999,
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          border: '1px solid #1890ff',
        }}
      >
        📊 内存: {memory.percentage}%
      </Button>
    );
  }

  return (
    <Card
      size="small"
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        width: 280,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
      title="内存监控"
      extra={
        <Button type="text" size="small" onClick={() => setVisible(false)}>
          ✕
        </Button>
      }
    >
      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Statistic
            title="已用"
            value={memory.used}
            suffix="MB"
            valueStyle={{ fontSize: '16px', color: getProgressColor() }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="总计"
            value={memory.total}
            suffix="MB"
            valueStyle={{ fontSize: '16px', color: '#1890ff' }}
          />
        </Col>
      </Row>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '12px' }}>使用率</span>
          <Tag color={memory.percentage > 80 ? 'red' : memory.percentage > 60 ? 'orange' : 'green'}>
            {memory.trend === 'up' ? '📈' : memory.trend === 'down' ? '📉' : '➡️'} {memory.percentage}%
          </Tag>
        </div>
        <Progress percent={memory.percentage} strokeColor={getProgressColor()} size="small" showInfo={false} />
      </div>

      <Button type="primary" size="small" block onClick={cleanupMemory}>
        🧹 清理内存
      </Button>
    </Card>
  );
};

export default MemoryMonitor;

