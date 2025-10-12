/**
 * 患者界面导航重新设计方案
 * 更加人性化、直观的患者端导航体验
 */

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Tooltip, Card, Progress } from 'antd';
import type { MenuProps } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuOutlined,
  HeartOutlined,
  SafetyOutlined,
  FileTextOutlined,
  EyeOutlined,
  UploadOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

interface PatientNavigationProps {
  activeKey: string;
  setActiveKey: (key: string) => void;
  renderContent: () => React.ReactNode;
}

const PatientNavigationRedesign: React.FC<PatientNavigationProps> = ({
  activeKey,
  setActiveKey,
  renderContent,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [healthScore] = useState(85); // 模拟健康评分

  // 重新设计的患者导航菜单
  const patientMenuItems = [
    {
      key: 'dashboard',
      icon: <HeartOutlined style={{ color: '#ff4d4f' }} />,
      label: (
        <div className="menu-item-content">
          <span className="menu-label">健康概览</span>
          <span className="menu-desc">我的健康状态</span>
        </div>
      ),
    },
    {
      key: 'records',
      icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
      label: (
        <div className="menu-item-content">
          <span className="menu-label">我的病历</span>
          <span className="menu-desc">查看病历记录</span>
          <Badge count={3} size="small" className="menu-badge" />
        </div>
      ),
    },
    {
      key: 'permissions',
      icon: <SafetyOutlined style={{ color: '#52c41a' }} />,
      label: (
        <div className="menu-item-content">
          <span className="menu-label">隐私设置</span>
          <span className="menu-desc">管理访问权限</span>
          <span className="menu-hot">🔥</span>
        </div>
      ),
    },
    {
      key: 'verify',
      icon: <EyeOutlined style={{ color: '#722ed1' }} />,
      label: (
        <div className="menu-item-content">
          <span className="menu-label">数据验证</span>
          <span className="menu-desc">确保信息真实</span>
          <span className="menu-hot">🔥</span>
        </div>
      ),
    },
    {
      key: 'upload',
      icon: <UploadOutlined style={{ color: '#13c2c2' }} />,
      label: (
        <div className="menu-item-content">
          <span className="menu-label">上传资料</span>
          <span className="menu-desc">添加新病历</span>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined style={{ color: '#8c8c8c' }} />,
      label: (
        <div className="menu-item-content">
          <span className="menu-label">个人设置</span>
          <span className="menu-desc">账户管理</span>
        </div>
      ),
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined style={{ color: '#faad14' }} />,
      label: (
        <div className="menu-item-content">
          <span className="menu-label">帮助中心</span>
          <span className="menu-desc">使用指南</span>
        </div>
      ),
    },
  ];

  // 用户菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout className="patient-dashboard-redesign">
      {/* 重新设计的顶部导航栏 */}
      <Header className="patient-header">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon">
              <span className="medical-cross">⚕️</span>
            </div>
            <div className="logo-text">
              <h1>MedChain</h1>
              <span className="tagline">您的健康守护者</span>
            </div>
          </div>
        </div>

        <div className="header-center">
          {/* 健康状态指示器 */}
          <div className="health-indicator">
            <div className="health-score">
              <Progress
                type="circle"
                percent={healthScore}
                size={40}
                strokeColor={{
                  '0%': '#87d068',
                  '100%': '#108ee9',
                }}
                format={() => <HeartOutlined style={{ color: '#ff4d4f' }} />}
              />
              <span className="score-text">健康评分 {healthScore}</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* 快捷操作 */}
          <div className="quick-actions">
            <Tooltip title="紧急联系">
              <Button 
                type="text" 
                icon={<PhoneOutlined />} 
                className="emergency-btn"
              />
            </Tooltip>
            
            <Tooltip title="消息通知">
              <Badge count={2} size="small">
                <Button type="text" icon={<BellOutlined />} />
              </Badge>
            </Tooltip>
          </div>

          {/* 用户信息 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="user-profile">
              <Avatar
                size="large"
                icon={<UserOutlined />}
                style={{ 
                  backgroundColor: '#1890ff',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
              <div className="user-details">
                <span className="user-name">{user?.name || '患者用户'}</span>
                <span className="user-id">ID: {user?.id || 'P001'}</span>
              </div>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        {/* 重新设计的左侧导航栏 */}
        <Sider
          width={280}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          className="patient-sider"
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

          {/* 患者信息卡片 */}
          {!collapsed && (
            <div className="patient-info-card">
              <Card size="small" className="info-card">
                <div className="patient-summary">
                  <Avatar size={48} icon={<UserOutlined />} />
                  <div className="summary-text">
                    <h4>{user?.name || '患者用户'}</h4>
                    <p>上次就诊: 2024-01-15</p>
                    <div className="status-indicators">
                      <span className="status-item">
                        <span className="status-dot active"></span>
                        账户正常
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 导航菜单 */}
          <Menu
            mode="inline"
            selectedKeys={[activeKey]}
            items={patientMenuItems}
            onClick={({ key }) => setActiveKey(key as string)}
            className="patient-menu"
          />

          {/* 底部快捷信息 */}
          {!collapsed && (
            <div className="sider-footer">
              <div className="quick-stats">
                <div className="stat-item">
                  <span className="stat-number">12</span>
                  <span className="stat-label">病历记录</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">3</span>
                  <span className="stat-label">待处理</span>
                </div>
              </div>
            </div>
          )}
        </Sider>

        {/* 主内容区 */}
        <Content className="patient-content">
          <div className="content-wrapper">
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default PatientNavigationRedesign;