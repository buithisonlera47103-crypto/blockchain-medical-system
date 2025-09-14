/**
 * 对话列表组件 - 显示用户的聊天对话列表
 */

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import React, { useState, useEffect } from 'react';

import { useChat } from '../contexts/ChatContext';
import { Conversation } from '../types/chat';

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  className?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  className = '',
}) => {
  const { conversations, currentConversation, selectConversation, onlineUsers, isLoading, error } =
    useChat();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

  // 过滤对话
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(
        conv =>
          conv.other_user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchTerm]);

  // 处理对话选择
  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      await selectConversation(conversation.conversation_id);
      onSelectConversation?.(conversation);
    } catch (error) {
      console.error('Failed to select conversation:', error);
    }
  };

  // 检查用户是否在线
  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.some(user => user.userId === userId);
  };

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } catch (error) {
      return '';
    }
  };

  // 获取用户角色显示文本
  const getRoleText = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      doctor: '医生',
      patient: '患者',
      hospital_admin: '医院管理员',
      super_admin: '超级管理员',
    };
    return roleMap[role] || role;
  };

  // 截断消息内容
  const truncateMessage = (content: string, maxLength: number = 50): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
      {/* 搜索框 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索对话..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">暂无对话</p>
            <p className="text-sm text-center">
              {searchTerm ? '没有找到匹配的对话' : '开始与医生或患者聊天吧'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredConversations.map(conversation => {
              const isSelected =
                currentConversation?.conversation_id === conversation.conversation_id;
              const isOnline = isUserOnline(conversation.other_user.user_id);
              const hasUnread = conversation.unread_count > 0;

              return (
                <div
                  key={conversation.conversation_id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* 用户头像 */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {conversation.other_user.username.charAt(0).toUpperCase()}
                      </div>
                      {/* 在线状态指示器 */}
                      {isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      )}
                    </div>

                    {/* 对话信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <h3
                            className={`text-sm font-medium truncate ${
                              hasUnread
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {conversation.other_user.username}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {getRoleText(conversation.other_user.role)}
                          </span>
                        </div>
                        {hasUnread && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </span>
                        )}
                      </div>

                      {/* 最后一条消息 */}
                      {conversation.last_message && (
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm truncate ${
                              hasUnread
                                ? 'text-gray-900 dark:text-white font-medium'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {truncateMessage(conversation.last_message.content)}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                            {formatTime(conversation.last_message.timestamp)}
                          </span>
                        </div>
                      )}

                      {/* 在线状态文本 */}
                      <div className="flex items-center mt-1">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        ></div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {isOnline ? '在线' : '离线'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
