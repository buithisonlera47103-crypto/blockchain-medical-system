/**
 * 管理员左侧功能菜单
 * MedChain Admin Panel
 */

import React from 'react';
import { Layout, Menu, Card, Tag, Divider } from 'antd';
import { adminNavigation } from '../../../config/navigationConfig';
import type { MenuProps } from 'antd';
import './styles.css';

const { Sider } = Layout;

interface AdminSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  selectedKey: string;
  onSelect: (key: string) => void;
  user?: any;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  onCollapse,
  selectedKey,
  onSelect,
  user,
}) => {
  // 将导航配置转换为Menu items
  const menuItems: MenuProps['items'] = adminNavigation.map((item) => ({
    key: item.component,
    icon: React.createElement(item.icon),
    label: (
      <div className="menu-item-content">
        <span className="menu-label">{item.label}</span>
        {item.badge && <span className="menu-badge">{item.badge}</span>}
      </div>
    ),
  }));

  // 处理菜单选择
  const handleMenuSelect: MenuProps['onSelect'] = ({ key }) => {
    onSelect(key);
  };

  return (
    <Sider
      className="admin-sidebar"
      width={260}
      collapsedWidth={80}
      collapsed={collapsed}
      onCollapse={onCollapse}
      collapsible
      theme="light"
      breakpoint="lg"
    >
      {/* 管理员信息卡片 */}
      {!collapsed && (
        <Card className="admin-info-card" bordered={false}>
          <div className="admin-avatar-section">
            <div className="admin-avatar">
              <span className="avatar-icon">👤</span>
            </div>
            <div className="admin-details">
              <div className="admin-name">{user?.name || '李管理员'}</div>
              <Tag color="success" className="online-tag">
                在线
              </Tag>
            </div>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div className="admin-meta">
            <div className="meta-item">
              <span className="meta-icon">🏥</span>
              <span className="meta-text">系统管理员</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">🕐</span>
              <span className="meta-text">
                最后登录: {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 功能菜单 */}
      <div className="admin-menu-wrapper">
        <div className="menu-header">
          {!collapsed && <span className="menu-title">📋 功能菜单</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onSelect={handleMenuSelect}
          className="admin-menu"
        />
      </div>

      {/* 系统信息 */}
      {!collapsed && (
        <div className="admin-footer-info">
          <Divider style={{ margin: '12px 0' }} />
          <div className="system-info">
            <div className="info-item">
              <span className="info-label">版本:</span>
              <span className="info-value">v2.1.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">运行时间:</span>
              <span className="info-value">15天</span>
            </div>
          </div>
        </div>
      )}
    </Sider>
  );
};

export default AdminSidebar;

