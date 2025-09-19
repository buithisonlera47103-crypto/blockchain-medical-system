/**
 * RecoveryNode Model 单元测试
 */

import { jest } from '@jest/globals';

import { RecoveryNode, NodeHealthCheck } from '../../../src/models/RecoveryNode';

describe('RecoveryNode 接口测试', () => {
  describe('RecoveryNode 接口', () => {
    it('应该具有正确的接口结构', () => {
      const recoveryNode: RecoveryNode = {
        id: 'node-123',
        node_id: 'recovery-node-001',
        node_type: 'primary',
        status: 'active',
        last_heartbeat: new Date('2023-01-01T10:00:00Z'),
        health_score: 95.5,
        metadata: {
          region: 'us-east-1',
          capacity: '1TB',
          version: '2.1.0',
        },
        created_at: new Date('2023-01-01T09:00:00Z'),
        updated_at: new Date('2023-01-01T10:00:00Z'),
      };

      // 验证必需字段
      expect(recoveryNode.node_id).toBe('recovery-node-001');
      expect(recoveryNode.node_type).toBe('primary');
      expect(recoveryNode.status).toBe('active');
      expect(recoveryNode.last_heartbeat).toBeInstanceOf(Date);
      expect(recoveryNode.health_score).toBe(95.5);
      expect(recoveryNode.metadata).toEqual({
        region: 'us-east-1',
        capacity: '1TB',
        version: '2.1.0',
      });
      expect(recoveryNode.created_at).toBeInstanceOf(Date);
    });

    it('应该支持所有有效的节点类型', () => {
      const validNodeTypes: Array<RecoveryNode['node_type']> = [
        'primary',
        'secondary',
        'backup',
      ];

      validNodeTypes.forEach(nodeType => {
        const recoveryNode: RecoveryNode = {
          node_id: `node-${nodeType}`,
          node_type: nodeType,
          status: 'active',
          last_heartbeat: new Date(),
          health_score: 100,
          metadata: {},
          created_at: new Date(),
        };

        expect(recoveryNode.node_type).toBe(nodeType);
      });
    });

    it('应该支持所有有效的状态值', () => {
      const validStatuses: Array<RecoveryNode['status']> = [
        'active',
        'inactive',
        'maintenance',
        'failed',
      ];

      validStatuses.forEach(status => {
        const recoveryNode: RecoveryNode = {
          node_id: 'test-node',
          node_type: 'secondary',
          status: status,
          last_heartbeat: new Date(),
          health_score: status === 'failed' ? 0 : 80,
          metadata: {},
          created_at: new Date(),
        };

        expect(recoveryNode.status).toBe(status);
      });
    });

    it('应该允许可选字段为undefined', () => {
      const recoveryNode: RecoveryNode = {
        node_id: 'minimal-node',
        node_type: 'backup',
        status: 'inactive',
        last_heartbeat: new Date(),
        health_score: 50,
        metadata: {},
        created_at: new Date(),
      };

      // 验证可选字段可以为undefined
      expect(recoveryNode.id).toBeUndefined();
      expect(recoveryNode.updated_at).toBeUndefined();
    });

    it('应该处理健康分数范围', () => {
      const healthScores = [0, 25.5, 50, 75.8, 100];

      healthScores.forEach(score => {
        const recoveryNode: RecoveryNode = {
          node_id: `node-score-${score}`,
          node_type: 'primary',
          status: score > 50 ? 'active' : 'maintenance',
          last_heartbeat: new Date(),
          health_score: score,
          metadata: { score_test: true },
          created_at: new Date(),
        };

        expect(recoveryNode.health_score).toBe(score);
        expect(recoveryNode.health_score).toBeGreaterThanOrEqual(0);
        expect(recoveryNode.health_score).toBeLessThanOrEqual(100);
      });
    });

    it('应该处理复杂的元数据', () => {
      const complexMetadata = {
        configuration: {
          maxConnections: 1000,
          timeout: 30000,
          retryAttempts: 3,
        },
        capabilities: ['backup', 'restore', 'sync'],
        environment: 'production',
        tags: {
          department: 'infrastructure',
          project: 'disaster-recovery',
        },
        lastMaintenance: '2023-01-01T08:00:00Z',
      };

      const recoveryNode: RecoveryNode = {
        node_id: 'complex-node',
        node_type: 'primary',
        status: 'active',
        last_heartbeat: new Date(),
        health_score: 98.7,
        metadata: complexMetadata,
        created_at: new Date(),
      };

      expect(recoveryNode.metadata).toEqual(complexMetadata);
      expect(recoveryNode.metadata.configuration).toBeDefined();
      expect(recoveryNode.metadata.capabilities).toHaveLength(3);
    });
  });

  describe('NodeHealthCheck 接口', () => {
    it('应该具有正确的接口结构', () => {
      const healthCheck: NodeHealthCheck = {
        node_id: 'node-001',
        timestamp: new Date('2023-01-01T10:30:00Z'),
        cpu_usage: 45.2,
        memory_usage: 67.8,
        disk_usage: 23.5,
        network_latency: 12.3,
        status: 'healthy',
      };

      // 验证所有必需字段
      expect(healthCheck.node_id).toBe('node-001');
      expect(healthCheck.timestamp).toBeInstanceOf(Date);
      expect(healthCheck.cpu_usage).toBe(45.2);
      expect(healthCheck.memory_usage).toBe(67.8);
      expect(healthCheck.disk_usage).toBe(23.5);
      expect(healthCheck.network_latency).toBe(12.3);
      expect(healthCheck.status).toBe('healthy');
    });

    it('应该支持所有有效的健康状态', () => {
      const validStatuses: Array<NodeHealthCheck['status']> = [
        'healthy',
        'warning',
        'critical',
      ];

      validStatuses.forEach(status => {
        const healthCheck: NodeHealthCheck = {
          node_id: 'test-node',
          timestamp: new Date(),
          cpu_usage: status === 'critical' ? 95 : 50,
          memory_usage: status === 'critical' ? 90 : 60,
          disk_usage: status === 'warning' ? 85 : 40,
          network_latency: status === 'critical' ? 500 : 50,
          status: status,
        };

        expect(healthCheck.status).toBe(status);
      });
    });

    it('应该处理资源使用率范围', () => {
      const testCases = [
        { cpu: 0, memory: 0, disk: 0, status: 'healthy' as const },
        { cpu: 50, memory: 60, disk: 40, status: 'healthy' as const },
        { cpu: 80, memory: 85, disk: 90, status: 'warning' as const },
        { cpu: 95, memory: 98, disk: 99, status: 'critical' as const },
      ];

      testCases.forEach((testCase, index) => {
        const healthCheck: NodeHealthCheck = {
          node_id: `node-usage-${index}`,
          timestamp: new Date(),
          cpu_usage: testCase.cpu,
          memory_usage: testCase.memory,
          disk_usage: testCase.disk,
          network_latency: 20,
          status: testCase.status,
        };

        expect(healthCheck.cpu_usage).toBeGreaterThanOrEqual(0);
        expect(healthCheck.cpu_usage).toBeLessThanOrEqual(100);
        expect(healthCheck.memory_usage).toBeGreaterThanOrEqual(0);
        expect(healthCheck.memory_usage).toBeLessThanOrEqual(100);
        expect(healthCheck.disk_usage).toBeGreaterThanOrEqual(0);
        expect(healthCheck.disk_usage).toBeLessThanOrEqual(100);
        expect(healthCheck.status).toBe(testCase.status);
      });
    });

    it('应该处理网络延迟值', () => {
      const latencyValues = [1.2, 15.8, 50.0, 200.5, 1000.0];

      latencyValues.forEach(latency => {
        const healthCheck: NodeHealthCheck = {
          node_id: 'latency-test-node',
          timestamp: new Date(),
          cpu_usage: 30,
          memory_usage: 40,
          disk_usage: 20,
          network_latency: latency,
          status: latency > 500 ? 'critical' : latency > 100 ? 'warning' : 'healthy',
        };

        expect(healthCheck.network_latency).toBe(latency);
        expect(healthCheck.network_latency).toBeGreaterThan(0);
      });
    });
  });

  describe('数据验证测试', () => {
    it('应该验证节点ID格式', () => {
      const validNodeIds = [
        'node-001',
        'recovery-node-primary-1',
        'backup_node_001',
        'node.east.001',
      ];

      validNodeIds.forEach(nodeId => {
        const recoveryNode: RecoveryNode = {
          node_id: nodeId,
          node_type: 'secondary',
          status: 'active',
          last_heartbeat: new Date(),
          health_score: 85,
          metadata: {},
          created_at: new Date(),
        };

        expect(recoveryNode.node_id).toBe(nodeId);
        expect(recoveryNode.node_id.length).toBeGreaterThan(0);
      });
    });

    it('应该处理时间戳逻辑', () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 300000); // 5分钟前
      const futureTime = new Date(now.getTime() + 60000); // 1分钟后

      const recoveryNode: RecoveryNode = {
        node_id: 'time-test-node',
        node_type: 'primary',
        status: 'active',
        last_heartbeat: pastTime,
        health_score: 90,
        metadata: {},
        created_at: pastTime,
        updated_at: now,
      };

      expect(recoveryNode.created_at.getTime()).toBeLessThan(recoveryNode.updated_at!.getTime());
      expect(recoveryNode.last_heartbeat.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  describe('业务逻辑测试', () => {
    it('应该表示完整的恢复节点集群', () => {
      const primaryNode: RecoveryNode = {
        id: 'primary-1',
        node_id: 'recovery-primary-001',
        node_type: 'primary',
        status: 'active',
        last_heartbeat: new Date(),
        health_score: 98.5,
        metadata: {
          role: 'leader',
          cluster_id: 'cluster-001',
          priority: 1,
        },
        created_at: new Date(),
      };

      const secondaryNodes: RecoveryNode[] = [
        {
          id: 'secondary-1',
          node_id: 'recovery-secondary-001',
          node_type: 'secondary',
          status: 'active',
          last_heartbeat: new Date(),
          health_score: 95.2,
          metadata: {
            role: 'follower',
            cluster_id: 'cluster-001',
            priority: 2,
          },
          created_at: new Date(),
        },
        {
          id: 'secondary-2',
          node_id: 'recovery-secondary-002',
          node_type: 'secondary',
          status: 'maintenance',
          last_heartbeat: new Date(Date.now() - 600000), // 10分钟前
          health_score: 0,
          metadata: {
            role: 'follower',
            cluster_id: 'cluster-001',
            priority: 3,
            maintenance_reason: 'software_update',
          },
          created_at: new Date(),
        },
      ];

      const backupNode: RecoveryNode = {
        id: 'backup-1',
        node_id: 'recovery-backup-001',
        node_type: 'backup',
        status: 'inactive',
        last_heartbeat: new Date(Date.now() - 1800000), // 30分钟前
        health_score: 75,
        metadata: {
          role: 'standby',
          cluster_id: 'cluster-001',
          priority: 4,
          activation_threshold: 60,
        },
        created_at: new Date(),
      };

      const cluster = [primaryNode, ...secondaryNodes, backupNode];

      expect(cluster).toHaveLength(4);
      expect(cluster.filter(n => n.node_type === 'primary')).toHaveLength(1);
      expect(cluster.filter(n => n.node_type === 'secondary')).toHaveLength(2);
      expect(cluster.filter(n => n.node_type === 'backup')).toHaveLength(1);
      expect(cluster.filter(n => n.status === 'active')).toHaveLength(2);
    });

    it('应该支持健康检查历史', () => {
      const nodeId = 'health-monitor-node';
      const timestamps = Array.from({ length: 5 }, (_, i) => 
        new Date(Date.now() - (i * 60000)) // 每分钟一次检查
      ).reverse();

      const healthChecks: NodeHealthCheck[] = timestamps.map((timestamp, index) => ({
        node_id: nodeId,
        timestamp,
        cpu_usage: 30 + (index * 10), // 逐渐增加的CPU使用率
        memory_usage: 40 + (index * 5),
        disk_usage: 20 + (index * 2),
        network_latency: 10 + (index * 5),
        status: index < 3 ? 'healthy' : index < 4 ? 'warning' : 'critical',
      }));

      expect(healthChecks).toHaveLength(5);
      expect(healthChecks[0].status).toBe('healthy');
      expect(healthChecks[4].status).toBe('critical');
      expect(healthChecks[4].cpu_usage).toBe(70);
    });

    it('应该支持故障转移场景', () => {
      const primaryNode: RecoveryNode = {
        node_id: 'primary-node',
        node_type: 'primary',
        status: 'failed',
        last_heartbeat: new Date(Date.now() - 900000), // 15分钟前
        health_score: 0,
        metadata: {
          failure_reason: 'network_partition',
          failure_time: new Date(Date.now() - 600000).toISOString(),
        },
        created_at: new Date(),
      };

      const promotedSecondary: RecoveryNode = {
        node_id: 'secondary-promoted',
        node_type: 'primary', // 被提升为主节点
        status: 'active',
        last_heartbeat: new Date(),
        health_score: 95,
        metadata: {
          original_type: 'secondary',
          promoted_at: new Date().toISOString(),
          promotion_reason: 'primary_failure',
        },
        created_at: new Date(Date.now() - 86400000), // 1天前创建
        updated_at: new Date(), // 刚刚更新
      };

      expect(primaryNode.status).toBe('failed');
      expect(promotedSecondary.node_type).toBe('primary');
      expect(promotedSecondary.metadata.original_type).toBe('secondary');
      expect(promotedSecondary.metadata.promotion_reason).toBe('primary_failure');
    });
  });
});

describe('内存管理测试', () => {
  beforeEach(() => {
    if (global.gc) global.gc();
  });

  afterEach(() => {
    if (global.gc) global.gc();
  });

  it('应该处理大量节点和健康检查数据而不会内存泄漏', () => {
    const initialMemory = process.memoryUsage();

    // 创建大量模拟节点数据
    const nodes: RecoveryNode[] = [];
    const healthChecks: NodeHealthCheck[] = [];

    for (let i = 0; i < 100; i++) {
      nodes.push({
        id: `node-${i}`,
        node_id: `recovery-node-${i}`,
        node_type: i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'secondary' : 'backup',
        status: i % 4 === 0 ? 'failed' : 'active',
        last_heartbeat: new Date(Date.now() - (i * 1000)),
        health_score: Math.random() * 100,
        metadata: {
          index: i,
          region: `region-${i % 5}`,
          cluster: `cluster-${Math.floor(i / 10)}`,
        },
        created_at: new Date(Date.now() - (i * 86400000)),
      });

      // 为每个节点创建多个健康检查记录
      for (let j = 0; j < 10; j++) {
        healthChecks.push({
          node_id: `recovery-node-${i}`,
          timestamp: new Date(Date.now() - (j * 60000)),
          cpu_usage: Math.random() * 100,
          memory_usage: Math.random() * 100,
          disk_usage: Math.random() * 100,
          network_latency: Math.random() * 200,
          status: Math.random() > 0.8 ? 'critical' : Math.random() > 0.5 ? 'warning' : 'healthy',
        });
      }
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // 验证数据创建成功
    expect(nodes).toHaveLength(100);
    expect(healthChecks).toHaveLength(1000);

    // 内存增长应该控制在合理范围内
    expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB
  });
});
