/**
 * 管理员主面板组件
 * MedChain Admin Panel - 信息安全竞赛版
 */

import React, { useState, useEffect } from 'react';
import { Layout, Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import { SystemMonitor } from './SystemMonitor';
import { UserManagement } from './UserManagement';
import { BlockchainManagement } from './BlockchainManagement';
import { SecurityCenter } from './SecurityCenter';
import { DataAnalytics } from './DataAnalytics';
import { InstitutionPharma } from './InstitutionPharma';
import { SystemConfig } from './SystemConfig';
import './styles/admin.css';

const { Content } = Layout;

// 组件映射
const componentMap: Record<string, React.ComponentType<any>> = {
  SystemMonitor,
  UserManagement,
  BlockchainManagement,
  SecurityCenter,
  DataAnalytics,
  InstitutionPharma,
  SystemConfig,
};

export const AdminDashboard: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string>('SystemMonitor');
  const [loading, setLoading] = useState(true);

  // 从localStorage获取用户信息
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    // 模拟初始化加载
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 验证管理员权限
  const hasAdminRole = (role: string | undefined): boolean => {
    if (!role) return false;
    const adminRoles = ['admin', 'system_admin', 'super_admin', 'hospital_admin'];
    return adminRoles.includes(role.toLowerCase());
  };

  // 如果不是管理员，重定向到首页
  if (!hasAdminRole(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 渲染选中的组件
  const renderComponent = () => {
    const Component = componentMap[selectedComponent];
    return Component ? <Component /> : <SystemMonitor />;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="加载管理员面板..." />
      </div>
    );
  }

  return (
    <Layout className="admin-layout">
      <AdminHeader user={user} />
      <Layout>
        <AdminSidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          selectedKey={selectedComponent}
          onSelect={setSelectedComponent}
          user={user}
        />
        <Content className="admin-content">
          <div className="admin-content-wrapper">
            {renderComponent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;

