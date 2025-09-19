import { MessageCircle, Send, Search, Phone, Video, Heart, User, Clock, Calendar, Plus, Filter, Star, Bell, FileText, Image, Paperclip, Smile } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Doctor {
  id: string;
  name: string;
  department: string;
  rating: number;
  isOnline: boolean;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'patient' | 'doctor';
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
}

const PatientChatContent: React.FC = () => {
  const { user } = useAuth();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 模拟医生数据
  const doctors: Doctor[] = [
    {
      id: 'doctor_zhang',
      name: '张医生',
      department: '心内科',
      rating: 4.9,
      isOnline: true,
      avatar: 'ZY',
      lastMessage: '您好，有什么可以帮助您的吗？',
      lastMessageTime: '30分钟前',
      unreadCount: 0
    },
    {
      id: 'doctor_li',
      name: '李医生',
      department: '神经科',
      rating: 4.8,
      isOnline: true,
      avatar: 'LY',
      lastMessage: '记得按时服药哦',
      lastMessageTime: '1小时前',
      unreadCount: 1
    },
    {
      id: 'doctor_wang',
      name: '王医生',
      department: '骨科',
      rating: 4.7,
      isOnline: true,
      avatar: 'WY',
      lastMessage: '下周记得来复诊',
      lastMessageTime: '2小时前',
      unreadCount: 0
    }
  ];

  // 医生分类
  const doctorCategories = [
    { key: 'all', label: '全部医生', color: 'from-blue-500 to-indigo-600' },
    { key: 'cardiology', label: '心内科', color: 'from-red-500 to-pink-600' },
    { key: 'neurology', label: '神经科', color: 'from-purple-500 to-indigo-600' },
    { key: 'orthopedics', label: '骨科', color: 'from-emerald-500 to-teal-600' },
    { key: 'dermatology', label: '皮肤科', color: 'from-orange-500 to-amber-600' },
    { key: 'pediatrics', label: '儿科', color: 'from-cyan-500 to-blue-600' }
  ];

  // 过滤医生
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // 滚动到消息底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 选择医生
  const handleSelectDoctor = (doctor: Doctor) => {
    console.log('🔄 Selecting doctor:', doctor.name);
    setSelectedDoctor(doctor);
    
    // 加载该医生的消息历史
    const mockMessages: Message[] = [
      {
        id: 'msg_1',
        senderId: doctor.id,
        senderName: doctor.name,
        senderRole: 'doctor',
        content: '您好，我是' + doctor.name + '，有什么可以帮助您的吗？',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: 'text'
      },
      {
        id: 'msg_2',
        senderId: user?.id || 'patient',
        senderName: user?.username || '患者',
        senderRole: 'patient',
        content: '医生您好，我想咨询一下身体不适的问题',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        type: 'text'
      },
      {
        id: 'msg_3',
        senderId: doctor.id,
        senderName: doctor.name,
        senderRole: 'doctor',
        content: '请详细描述一下您的症状，我会为您分析',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: 'text'
      }
    ];
    
    setMessages(mockMessages);
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDoctor) return;

    const userMessage: Message = {
      id: 'msg_' + Date.now(),
      senderId: user?.id || 'patient',
      senderName: user?.username || '患者',
      senderRole: 'patient',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // 模拟医生回复
    setTimeout(() => {
      const doctorReplies = [
        '我理解您的担心，让我为您详细分析一下',
        '根据您的描述，建议您注意以下几点',
        '这种情况比较常见，不用过于担心',
        '建议您按时服药，注意休息',
        '如果症状持续，建议您来医院复诊'
      ];
      
      const doctorMessage: Message = {
        id: 'msg_' + (Date.now() + 1),
        senderId: selectedDoctor.id,
        senderName: selectedDoctor.name,
        senderRole: 'doctor',
        content: doctorReplies[Math.floor(Math.random() * doctorReplies.length)],
        timestamp: new Date().toISOString(),
        type: 'text'
      };

      setMessages(prev => [...prev, doctorMessage]);
    }, 2000);
  };

  // 监听消息变化，滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 快速咨询模板
  const quickTemplates = [
    '医生您好，我想咨询一下身体不适的问题',
    '请问我的检查报告结果如何？',
    '关于用药剂量，我有一些疑问',
    '我需要预约复诊时间'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 flex h-screen">
        {/* 左侧医生列表 */}
        <div className="w-1/3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-xl">
          {/* 标题区域 */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <MessageCircle className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">✨ 在线咨询</h2>
                <p className="text-blue-100">专业医生为您服务</p>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-200" />
              <input
                type="text"
                placeholder="搜索医生..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* 科室分类 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {doctorCategories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.key
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* 医生列表 */}
          <div className="flex-1 overflow-y-auto">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                onClick={() => handleSelectDoctor(doctor)}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-gray-700 ${
                  selectedDoctor?.id === doctor.id ? 'bg-blue-100 dark:bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* 医生头像 */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {doctor.avatar}
                    </div>
                    {doctor.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {doctor.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-gray-500">{doctor.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {doctor.department}
                      </span>
                      {doctor.isOnline && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          在线
                        </span>
                      )}
                    </div>

                    {doctor.lastMessage && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {doctor.lastMessage}
                      </p>
                    )}
                    
                    {doctor.lastMessageTime && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {doctor.lastMessageTime}
                      </p>
                    )}
                  </div>

                  {doctor.unreadCount && doctor.unreadCount > 0 && (
                    <div className="w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {doctor.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
          {selectedDoctor ? (
            <>
              {/* 聊天头部 */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {selectedDoctor.avatar}
                      </div>
                      {selectedDoctor.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedDoctor.name}
                      </h3>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        {selectedDoctor.department}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {selectedDoctor.rating} 分
                          </span>
                        </div>
                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          • 在线
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button className="p-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-2xl transition-all hover:scale-105">
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-3 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-emerald-600 dark:text-emerald-300 rounded-2xl transition-all hover:scale-105">
                      <Video className="h-5 w-5" />
                    </button>
                    <button className="p-3 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded-2xl transition-all hover:scale-105">
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderRole === 'patient' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-lg ${
                        message.senderRole === 'patient'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.senderRole === 'patient'
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 快速回复模板 */}
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {quickTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setNewMessage(template)}
                      className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-xl transition-all"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>

              {/* 消息输入框 */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-end space-x-4">
                  <div className="flex space-x-2">
                    <button className="p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button className="p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                      <Image className="h-5 w-5" />
                    </button>
                    <button className="p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                      <Smile className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="输入您的问题..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                    />
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl shadow-lg transition-all hover:scale-105 disabled:hover:scale-100"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* 未选择医生的状态 */
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                  <MessageCircle className="h-16 w-16 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    选择医生开始咨询
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    从左侧选择一位在线医生，开始您的健康咨询之旅
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientChatContent;