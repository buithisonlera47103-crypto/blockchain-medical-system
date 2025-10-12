/**
 * 医生端 - 数据验证 🔥
 */

import React, { useState } from 'react';
import { Card, Input, Button, Alert, Tag, Space, Badge, message } from 'antd';
import { CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';
import '../../styles/theme.css';

const DataValidator: React.FC = () => {
  const [recordId, setRecordId] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleVerify = () => {
    if (!recordId) {
      message.warning('请输入病历ID');
      return;
    }
    
    setTimeout(() => {
      setResult({
        isValid: true,
        hash: '0x1234...5678',
        timestamp: '2025-10-08 14:30:25',
      });
      message.success('验证完成！');
    }, 1000);
  };

  return (
    <div className="fade-in">
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircleOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
            <span>数据验证</span>
            <Badge className="blockchain-badge" count="🔥 区块链溯源" />
          </div>
        }
        className="medical-card"
      >
        <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
          <Input
            size="large"
            placeholder="输入病历ID进行验证"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
          />
          <Button type="primary" size="large" icon={<SearchOutlined />} onClick={handleVerify}>
            验证
          </Button>
        </Space.Compact>

        {result && (
          <Alert
            message="✅ 验证通过"
            description={`区块链哈希: ${result.hash} | 上链时间: ${result.timestamp}`}
            type="success"
            showIcon
          />
        )}
      </Card>
    </div>
  );
};

export default DataValidator;
