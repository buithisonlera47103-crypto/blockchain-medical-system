/**
 * 聊天页面组件 - 整合对话列表、聊天面板和通知栏
 */

import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { Conversation } from '../types/chat';

import ChatPanel from './ChatPanel';
import ConversationList from './ConversationList';
import NotificationBar from './NotificationBar';

import 'react-toastify/dist/ReactToastify.css';

interface ChatPageProps {
  className?: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { currentConversation, isConnected, error, connect, disconnect } = useChat();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const [showUserList, setShowUserList] = useState(false);

  // 处理对话选择
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // 在移动端选择对话后关闭侧边栏
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    }
  };

  // 处理连接重试
  const handleRetryConnection = () => {
    if (!isConnected) {
      connect();
      toast.info('正在重新连接...');
    }
  };

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 页面卸载时断开连接
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  if (!user) {
    return (
      <div
        className={`flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 ${className}`}
      >
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">请先登录</h2>
          <p className="text-gray-500 dark:text-gray-400">您需要登录后才能使用聊天功能</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${className}`}
    >
      {/* 移动端遮罩层 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 左侧对话列表 */}
      <div
        className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 fixed md:relative z-50 md:z-auto
        w-80 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">聊天</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.username}</p>
            </div>
          </div>

          {/* 移动端关闭按钮 */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 连接状态指示器 - 美化版 */}
        <div className="px-4 py-2">
          <div
            className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
              isConnected
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full ${
                  isConnected ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'
                }`}
              >
                {isConnected ? (
                  <svg
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div>
                <span
                  className={`text-sm font-medium ${
                    isConnected
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {isConnected ? '连接正常' : '连接断开'}
                </span>
                <p
                  className={`text-xs ${
                    isConnected
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-red-600 dark:text-red-500'
                  }`}
                >
                  {isConnected ? '实时聊天已启用' : '无法接收新消息'}
                </p>
              </div>
            </div>
            {!isConnected && (
              <button
                onClick={handleRetryConnection}
                className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-800/50 hover:bg-red-200 dark:hover:bg-red-800 rounded-md transition-colors duration-200 flex items-center space-x-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>重新连接</span>
              </button>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* 对话列表 */}
        <div className="flex-1">
          <ConversationList onSelectConversation={handleSelectConversation} className="h-full" />
        </div>
      </div>

      {/* 右侧聊天面板 - 添加顶部间距 */}
      <div className="flex-1 flex flex-col mt-4 md:mt-0">
        {/* 移动端顶部栏 - 美化版 */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentConversation ? currentConversation.other_user.username : '聊天'}
          </h1>
          <div className="w-10"></div> {/* 占位符保持居中 */}
        </div>

        {/* 聊天面板 - 添加圆角和阴影 */}
        <div className="flex-1 m-2 md:m-4">
          <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ChatPanel
              conversation={selectedConversation || currentConversation}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* 通知栏 */}
      <NotificationBar position="bottom" maxNotifications={3} />

      {/* Toast 容器 */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        className="mt-16"
      />
    </div>
  );
};

export default ChatPage;
