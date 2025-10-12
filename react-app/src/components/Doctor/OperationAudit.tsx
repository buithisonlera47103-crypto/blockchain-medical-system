/**
 * 医生端 - 操作审计 🔥
 */

import React, { useState } from 'react';
import { Card, Timeline, Tag, Badge } from 'antd';
import { EditOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import '../../styles/theme.css';

const OperationAudit: React.FC = () => {
  const [logs] = useState([
    { id: '1', action: 'view', record: '张三-年度体检', time: '2025-10-10 14:30' },
    { id: '2', action: 'edit', record: '李四-感冒诊疗', time: '2025-10-09 09:15' },
    { id: '3', action: 'create', record: '王五-新建病历', time: '2025-10-08 16:45' },
  ]);

  const actionConfig = {
    view: { icon: <EyeOutlined />, color: 'blue', text: '查看' },
    edit: { icon: <EditOutlined />, color: 'orange', text: '编辑' },
    create: { icon: <EditOutlined />, color: 'green', text: '创建' },
  };

  return (
    <div className="fade-in">
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileTextOutlined style={{ fontSize: '24px', color: '#eb2f96' }} />
            <span>操作审计</span>
            <Badge className="audit-badge" count="🔥 不可抵赖" />
          </div>
        }
        className="medical-card"
      >
        <Timeline
          items={logs.map(log => {
            const config = actionConfig[log.action as keyof typeof actionConfig];
            return {
              color: config.color,
              dot: config.icon,
              children: (
                <div>
                  <Tag color={config.color}>{config.text}</Tag>
                  <span style={{ marginLeft: 8 }}>{log.record}</span>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4 }}>
                    {log.time}
                  </div>
                </div>
              ),
            };
          })}
        />
      </Card>
    </div>
  );
};

export default OperationAudit;
