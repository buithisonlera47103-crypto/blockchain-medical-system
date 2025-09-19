import { MessageCircle, Send, Search, Phone, Monitor, Stethoscope, User, Clock, Bell } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  isOnline: boolean;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  priority: 'high' | 'medium' | 'low';
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

const DoctorChatContent: React.FC = () => {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 模拟患者数据
  const patients: Patient[] = [
    {
      id: 'patient_zhang',
      name: '张三',
      age: 45,
      gender: '男',
      condition: '高血压',
      isOnline: true,
      avatar: 'ZS',
      lastMessage: '医生您好，我想咨询一下血压问题',
      lastMessageTime: '30分钟前',
      unreadCount: 1,
      priority: 'high'
    },
    {
      id: 'patient_li',
      name: '李四',
      age: 32,
      gender: '女',
      condition: '感冒',
      isOnline: true,
      avatar: 'LS',
      lastMessage: '谢谢医生的建议',
      lastMessageTime: '1小时前',
      unreadCount: 0,
      priority: 'medium'
    },
    {
      id: 'patient_wang',
      name: '王五',
      age: 28,
      gender: '男',
      condition: '体检咨询',
      isOnline: false,
      avatar: 'WW',
      lastMessage: '想了解体检结果',
      lastMessageTime: '2小时前',
      unreadCount: 0,
      priority: 'low'
    }
  ];

  // 过滤患者
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.condition.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // 滚动到消息底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 选择患者
  const handleSelectPatient = (patient: Patient) => {
    console.log('🔄 Doctor selecting patient:', patient.name);
    setSelectedPatient(patient);
    
    // 加载该患者的消息历史
    const mockMessages: Message[] = [
      {
        id: 'msg_1',
        senderId: patient.id,
        senderName: patient.name,
        senderRole: 'patient',
        content: '医生您好，我是' + patient.name + '，想咨询关于' + patient.condition + '的问题',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: 'text'
      },
      {
        id: 'msg_2',
        senderId: user?.id || 'doctor',
        senderName: user?.username || '医生',
        senderRole: 'doctor',
        content: '您好' + patient.name + '，我会详细为您分析，请描述具体症状',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        type: 'text'
      },
      {
        id: 'msg_3',
        senderId: patient.id,
        senderName: patient.name,
        senderRole: 'patient',
        content: '最近感觉' + patient.condition + '有些加重，想了解应该怎么处理',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: 'text'
      }
    ];
    
    setMessages(mockMessages);
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPatient) return;

    const doctorMessage: Message = {
      id: 'msg_' + Date.now(),
      senderId: user?.id || 'doctor',
      senderName: user?.username || '医生',
      senderRole: 'doctor',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, doctorMessage]);
    setNewMessage('');

    // 模拟患者回复
    setTimeout(() => {
      const patientReplies = [
        '好的医生，我明白了，谢谢您的专业建议',
        '医生说得很详细，我会按照您说的做',
        '非常感谢医生的耐心解答，对我很有帮助',
        '我会注意的，如果有变化会及时联系您',
        '好的，我想预约下次复诊时间'
      ];
      
      const patientMessage: Message = {
        id: 'msg_' + (Date.now() + 1),
        senderId: selectedPatient.id,
        senderName: selectedPatient.name,
        senderRole: 'patient',
        content: patientReplies[Math.floor(Math.random() * patientReplies.length)],
        timestamp: new Date().toISOString(),
        type: 'text'
      };

      setMessages(prev => [...prev, patientMessage]);
    }, 2000);
  };

  // 监听消息变化，滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 快速回复模板
  const quickReplies = [
    '请详细描述您的症状',
    '建议您按时服药，注意休息',
    '这种情况比较常见，不用过于担心',
    '建议您来医院进行进一步检查',
    '请按医嘱用药，有问题随时联系'
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100 dark:from-gray-900 dark:via-slate-900 dark:to-cyan-900">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 flex h-screen">
        {/* 左侧患者列表 */}
        <div className="w-1/3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-xl">
          {/* 标题区域 */}
          <div className="p-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <MessageCircle className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">✨ 实时在线</h2>
                <p className="text-cyan-100">患者沟通中心</p>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cyan-200" />
              <input
                type="text"
                placeholder="搜索患者..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/20 border border-white/30 rounded-2xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* 在线状态统计 */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                在线患者: <span className="font-semibold text-emerald-600">{patients.filter(p => p.isOnline).length}</span>
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                待回复: <span className="font-semibold text-red-600">{patients.reduce((sum, p) => sum + (p.unreadCount || 0), 0)}</span>
              </span>
            </div>
          </div>

          {/* 患者列表 */}
          <div className="flex-1 overflow-y-auto">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:bg-cyan-50 dark:hover:bg-gray-700 ${
                  selectedPatient?.id === patient.id ? 'bg-cyan-100 dark:bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* 患者头像 */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {patient.avatar}
                    </div>
                    {patient.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {patient.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(patient.priority)}`}>
                        {patient.priority === 'high' ? '紧急' : patient.priority === 'medium' ? '一般' : '普通'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {patient.age}岁 · {patient.gender}
                      </span>
                      {patient.isOnline ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          在线
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          离线
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-cyan-600 dark:text-cyan-400 font-medium mt-1">
                      {patient.condition}
                    </div>

                    {patient.lastMessage && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {patient.lastMessage}
                      </p>
                    )}
                    
                    {patient.lastMessageTime && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {patient.lastMessageTime}
                      </p>
                    )}
                  </div>

                  {patient.unreadCount && patient.unreadCount > 0 && (
                    <div className="w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {patient.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
          {selectedPatient ? (
            <>
              {/* 聊天头部 */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white to-cyan-50 dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {selectedPatient.avatar}
                      </div>
                      {selectedPatient.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedPatient.name}
                      </h3>
                      <p className="text-cyan-600 dark:text-cyan-400 font-medium">
                        {selectedPatient.age}岁 · {selectedPatient.gender}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedPatient.priority)}`}>
                          {selectedPatient.condition}
                        </span>
                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          • {selectedPatient.isOnline ? '在线' : '离线'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button className="p-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-2xl transition-all hover:scale-105">
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-3 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-emerald-600 dark:text-emerald-300 rounded-2xl transition-all hover:scale-105">
                      <Monitor className="h-5 w-5" />
                    </button>
                    <button className="p-3 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900 dark:hover:bg-cyan-800 text-cyan-600 dark:text-cyan-300 rounded-2xl transition-all hover:scale-105">
                      <Stethoscope className="h-5 w-5" />
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
                      message.senderRole === 'doctor' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-lg ${
                        message.senderRole === 'doctor'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p
                        className={`text-xs mt-2 ${
                          message.senderRole === 'doctor'
                            ? 'text-cyan-100'
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
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => setNewMessage(reply)}
                      className="px-3 py-2 text-sm bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900 dark:hover:bg-cyan-800 text-cyan-600 dark:text-cyan-300 rounded-xl transition-all"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              {/* 消息输入框 */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-end space-x-4">
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
                      placeholder="输入回复消息..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                    />
                  </div>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-2xl shadow-lg transition-all hover:scale-105 disabled:hover:scale-100"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* 未选择患者的状态 */
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                  <MessageCircle className="h-16 w-16 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    选择患者开始沟通
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    从左侧选择一位患者，开始专业的医疗咨询服务
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

export default DoctorChatContent;