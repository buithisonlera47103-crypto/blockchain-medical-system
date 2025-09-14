import { MessageCircle, Send, Search, Phone, Monitor, Stethoscope } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useChat } from '../../contexts/ChatContext';

const DoctorChatContent: React.FC = () => {
  const {
    conversations,
    currentConversation,
    messages,
    isConnected,
    isLoading,
    connect,
    disconnect,
    loadConversations,
    selectConversation,
    sendMessage,
    onlineUsers
  } = useChat();

  const [newMessage, setNewMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 初始化聊天连接
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
    loadConversations();

    return () => {
      disconnect();
    };
  }, [isConnected, connect, disconnect, loadConversations]);

  // 过滤对话
  const filteredConversations = conversations.filter(conv =>
    conv.other_user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 发送消息处理
  const handleSendMessage = async () => {
    if (newMessage.trim() && currentConversation) {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  // 选择对话处理
  const handleSelectConversation = async (conversationId: string) => {
    await selectConversation(conversationId);
  };

  // 检查用户是否在线
  const isUserOnline = (userId: string) => {
    return onlineUsers.some(user => user.userId === userId);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* 左侧对话列表 */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 搜索栏 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索患者..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* 连接状态 */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? '已连接' : '连接中...'}
            </span>
          </div>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <MessageCircle className="w-8 h-8 mb-2" />
              <p>暂无对话</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.conversation_id}
                onClick={() => handleSelectConversation(conversation.conversation_id)}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  currentConversation?.conversation_id === conversation.conversation_id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                      {conversation.other_user.username.charAt(0).toUpperCase()}
                    </div>
                    {isUserOnline(conversation.other_user.user_id) && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conversation.other_user.username}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.last_message_time ? new Date(conversation.last_message_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                      {conversation.last_message || '开始对话...'}
                    </p>
                    {conversation.unread_count > 0 && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {conversation.unread_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* 聊天头部 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                      {currentConversation.other_user.username.charAt(0).toUpperCase()}
                    </div>
                    {isUserOnline(currentConversation.other_user.user_id) && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentConversation.other_user.username}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isUserOnline(currentConversation.other_user.user_id) ? '在线' : '离线'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Monitor className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <Stethoscope className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>开始与患者对话吧</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.message_id}
                    className={`flex ${message.sender_id === currentConversation.other_user.user_id ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === currentConversation.other_user.user_id
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'bg-green-500 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === currentConversation.other_user.user_id
                          ? 'text-gray-500 dark:text-gray-400'
                          : 'text-green-100'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 消息输入框 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">选择一个对话</h3>
              <p>从左侧选择患者开始聊天</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorChatContent;