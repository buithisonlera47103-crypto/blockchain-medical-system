/**
 * 聊天上下文 - 管理聊天状态和Socket.IO连接
 */

import axios from 'axios';
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { toast } from 'react-toastify';
import { io, Socket } from 'socket.io-client';

import {
  ChatContextState,
  UseChatReturn,
  Conversation,
  Message,
  ChatNotification,
  TypingIndicator,
  SocketUser,
  ServerToClientEvents,
  ClientToServerEvents,
  CreateMessageRequest,
  ConnectionStatus,
} from '../types/chat';

import { useAuth } from './AuthContext';


// 聊天状态动作类型
type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: Conversation | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { messageId: string; updates: Partial<Message> } }
  | { type: 'SET_ONLINE_USERS'; payload: SocketUser[] }
  | { type: 'SET_TYPING_USERS'; payload: { conversationId: string; users: string[] } }
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation }
  | { type: 'INCREMENT_UNREAD'; payload: string }
  | { type: 'CLEAR_UNREAD'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: ChatNotification }
  | { type: 'CLEAR_NOTIFICATIONS' };

// 初始状态
const initialState: ChatContextState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  onlineUsers: [],
  typingUsers: {},
  unreadCount: 0,
  isConnected: false,
  isLoading: false,
  error: null,
};

// 状态reducer
function chatReducer(state: ChatContextState, action: ChatAction): ChatContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };

    case 'SET_CONVERSATIONS':
      return {
        ...state,
        conversations: action.payload,
        unreadCount: action.payload.reduce((total, conv) => total + conv.unread_count, 0),
      };

    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversation: action.payload };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.message_id === action.payload.messageId ? { ...msg, ...action.payload.updates } : msg
        ),
      };

    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };

    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.conversationId]: action.payload.users,
        },
      };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.conversation_id === action.payload.conversation_id ? action.payload : conv
        ),
      };

    case 'INCREMENT_UNREAD':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.conversation_id === action.payload
            ? { ...conv, unread_count: conv.unread_count + 1 }
            : conv
        ),
        unreadCount: state.unreadCount + 1,
      };

    case 'CLEAR_UNREAD':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.conversation_id === action.payload ? { ...conv, unread_count: 0 } : conv
        ),
        unreadCount: Math.max(
          0,
          state.unreadCount -
            (state.conversations.find(c => c.conversation_id === action.payload)?.unread_count || 0)
        ),
      };

    case 'CLEAR_NOTIFICATIONS':
      return state;

    default:
      return state;
  }
}

// 创建上下文
const ChatContext = createContext<UseChatReturn | null>(null);

