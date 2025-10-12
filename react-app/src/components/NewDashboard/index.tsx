/**
 * 新版Dashboard - 信息安全竞赛专用
 * 左侧导航栏 + 右侧内容区布局
 */

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuOutlined,
  HeartOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationByRole } from '../../config/navigationConfig';
import MemoryMonitor from '../MemoryMonitor';

// 患者端组件 (动态导入)
import PatientRecordsView from '../Patient/RecordsView';
import PermissionManager from '../Patient/PermissionManager';
import BlockchainVerifier from '../Patient/BlockchainVerifier';
import AccessLogs from '../Patient/AccessLogs';
import UploadRecord from '../Patient/UploadRecord';

// 医生端组件 (动态导入)
import DoctorRecordsManager from '../Doctor/RecordsManager';
import CreateRecord from '../Doctor/CreateRecord';
import AuthorizationRequest from '../Doctor/AuthorizationRequest';
import DataValidator from '../Doctor/DataValidator';
import OperationAudit from '../Doctor/OperationAudit';

import './styles.css';

const { Header, Sider, Content } = Layout;

const NewDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('records');

  // 获取当前用户角色的导航配置
  const navigationItems = getNavigationByRole(user?.role || 'patient');

  // 退出登录
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogout,
    },
  ];

  // 导航菜单项
  const menuItems: MenuProps['items'] = navigationItems.map((item) => ({
    key: item.key,
    icon: React.createElement(item.icon, {
      style: { fontSize: '18px', color: item.color },
    }),
    label: (
      <div className="menu-item-content">
        <span>{item.label}</span>
        {item.badge && (
          <span className="menu-item-badge">{item.badge}</span>
        )}
      </div>
    ),
    title: item.description,
  }));

  // 渲染内容组件
  const renderContent = () => {
    const role = user?.role?.toLowerCase();
    const componentMap: Record<string, React.ReactNode> = {};

    if (role === 'patient') {
      componentMap['records'] = <PatientRecordsView />;
      componentMap['permissions'] = <PermissionManager />;
      componentMap['verify'] = <BlockchainVerifier />;
      componentMap['logs'] = <AccessLogs />;
      componentMap['upload'] = <UploadRecord />;
    } else if (role === 'doctor') {
      componentMap['records'] = <DoctorRecordsManager />;
      componentMap['create'] = <CreateRecord />;
      componentMap['request'] = <AuthorizationRequest />;
      componentMap['verify'] = <DataValidator />;
      componentMap['audit'] = <OperationAudit />;
    }

    return componentMap[activeKey] || <div>功能开发中...</div>;
  };

  useEffect(() => {
    // 设置页面标题
    document.title = `${user?.role === 'patient' ? '患者' : '医生'}端 - 区块链医疗系统`;
  }, [user?.role]);

  return (
    <Layout className="new-dashboard">
      {/* 全新顶部导航栏 - 简洁设计 */}
      <Header className="dashboard-header">
        <div className="header-left">
          {/* 品牌区域 - 一行文字布局 */}
          <div className="brand-section">
            <span className="medical-icon">⚕️</span>
            <span className="brand-text">MedChain：您的智能健康管家</span>
          </div>
        </div>

        {/* 中央区域 - 留空 */}
        <div className="header-center">
          {/* 留空区域 */}
        </div>

        <div className="header-right">
          <div className="header-actions">
            {/* 紧急电话图标（圆形按钮） */}
            <Tooltip title="紧急联系" placement="bottom">
              <Button
                type="text"
                icon={<PhoneOutlined />}
                className="emergency-btn"
                shape="circle"
              />
            </Tooltip>

            {/* 通知图标（带数字徽章） */}
            <Tooltip title="消息通知" placement="bottom">
              <Badge count={3} className="notification-badge">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="notification-btn"
                  shape="circle"
                />
              </Badge>
            </Tooltip>

            {/* 用户头像 + 一行信息（姓名：角色） */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              overlayClassName="user-dropdown"
            >
              <div className="user-profile">
                <Avatar
                  size={40}
                  icon={<UserOutlined />}
                  className="user-avatar"
                />
                <span className="user-info-text">
                  {user?.name || '张三'}：{user?.role === 'patient' ? '患者' : '医生'}
                </span>
              </div>
            </Dropdown>

            {/* 最右上角：患者端/医生端标识（小徽章） */}
            <div className="role-badge">
              <span className="role-text">
                {user?.role === 'patient' ? '患者端' : '医生端'}
              </span>
            </div>
          </div>
        </div>
      </Header>

      <Layout>
        {/* 左侧导航栏 - 全新设计 */}
        <Sider
          width={260}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          className="dashboard-sider"
          trigger={null}
        >
          {/* 自定义折叠按钮 */}
          <div className="sider-header">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-btn"
            />
            {!collapsed && (
              <span className="sider-title">功能导航</span>
            )}
          </div>

          {/* 用户快捷信息卡片 */}
          {!collapsed && user?.role === 'patient' && (
            <div className="user-quick-info">
              <div className="info-card">
                <div className="info-header">
                  <Avatar size={50} icon={<UserOutlined />} className="info-avatar" />
                  <div className="info-details">
                    <h4>{user?.name || '患者用户'}</h4>
                    <p className="info-subtitle">会员等级：黄金会员</p>
                  </div>
                </div>
                <div className="info-stats">
                  <div className="stat-item">
                    <span className="stat-number">12</span>
                    <span className="stat-label">病历</span>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat-item">
                    <span className="stat-number">3</span>
                    <span className="stat-label">待办</span>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat-item">
                    <span className="stat-number">85</span>
                    <span className="stat-label">健康分</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 导航菜单 */}
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            items={menuItems}
            onClick={({ key }) => setActiveKey(key as string)}
            className="dashboard-menu"
          />

          {/* 底部角色标识和帮助 */}
          {!collapsed && (
            <div className="sider-footer">
              <div className="role-badge">
                <div className={`role-indicator ${user?.role}`}>
                  <span className="role-icon">
                    {user?.role === 'patient' ? '👤' : '👨‍⚕️'}
                  </span>
                  <span className="role-text">
                    {user?.role === 'patient' ? '患者端' : '医生端'}
                  </span>
                </div>
              </div>
              <div className="help-section">
                <Button type="link" className="help-btn">
                  💬 在线客服
                </Button>
                <Button type="link" className="help-btn">
                  📞 联系我们
                </Button>
              </div>
            </div>
          )}
        </Sider>

        {/* 主内容区 */}
        <Content className="dashboard-content">
          <div className="content-wrapper fade-in">
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default NewDashboard;

