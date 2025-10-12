/**
 * 管理员顶部导航栏
 * MedChain Admin Panel
 */

import React, { useState } from 'react';
import { Layout, Input, Badge, Avatar, Dropdown, Space, Modal, message } from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const { Header } = Layout;

interface AdminHeaderProps {
  user?: any;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  // 处理退出登录
  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '您确定要退出管理员面板吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        message.success('退出成功');
        navigate('/login');
      },
    });
  };

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
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
      danger: true,
      onClick: handleLogout,
    },
  ];

  // 通知下拉菜单
  const notificationMenuItems: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <div className="notification-item">
          <div className="notification-title">系统通知</div>
          <div className="notification-desc">系统备份完成</div>
          <div className="notification-time">5分钟前</div>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <div className="notification-item">
          <div className="notification-title">告警提示</div>
          <div className="notification-desc">节点node-7连接超时</div>
          <div className="notification-time">15分钟前</div>
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'all',
      label: '查看全部通知',
      style: { textAlign: 'center' },
    },
  ];

  // 处理搜索
  const handleSearch = (value: string) => {
    if (value.trim()) {
      message.info(`搜索: ${value}`);
      // TODO: 实现搜索功能
    }
  };

  return (
    <Header className="admin-header">
      <div className="admin-header-left">
        <div className="admin-brand">
          <span className="brand-icon">🏥</span>
          <span className="brand-text">MedChain Admin Panel</span>
          <span className="brand-version">v2.1.0</span>
        </div>
      </div>

      <div className="admin-header-center">
        <Input
          className="global-search"
          placeholder="搜索用户、记录、日志..."
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={() => handleSearch(searchValue)}
          allowClear
          style={{ width: 400 }}
        />
      </div>

      <div className="admin-header-right">
        <Space size="large">
          {/* 语言切换 */}
          <Dropdown
            menu={{
              items: [
                { key: 'zh', label: '简体中文' },
                { key: 'en', label: 'English' },
              ],
            }}
            trigger={['click']}
          >
            <GlobalOutlined className="header-icon" />
          </Dropdown>

          {/* 通知中心 */}
          <Dropdown
            menu={{ items: notificationMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Badge count={5} offset={[-2, 2]}>
              <BellOutlined className="header-icon" />
            </Badge>
          </Dropdown>

          {/* 用户菜单 */}
          <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <div className="user-info">
              <Avatar
                size="small"
                icon={<UserOutlined />}
                src={user?.avatar}
              />
              <span className="user-name">{user?.name || '管理员'}</span>
            </div>
          </Dropdown>
        </Space>
      </div>
    </Header>
  );
};

export default AdminHeader;

