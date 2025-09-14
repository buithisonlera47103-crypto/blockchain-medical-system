/**
 * 聊天面板组件 - 显示消息列表和输入框
 */

import { format } from 'date-fns';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { Message, Conversation } from '../types/chat';

interface ChatPanelProps {
  conversation?: Conversation | null;
  className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ conversation, className = '' }) => {
  const {
    messages,
    currentConversation,
    sendMessage,
    markMessageAsRead,
    startTyping,
    stopTyping,
    typingUsers,
    isLoading,
    error,
  } = useChat();

  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeConversation = conversation || currentConversation;

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 标记消息为已读
  useEffect(() => {
    if (activeConversation && messages.length > 0) {
      const unreadMessages = messages.filter(msg => !msg.is_read && msg.sender_id !== user?.userId);

      unreadMessages.forEach(msg => {
        markMessageAsRead(msg.message_id);
      });
    }
  }, [messages, activeConversation, user?.userId, markMessageAsRead]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (activeConversation) {
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        startTyping(activeConversation.conversation_id);
      }

      // 重置输入状态定时器
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          stopTyping(activeConversation.conversation_id);
        }
      }, 1000);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    const content = messageInput.trim();
    setMessageInput('');

    // 停止输入状态
    if (isTyping) {
      setIsTyping(false);
      stopTyping(activeConversation.conversation_id);
    }

    try {
      await sendMessage(content);
      // 聚焦输入框
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 格式化时间
  const formatMessageTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return format(date, 'HH:mm');
      } else if (diffInHours < 24 * 7) {
        return format(date, 'MM-dd HH:mm');
      } else {
        return format(date, 'yyyy-MM-dd HH:mm');
      }
    } catch (error) {
      return '';
    }
  };

  // 获取正在输入的用户
  const getTypingUsers = (): string[] => {
    if (!activeConversation) return [];
    return typingUsers[activeConversation.conversation_id] || [];
  };

  // 渲染消息
  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.sender_id === user?.userId;
    const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
    const showTime =
      index === messages.length - 1 ||
      messages[index + 1]?.sender_id !== message.sender_id ||
      new Date(messages[index + 1]?.timestamp).getTime() - new Date(message.timestamp).getTime() >
        5 * 60 * 1000;

    return (
      <div
        key={message.message_id}
        className={`flex items-end space-x-2 mb-4 ${
          isOwnMessage ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* 发送者头像 */}
        {!isOwnMessage && (
          <div className={`flex-shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {message.sender?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}

        {/* 消息内容 */}
        <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwnMessage ? 'order-1' : 'order-2'}`}>
          {/* 发送者名称 */}
          {!isOwnMessage && showAvatar && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-3">
              {message.sender?.username || '未知用户'}
            </div>
          )}

          {/* 消息气泡 */}
          <div
            className={`relative px-4 py-2 rounded-2xl ${
              isOwnMessage
                ? 'bg-blue-500 text-white rounded-br-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

            {/* 消息状态 */}
            {isOwnMessage && (
              <div className="flex items-center justify-end mt-1 space-x-1">
                {message.is_read ? (
                  <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-blue-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* 时间戳 */}
          {showTime && (
            <div
              className={`text-xs text-gray-400 dark:text-gray-500 mt-1 px-3 ${
                isOwnMessage ? 'text-right' : 'text-left'
              }`}
            >
              {formatMessageTime(message.timestamp)}
            </div>
          )}
        </div>

        {/* 自己的头像 */}
        {isOwnMessage && (
          <div className={`flex-shrink-0 order-2 ${showAvatar ? 'visible' : 'invisible'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.username?.charAt(0).toUpperCase() || 'M'}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!activeConversation) {
    return (
      <div
        className={`flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 ${className}`}
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            选择一个对话开始聊天
          </h3>
          <p className="text-gray-500 dark:text-gray-400">从左侧选择一个对话，或者开始新的对话</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
      {/* 聊天头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            {activeConversation.other_user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeConversation.other_user.username}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeConversation.other_user.role === 'doctor'
                ? '医生'
                : activeConversation.other_user.role === 'patient'
                  ? '患者'
                  : activeConversation.other_user.role}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">加载消息中...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">还没有消息，开始对话吧！</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}

        {/* 正在输入指示器 */}
        {getTypingUsers().length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {activeConversation.other_user.username.charAt(0).toUpperCase()}
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              rows={1}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center min-w-[80px]"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
