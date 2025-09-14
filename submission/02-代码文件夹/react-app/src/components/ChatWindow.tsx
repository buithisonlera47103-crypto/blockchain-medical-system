import { Send, Paperclip, Image, File, X, Check, CheckCheck } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
// 简单的时间格式化函数
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

interface ChatWindowProps {
  conversationId: string;
  recipientId: string;
  recipientName: string;
  onClose?: () => void;
}

// Message interface moved to types file

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  recipientId,
  recipientName,
  onClose,
}) => {
  const { user } = useAuth();
  const { currentConversation, messages, isConnected, sendMessage, startTyping, stopTyping } =
    useChat();
  // messages已从useChat获取，移除本地状态
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 加载聊天历史
  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/chat/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        await response.json();
        // 消息会通过ChatContext自动更新
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;

    try {
      await sendMessage(newMessage.trim(), currentConversation.other_user.user_id);
      setNewMessage('');
      toast.success('消息发送成功');
    } catch (error) {
      toast.error('消息发送失败');
    }
  };

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件大小 (10MB限制)
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
      }
      setSelectedFile(file);
      setShowFilePreview(true);
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // 发送正在输入状态
    if (isConnected && currentConversation) {
      startTyping(currentConversation.conversation_id);

      // 清除之前的定时器
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // 3秒后停止输入状态
      typingTimeoutRef.current = setTimeout(() => {
        if (currentConversation) {
          stopTyping(currentConversation.conversation_id);
        }
      }, 3000);
    }
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 标记消息为已读 - 暂时注释掉未使用的函数
  // const markAsRead = async (messageId: string) => {
  //   try {
  //     await fetch(`/api/v1/chat/messages/${messageId}/read`, {
  //       method: 'PUT',
  //       headers: {
  //         'Authorization': `Bearer ${localStorage.getItem('token')}`
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Failed to mark message as read:', error);
  //   }
  // };

  // 文件上传处理 - 暂时注释掉未使用的函数
  // const handleFileUpload = async (file: File) => {
  //   if (!currentConversation) return;
  //   const formData = new FormData();
  //   formData.append('file', file);
  //   formData.append('conversationId', currentConversation.conversation_id);
  //   try {
  //     toast.success('文件上传成功');
  //   } catch (error) {
  //     toast.error('文件上传失败');
  //   }
  // };

  // 下载文件 - 暂时注释掉未使用的函数
  // const downloadFile = (fileUrl: string, fileName: string) => {
  //   const link = document.createElement('a');
  //   link.href = fileUrl;
  //   link.download = fileName;
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isConnected) return;

    // 监听新消息 - 暂时注释掉未使用的函数
    // const handleNewMessage = (message: Message) => {
    //   if (message.sender_id !== user?.userId) {
    //     // 新消息会通过ChatContext自动更新
    //     // 自动标记为已读
    //     markAsRead(message.message_id);
    //   }
    // };

    // 监听输入状态 - 暂时注释掉未使用的函数
    // const handleTyping = ({ userId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
    //   if (userId === recipientId) {
    //     setIsTyping(typing);
    //   }
    // };

    // Socket event listeners are handled by ChatContext

    return () => {
      // Socket cleanup is handled by ChatContext
    };
  }, [isConnected, user?.userId, recipientId]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* 聊天头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {recipientName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{recipientName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? '在线' : '离线'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.message_id}
              className={`flex ${message.sender_id === user?.userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md ${message.sender_id === user?.userId ? 'order-2' : 'order-1'}`}
              >
                <div
                  className={`p-3 rounded-lg ${
                    message.sender_id === user?.userId
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}

                  {message.message_type === 'file' && (
                    <div
                      className={`mt-2 p-2 rounded border ${
                        message.sender_id === user?.userId
                          ? 'border-blue-300 bg-blue-50/20'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <File className="w-4 h-4" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">文件消息</p>
                          <p className="text-xs opacity-75">点击查看详情</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-xs ${
                        message.sender_id === user?.userId
                          ? 'text-blue-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                    {message.sender_id === user?.userId && (
                      <div className="ml-2">
                        {message.is_read ? (
                          <CheckCheck className="w-3 h-3 text-blue-200" />
                        ) : (
                          <Check className="w-3 h-3 text-blue-200" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
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

      {/* 文件预览 */}
      {showFilePreview && selectedFile && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getFileIcon(selectedFile.type)}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setShowFilePreview(false);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && !selectedFile}
            className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
