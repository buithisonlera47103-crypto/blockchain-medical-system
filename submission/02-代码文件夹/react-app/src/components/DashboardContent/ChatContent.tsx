import { MessageCircle, Send, Bot, User, Mic, Paperclip } from 'lucide-react';
import React, { useState } from 'react';

const ChatContent: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '您好！我是智能医疗助手，可以帮助您解答医疗数据相关问题。请问有什么可以帮助您的吗？',
      timestamp: '14:30',
    },
    {
      id: 2,
      type: 'user',
      content: '请帮我分析一下患者P001234的最新检查报告',
      timestamp: '14:32',
    },
    {
      id: 3,
      type: 'bot',
      content:
        '好的，我已经为您调取了患者P001234的最新检查报告。根据血常规检查结果显示：\n\n• 白细胞计数：6.8×10⁹/L（正常范围）\n• 红细胞计数：4.2×10¹²/L（正常范围）\n• 血红蛋白：135g/L（正常范围）\n• 血小板计数：280×10⁹/L（正常范围）\n\n整体检查结果在正常范围内，建议继续观察。',
      timestamp: '14:33',
    },
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: 'user' as const,
        content: message,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessage('');

      // 模拟AI回复
      setTimeout(() => {
        const botReply = {
          id: messages.length + 2,
          type: 'bot' as const,
          content: '我正在处理您的请求，请稍候...',
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, botReply]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">智能聊天</h1>
          <p className="text-gray-600 dark:text-gray-400">与AI助手交流，获取医疗数据分析和建议</p>
        </div>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col">
        {/* 聊天头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">医疗AI助手</h3>
              <p className="text-sm text-green-500">在线</p>
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                  msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {msg.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的问题..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={1}
              />
            </div>
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendMessage}
              className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 快捷功能 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <button className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
          <div className="text-sm font-medium">数据分析</div>
        </button>
        <button className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
          <div className="text-sm font-medium">报告解读</div>
        </button>
        <button className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
          <div className="text-sm font-medium">健康建议</div>
        </button>
        <button className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
          <div className="text-sm font-medium">用药指导</div>
        </button>
      </div>
    </div>
  );
};

export default ChatContent;
