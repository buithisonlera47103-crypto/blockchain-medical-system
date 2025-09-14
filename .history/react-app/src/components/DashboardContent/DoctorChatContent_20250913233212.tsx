import { MessageCircle, Send, User, Search, Phone, Monitor } from 'lucide-react';
import React, { useState } from 'react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'doctor' | 'patient';
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface ChatConversation {
  id: string;
  patientId: string;
  patientName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'online' | 'offline';
  messages: ChatMessage[];
}

const DoctorChatContent: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([
    {
      id: 'conv_001',
      patientId: 'patient_zhang',
      patientName: '张三',
      lastMessage: '我最近血压有点高，需要调整药物吗？',
      lastMessageTime: '14:30',
      unreadCount: 0,
      status: 'online',
      messages: [
        {
          id: 'msg_001',
          senderId: 'patient_zhang',
          senderName: '张三',
          senderType: 'patient',
          content: '医生您好，我是张三',
          timestamp: '14:25',
          isRead: true,
        },
        {
          id: 'msg_002',
          senderId: 'doctor_test',
          senderName: '张医生',
          senderType: 'doctor',
          content: '您好张三，有什么可以帮助您的吗？',
          timestamp: '14:26',
          isRead: true,
        },
        {
          id: 'msg_003',
          senderId: 'patient_zhang',
          senderName: '张三',
          senderType: 'patient',
          content: '我最近血压有点高，需要调整药物吗？',
          timestamp: '14:30',
          isRead: true,
        },
      ],
    },
    {
      id: 'conv_002',
      patientId: 'P001235',
      patientName: '李四',
      lastMessage: '谢谢医生的建议，我会按时服药的',
      lastMessageTime: '13:45',
      unreadCount: 0,
      status: 'offline',
      messages: [
        {
          id: 'msg_004',
          senderId: 'P001235',
          senderName: '李四',
          senderType: 'patient',
          content: '医生，关于糖尿病饮食有什么建议吗？',
          timestamp: '13:40',
          isRead: true,
        },
        {
          id: 'msg_005',
          senderId: 'doctor_test',
          senderName: '医生',
          senderType: 'doctor',
          content: '建议您控制碳水化合物摄入，多吃蔬菜和优质蛋白质',
          timestamp: '13:42',
          isRead: true,
        },
        {
          id: 'msg_006',
          senderId: 'P001235',
          senderName: '李四',
          senderType: 'patient',
          content: '谢谢医生的建议，我会按时服药的',
          timestamp: '13:45',
          isRead: true,
        },
      ],
    },
  ]);

  const [selectedConversation, setSelectedConversation] = useState<string | null>('conv_001');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentConversation = conversations.find(conv => conv.id === selectedConversation);

  const handleSendMessage = () => {
    if (newMessage.trim() && currentConversation) {
      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        senderId: 'doctor_test',
        senderName: '张医生',
        senderType: 'doctor',
        content: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
      };

      // 更新对话列表
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === selectedConversation
            ? {
                ...conv,
                messages: [...conv.messages, newMsg],
                lastMessage: newMessage.trim(),
                lastMessageTime: newMsg.timestamp,
              }
            : conv
        )
      );

      setNewMessage('');
      console.log('消息已发送:', newMsg);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'online' ? 'bg-green-400' : 'bg-gray-400';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          患者咨询
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          与患者进行实时医疗咨询和沟通
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* 对话列表 */}
        <div className="col-span-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
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
            
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedConversation === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(conversation.status)} rounded-full border-2 border-white dark:border-gray-800`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {conversation.patientName}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.lastMessageTime}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                            {conversation.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 聊天区域 */}
        <div className="col-span-8">
          {currentConversation ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
              {/* 聊天头部 */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(currentConversation.status)} rounded-full border-2 border-white dark:border-gray-800`}></div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {currentConversation.patientName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {currentConversation.status === 'online' ? '在线' : '离线'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                    <Monitor className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderType === 'doctor'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderType === 'doctor' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 消息输入 */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  选择患者开始咨询
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  从左侧列表选择一个患者开始医疗咨询
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorChatContent;