// 聊天提供者组件
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuth();
  const token = localStorage.getItem('emr_token');
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const typingTimeoutRef = useRef<{ [conversationId: string]: NodeJS.Timeout }>({});
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [, setConnectionStatus] = React.useState<ConnectionStatus>('disconnected');

  // API基础URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

  // 连接Socket.IO
  const connect = useCallback(() => {
    if (!user || !token) {
      console.log('Cannot connect: missing user or token');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Attempting to connect to WebSocket...');
    setConnectionStatus('connecting');
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      socketRef.current = io(SOCKET_URL, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      const socket = socketRef.current;

      // 连接成功
      socket.on('connect', () => {
        console.log('✅ Socket connected successfully:', socket.id);
        setConnectionStatus('connected');
        dispatch({ type: 'SET_CONNECTED', payload: true });
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: null });
        toast.success('聊天连接成功', { autoClose: 2000 });
      });

      // 连接失败
      socket.on('connect_error', (error: any) => {
        console.error('❌ Socket connection error:', error);
        setConnectionStatus('error');
        dispatch({ type: 'SET_CONNECTED', payload: false });
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: `连接失败: ${error.message || '请检查网络'}` });
        toast.error('聊天连接失败，请检查后端服务是否运行');

        // 让 Socket.IO 内置重连机制处理，无需手动调用 connect()
      });

      // 断开连接
      socket.on('disconnect', (reason: any) => {
        console.log('⚠️ Socket disconnected:', reason);
        setConnectionStatus('disconnected');
        dispatch({ type: 'SET_CONNECTED', payload: false });

        if (reason === 'io server disconnect' || reason === 'transport close') {
          // 服务器主动断开或传输关闭，交由 Socket.IO 内置重连机制处理
          toast.warning('连接已断开，正在重新连接...');
          // 不再手动调用 connect()，避免产生连接风暴
        }
      });

      // 接收新消息
      socket.on('newMessage', (data: any) => {
        const message: Message = {
          message_id: data.messageId,
          conversation_id: data.conversationId,
          sender_id: data.senderId,
          content: data.content,
          message_type: data.messageType as any,
          is_read: false,
          timestamp: new Date(data.timestamp).toISOString(),
          sender: {
            user_id: data.sender.userId,
            username: data.sender.username,
            role: data.sender.role,
          },
        };

        dispatch({ type: 'ADD_MESSAGE', payload: message });

        // 如果不是当前对话，增加未读计数
        if (state.currentConversation?.conversation_id !== data.conversationId) {
          dispatch({ type: 'INCREMENT_UNREAD', payload: data.conversationId });
        }

        // 显示通知
        if (data.senderId !== user?.id) {
          toast.info(
            `${data.sender.username}: ${data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content}`
          );
        }
      });

      // 用户上线
      socket.on('userOnline', (data: any) => {
        console.log('User online:', data);
        // 更新在线用户列表
      });

      // 用户下线
      socket.on('userOffline', (data: any) => {
        console.log('User offline:', data);
        // 更新在线用户列表
      });

      // 正在输入
      socket.on('userTyping', (data: TypingIndicator) => {
        const currentUsers = state.typingUsers[data.conversationId] || [];

        if (data.isTyping) {
          if (!currentUsers.includes(data.username)) {
            dispatch({
              type: 'SET_TYPING_USERS',
              payload: {
                conversationId: data.conversationId,
                users: [...currentUsers, data.username],
              },
            });
          }
        } else {
          dispatch({
            type: 'SET_TYPING_USERS',
            payload: {
              conversationId: data.conversationId,
              users: currentUsers.filter(u => u !== data.username),
            },
          });
        }
      });

      // 消息已读
      socket.on('messageRead', (data: any) => {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            messageId: data.messageId,
            updates: { is_read: true },
          },
        });
      });

      // 通知
      socket.on('notification', (notification: ChatNotification) => {
        toast.info(notification.message);
      });

      // 错误处理
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
        toast.error(error.message || '发生未知错误');
      });
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      setConnectionStatus('error');
      dispatch({ type: 'SET_ERROR', payload: '无法建立连接' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, token, SOCKET_URL]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionStatus('disconnected');
    dispatch({ type: 'SET_CONNECTED', payload: false });

    // 清理定时器
    Object.values(typingTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    typingTimeoutRef.current = {};

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    if (!user || !token) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // 先尝试从后端加载
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/chat`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            userId: user.id,
          },
        });

        if (response.data && response.data.conversations) {
          dispatch({ type: 'SET_CONVERSATIONS', payload: response.data.conversations });
          return;
        }
      } catch (apiError) {
        console.log('Backend API not available, using mock data:', apiError);
      }

      // 如果后端不可用，使用测试数据
      const mockConversations: Conversation[] = [];

      if (user.role === 'patient') {
        // 患者看到医生列表
        mockConversations.push({
          conversation_id: 'conv_patient_doctor',
          user1_id: 'patient_zhang',
          user2_id: 'doctor_test',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          other_user: {
            user_id: 'doctor_test',
            username: '张医生',
            role: 'doctor'
          },
          last_message: '您好，有什么可以帮助您的吗？',
          last_message_time: new Date().toISOString(),
          unread_count: 0
        });
      } else if (user.role === 'doctor') {
        // 医生看到患者列表
        mockConversations.push({
          conversation_id: 'conv_patient_doctor',
          user1_id: 'patient_zhang',
          user2_id: 'doctor_test',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          other_user: {
            user_id: 'patient_zhang',
            username: '张三',
            role: 'patient'
          },
          last_message: '医生您好，我想咨询一下血压问题',
          last_message_time: new Date().toISOString(),
          unread_count: 1
        });
      }

      dispatch({ type: 'SET_CONVERSATIONS', payload: mockConversations });

    } catch (error) {
      console.error('Failed to load conversations:', error);
      dispatch({ type: 'SET_ERROR', payload: '加载对话列表失败' });
      toast.error('加载对话列表失败');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, token, API_BASE_URL]);

  // 选择对话
  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (!user || !token) return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        // 先尝试从后端加载消息
        try {
          const response = await axios.get(`${API_BASE_URL}/api/v1/chat/${conversationId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              page: 1,
              limit: 50,
            },
          });

          if (response.data && response.data.messages) {
            dispatch({ type: 'SET_MESSAGES', payload: response.data.messages });
          }
        } catch (apiError) {
          console.log('Backend API not available, using mock messages:', apiError);

          // 如果后端不可用，使用测试消息数据
          const mockMessages: Message[] = [
            {
              message_id: 'msg_1',
              conversation_id: conversationId,
              sender_id: 'patient_zhang',
              content: '医生您好，我是张三',
              message_type: 'text',
              is_read: true,
              timestamp: new Date(Date.now() - 3600000).toISOString(), // 1小时前
              sender: {
                user_id: 'patient_zhang',
                username: '张三',
                role: 'patient'
              }
            },
            {
              message_id: 'msg_2',
              conversation_id: conversationId,
              sender_id: 'doctor_test',
              content: '您好张三，有什么可以帮助您的吗？',
              message_type: 'text',
              is_read: true,
              timestamp: new Date(Date.now() - 3000000).toISOString(), // 50分钟前
              sender: {
                user_id: 'doctor_test',
                username: '张医生',
                role: 'doctor'
              }
            },
            {
              message_id: 'msg_3',
              conversation_id: conversationId,
              sender_id: 'patient_zhang',
              content: '我最近血压有点高，需要调整药物吗？',
              message_type: 'text',
              is_read: false,
              timestamp: new Date(Date.now() - 1800000).toISOString(), // 30分钟前
              sender: {
                user_id: 'patient_zhang',
                username: '张三',
                role: 'patient'
              }
            }
          ];

          dispatch({ type: 'SET_MESSAGES', payload: mockMessages });
        }

        // 设置当前对话
        console.log('🔍 Looking for conversation:', conversationId);
        console.log('📋 Available conversations:', state.conversations);
        const conversation = state.conversations.find(c => c.conversation_id === conversationId);
        console.log('🎯 Found conversation:', conversation);

        if (conversation) {
          console.log('✅ Setting current conversation:', conversation);
          dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation });
          dispatch({ type: 'CLEAR_UNREAD', payload: conversationId });

          // 加入对话房间
          if (socketRef.current) {
            socketRef.current.emit('joinConversation', { conversationId });
          }
        } else {
          console.error('❌ Conversation not found:', conversationId);
        }
      } catch (error) {
        console.error('Failed to select conversation:', error);
        dispatch({ type: 'SET_ERROR', payload: '加载对话失败' });
        toast.error('加载对话失败');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [user, token, API_BASE_URL, state.conversations]
  );

  // 发送消息
  const sendMessage = useCallback(
    async (content: string, recipientId?: string) => {
      if (!user || !token || !content.trim()) return;

      const targetRecipientId = recipientId || state.currentConversation?.other_user.user_id;
      if (!targetRecipientId) {
        toast.error('请选择对话对象');
        return;
      }

      try {
        const messageData: CreateMessageRequest = {
          recipientId: targetRecipientId,
          content: content.trim(),
          messageType: 'text',
        };

        if (socketRef.current && socketRef.current.connected) {
          // 通过Socket发送，同时本地乐观更新（后端当前未实现聊天事件回显）
          socketRef.current.emit('sendMessage', messageData);

          const newMessage: Message = {
            message_id: `msg_${Date.now()}`,
            conversation_id: state.currentConversation?.conversation_id || 'conv_patient_doctor',
            sender_id: user.id,
            content: content.trim(),
            message_type: 'text',
            is_read: false,
            timestamp: new Date().toISOString(),
            sender: {
              user_id: user.id,
              username: user.username,
              role: user.role
            }
          };

          dispatch({ type: 'ADD_MESSAGE', payload: newMessage });

          // 更新会话预览信息
          if (state.currentConversation) {
            const updatedConv: Conversation = {
              ...state.currentConversation,
              last_message: newMessage.content,
              last_message_time: newMessage.timestamp,
            };
            dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConv });
          }

          toast.success('消息发送成功');
        } else {
          // 通过HTTP API发送
          try {
            const response = await axios.post(`${API_BASE_URL}/api/v1/chat`, messageData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.data) {
              toast.success('消息发送成功');
              // 添加新消息到当前对话
              dispatch({ type: 'ADD_MESSAGE', payload: response.data });
            }
          } catch (apiError) {
            console.log('Backend API not available, adding message locally:', apiError);

            // 如果后端不可用，直接添加到本地状态
            const newMessage: Message = {
              message_id: `msg_${Date.now()}`,
              conversation_id: state.currentConversation?.conversation_id || 'conv_patient_doctor',
              sender_id: user.id,
              content: content.trim(),
              message_type: 'text',
              is_read: false,
              timestamp: new Date().toISOString(),
              sender: {
                user_id: user.id,
                username: user.username,
                role: user.role
              }
            };

            dispatch({ type: 'ADD_MESSAGE', payload: newMessage });

            if (state.currentConversation) {
              const updatedConv: Conversation = {
                ...state.currentConversation,
                last_message: newMessage.content,
                last_message_time: newMessage.timestamp,
              };
              dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConv });
            }

            toast.success('消息发送成功');
          }
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('发送消息失败');
      }
    },
    [user, token, state.currentConversation, API_BASE_URL, dispatch]
  );

  // 创建对话
  const createConversation = useCallback(
    async (recipientId: string): Promise<Conversation | null> => {
      if (!user || !token) return null;

      try {
        // 检查是否已存在对话
        const existingConversation = state.conversations.find(
          conv =>
            (conv.user1_id === user.id && conv.user2_id === recipientId) ||
            (conv.user1_id === recipientId && conv.user2_id === user.id)
        );

        if (existingConversation) {
          // 直接选择现有对话
          dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: existingConversation });
          return existingConversation;
        }

        // 通过API创建新对话
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/chat/conversations`,
          {
            recipientId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const newConversation = response.data;

        // 重新加载对话列表
        await loadConversations();

        return newConversation;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        toast.error('创建对话失败');
        return null;
      }
    },
    [user, token, state.conversations, loadConversations, API_BASE_URL, dispatch]
  );

  // 加载更多消息
  const loadMessages = useCallback(
    async (conversationId: string, page: number = 1) => {
      if (!user || !token) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/chat/${conversationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page,
            limit: 50,
          },
        });

        if (response.data && response.data.messages) {
          if (page === 1) {
            dispatch({ type: 'SET_MESSAGES', payload: response.data.messages });
          } else {
            // 追加历史消息
            dispatch({
              type: 'SET_MESSAGES',
              payload: [...response.data.messages, ...state.messages],
            });
          }
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('加载消息失败');
      }
    },
    [user, token, API_BASE_URL, state.messages]
  );

  // 标记消息为已读
  const markMessageAsRead = useCallback(
    async (messageId: string) => {
      if (!user || !token || !state.currentConversation) return;

      try {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('markAsRead', {
            messageId,
            conversationId: state.currentConversation.conversation_id,
          });
        } else {
          await axios.put(
            `${API_BASE_URL}/api/v1/chat/messages/${messageId}/read`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    },
    [user, token, state.currentConversation, API_BASE_URL]
  );

  // 停止输入
  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('stopTyping', { conversationId });
    }

    if (typingTimeoutRef.current[conversationId]) {
      clearTimeout(typingTimeoutRef.current[conversationId]);
      delete typingTimeoutRef.current[conversationId];
    }
  }, []);

  // 开始输入
  const startTyping = useCallback(
    (conversationId: string) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('typing', { conversationId });

        // 设置自动停止输入的定时器
        if (typingTimeoutRef.current[conversationId]) {
          clearTimeout(typingTimeoutRef.current[conversationId]);
        }

        typingTimeoutRef.current[conversationId] = setTimeout(() => {
          stopTyping(conversationId);
        }, 3000);
      }
    },
    [stopTyping]
  );

  // 检查在线状态
  const checkOnlineStatus = useCallback((userIds: string[]) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('getOnlineStatus', { userIds });
    }
  }, []);

  // 清除通知
  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  // 当用户状态改变时，自动连接或断开
  useEffect(() => {
    console.log('User/token changed:', { hasUser: !!user, hasToken: !!token });
    if (user && token) {
      console.log('User logged in, attempting to connect...');
      connect();
      loadConversations();
    } else {
      console.log('User logged out, disconnecting...');
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // 页面卸载时断开连接
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnect();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [disconnect]);

  const value: UseChatReturn = {
    ...state,
    connect,
    disconnect,
    loadConversations,
    selectConversation,
    createConversation,
    sendMessage,
    loadMessages,
    markMessageAsRead,
    startTyping,
    stopTyping,
    checkOnlineStatus,
    clearNotifications,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// 使用聊天上下文的Hook
export const useChat = (): UseChatReturn => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
