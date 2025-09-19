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
      console.log('🔄 更新在线用户列表:', action.payload);
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

// 医生自动回复函数
const getDoctorAutoReply = (patientMessage: string): string => {
  const message = patientMessage.toLowerCase();
  
  if (message.includes('头痛') || message.includes('头疼')) {
    return '您好，头痛可能有多种原因。请描述一下疼痛的性质，是胀痛、刺痛还是跳痛？持续多长时间了？';
  } else if (message.includes('血压') || message.includes('高血压')) {
    return '血压问题需要定期监测。请问您最近测量的血压值是多少？有在服用降压药物吗？';
  } else if (message.includes('心脏') || message.includes('胸闷') || message.includes('心跳')) {
    return '心脏相关症状需要重视。请描述一下具体症状，有胸闷、心悸或者胸痛吗？什么时候症状比较明显？';
  } else if (message.includes('发烧') || message.includes('发热')) {
    return '发热是身体的防御反应。请问体温是多少？有其他伴随症状吗？比如咳嗽、喉咙痛等？';
  } else if (message.includes('咳嗽')) {
    return '咳嗽可能是呼吸道感染的症状。请问是干咳还是有痰？咳嗽持续多久了？有发热吗？';
  } else if (message.includes('药物') || message.includes('吃药') || message.includes('服药')) {
    return '关于用药问题，请务必按照医嘱服用。如果有不良反应或疑问，请及时告知。您具体想咨询哪种药物？';
  } else if (message.includes('检查') || message.includes('报告')) {
    return '检查报告需要结合您的症状来综合分析。请您把报告拍照发送给我，我来为您详细解读。';
  } else if (message.includes('复诊') || message.includes('预约')) {
    return '好的，我来为您安排复诊。请问您方便什么时间？建议您先预约下周的门诊时间。';
  } else {
    const replies = [
      '感谢您的咨询。请详细描述一下您的症状，这样我能更好地为您分析。',
      '我理解您的担心。为了给您更准确的建议，能否提供更多详细信息？',
      '根据您的描述，建议您注意休息。如果症状持续或加重，请及时就医。',
      '这种情况比较常见，不用过于担心。建议您先观察，必要时到医院进一步检查。',
      '我会为您详细分析。同时建议您保持良好的作息和饮食习惯。'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
};

// 患者自动回复函数  
const getPatientAutoReply = (doctorMessage: string): string => {
  const message = doctorMessage.toLowerCase();
  
  if (message.includes('描述') || message.includes('详细')) {
    return '症状是这样的：主要是感觉不舒服，想请医生您帮忙看看。';
  } else if (message.includes('血压') || message.includes('测量')) {
    return '最近测的血压是140/90，觉得比平时高一些，有点担心。';
  } else if (message.includes('药物') || message.includes('服用')) {
    return '好的医生，我会按照您说的按时服药。如果有问题我再咨询您。';
  } else if (message.includes('检查') || message.includes('报告')) {
    return '好的，我把检查报告发给您看看。麻烦您帮我分析一下。';
  } else if (message.includes('休息') || message.includes('注意')) {
    return '谢谢医生的建议，我会注意休息的。还有什么需要特别注意的吗？';
  } else if (message.includes('预约') || message.includes('复诊')) {
    return '好的，我想预约下周三上午的时间，可以吗？';
  } else {
    const replies = [
      '好的医生，我明白了。谢谢您的耐心解答。',
      '医生说得对，我会注意的。还有其他需要注意的吗？',
      '谢谢医生的建议，我感觉心里踏实多了。',
      '我会按照您说的做，如果有变化再联系您。',
      '非常感谢医生的专业建议，对我很有帮助。'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
};

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
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>('disconnected');

  // API基础URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

  // 连接Socket.IO
  const connect = useCallback(() => {
    if (!user || !token) {
      console.log('Cannot connect: missing user or token');
      return;
    }

    if (connectionStatus === 'connected') {
      console.log('Already connected, skipping');
      return;
    }

    console.log('🔄 开始连接聊天服务...', { user: user.username, role: user.role });
    
    // 直接使用模拟模式，不依赖Socket.IO
    setConnectionStatus('connecting');
    dispatch({ type: 'SET_LOADING', payload: true });

    // 立即模拟连接成功
    setTimeout(() => {
      console.log('✅ 模拟聊天连接成功');
      setConnectionStatus('connected');
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // 模拟在线用户 - 确保包含医生和患者
      const mockOnlineUsers = [
        { userId: 'doctor_test', username: '张医生', role: 'doctor' },
        { userId: 'doctor_li', username: '李医生', role: 'doctor' },
        { userId: 'doctor_wang', username: '王医生', role: 'doctor' },
        { userId: 'patient_zhang', username: '张三', role: 'patient' },
        { userId: 'patient_li', username: '李四', role: 'patient' },
        { userId: user.id, username: user.username, role: user.role }
      ];
      
      console.log('👥 设置在线用户:', mockOnlineUsers);
      dispatch({ type: 'SET_ONLINE_USERS', payload: mockOnlineUsers });
      
      toast.success('💬 聊天连接成功！', { autoClose: 2000 });
    }, 500); // 减少延迟到500ms

    // 模拟模式不需要Socket事件处理
  }, [user, token, connectionStatus]);

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

    console.log('📋 加载对话列表...', { user: user.username, role: user.role });

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // 直接使用模拟数据，不尝试后端API
      const mockConversations: Conversation[] = [];

      if (user.role === 'patient') {
        // 患者看到多个医生
        mockConversations.push(
          {
            conversation_id: 'conv_patient_doctor_zhang',
            user1_id: user.id,
            user2_id: 'doctor_test',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            other_user: {
              user_id: 'doctor_test',
              username: '张医生',
              role: 'doctor'
            },
            last_message: '您好，有什么可以帮助您的吗？',
            last_message_time: new Date(Date.now() - 1800000).toISOString(), // 30分钟前
            unread_count: 0
          },
          {
            conversation_id: 'conv_patient_doctor_li',
            user1_id: user.id,
            user2_id: 'doctor_li',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            other_user: {
              user_id: 'doctor_li',
              username: '李医生',
              role: 'doctor'
            },
            last_message: '记得按时服药哦',
            last_message_time: new Date(Date.now() - 3600000).toISOString(), // 1小时前
            unread_count: 1
          },
          {
            conversation_id: 'conv_patient_doctor_wang',
            user1_id: user.id,
            user2_id: 'doctor_wang',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            other_user: {
              user_id: 'doctor_wang',
              username: '王医生',
              role: 'doctor'
            },
            last_message: '下周记得来复诊',
            last_message_time: new Date(Date.now() - 7200000).toISOString(), // 2小时前
            unread_count: 0
          }
        );
      } else if (user.role === 'doctor') {
        // 医生看到多个患者
        mockConversations.push(
          {
            conversation_id: 'conv_patient_doctor_zhang',
            user1_id: 'patient_zhang',
            user2_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            other_user: {
              user_id: 'patient_zhang',
              username: '张三',
              role: 'patient'
            },
            last_message: '医生您好，我想咨询一下血压问题',
            last_message_time: new Date(Date.now() - 1800000).toISOString(),
            unread_count: 1
          },
          {
            conversation_id: 'conv_patient_doctor_li_patient',
            user1_id: 'patient_li',
            user2_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            other_user: {
              user_id: 'patient_li',
              username: '李四',
              role: 'patient'
            },
            last_message: '谢谢医生的建议',
            last_message_time: new Date(Date.now() - 3600000).toISOString(),
            unread_count: 0
          }
        );
      }

      console.log('✅ 加载的对话列表:', mockConversations);
      dispatch({ type: 'SET_CONVERSATIONS', payload: mockConversations });

    } catch (error) {
      console.error('Failed to load conversations:', error);
      dispatch({ type: 'SET_ERROR', payload: '加载对话列表失败' });
      toast.error('加载对话列表失败');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, token]);

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
        
        // 直接从状态中查找对话，避免重新加载触发循环
        const conversation = state.conversations.find(c => c.conversation_id === conversationId);
        console.log('🎯 Found conversation:', conversation);

        if (conversation) {
          console.log('✅ Setting current conversation:', conversation);
          dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation });
          dispatch({ type: 'CLEAR_UNREAD', payload: conversationId });

          // 从localStorage加载历史消息
          try {
            const savedMessages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
            const conversationMessages = savedMessages.filter((msg: Message) => 
              msg.conversation_id === conversationId
            ).sort((a: Message, b: Message) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            console.log('📥 Loaded messages from localStorage:', conversationMessages.length);
            dispatch({ type: 'SET_MESSAGES', payload: conversationMessages });
          } catch (error) {
            console.warn('Failed to load messages from localStorage:', error);
            dispatch({ type: 'SET_MESSAGES', payload: [] });
          }

          // 加入对话房间
          if (socketRef.current) {
            socketRef.current.emit('joinConversation', { conversationId });
          }
        } else {
          console.error('❌ Conversation not found:', conversationId);
          console.error('Available conversation IDs:', state.conversations.map(c => c.conversation_id));
          dispatch({ type: 'SET_ERROR', payload: '对话不存在' });
        }
      } catch (error) {
        console.error('Failed to select conversation:', error);
        dispatch({ type: 'SET_ERROR', payload: '加载对话失败' });
        toast.error('加载对话失败');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [user, token, API_BASE_URL]
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

        // 创建新消息
        const newMessage: Message = {
          message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

        // 添加到本地状态
        dispatch({ type: 'ADD_MESSAGE', payload: newMessage });

        // 保存到localStorage实现跨页面同步
        try {
          const existingMessages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
          const updatedMessages = [...existingMessages, newMessage];
          localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
          
          // 触发storage事件，通知其他页面
          window.dispatchEvent(new CustomEvent('chatMessageAdded', { detail: newMessage }));
        } catch (error) {
          console.warn('Failed to save message to localStorage:', error);
        }

        // 更新会话预览信息
        if (state.currentConversation) {
          const updatedConv: Conversation = {
            ...state.currentConversation,
            last_message: newMessage.content,
            last_message_time: newMessage.timestamp,
          };
          dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConv });
        }

        // 模拟自动回复（用于演示双向聊天）
        if (user.role === 'patient') {
          setTimeout(() => {
            const autoReply: Message = {
              message_id: `msg_${Date.now()}_auto_${Math.random().toString(36).substr(2, 9)}`,
              conversation_id: state.currentConversation?.conversation_id || 'conv_patient_doctor',
              sender_id: 'doctor_test',
              content: getDoctorAutoReply(content.trim()),
              message_type: 'text',
              is_read: false,
              timestamp: new Date().toISOString(),
              sender: {
                user_id: 'doctor_test',
                username: '张医生',
                role: 'doctor'
              }
            };
            dispatch({ type: 'ADD_MESSAGE', payload: autoReply });
            
            // 保存自动回复到localStorage
            try {
              const existingMessages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
              const updatedMessages = [...existingMessages, autoReply];
              localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
              window.dispatchEvent(new CustomEvent('chatMessageAdded', { detail: autoReply }));
            } catch (error) {
              console.warn('Failed to save auto reply to localStorage:', error);
            }
          }, 2000 + Math.random() * 3000); // 2-5秒随机延迟
        } else if (user.role === 'doctor') {
          // 医生发送消息，模拟患者回复
          setTimeout(() => {
            const autoReply: Message = {
              message_id: `msg_${Date.now()}_auto_${Math.random().toString(36).substr(2, 9)}`,
              conversation_id: state.currentConversation?.conversation_id || 'conv_patient_doctor',
              sender_id: 'patient_zhang',
              content: getPatientAutoReply(content.trim()),
              message_type: 'text',
              is_read: false,
              timestamp: new Date().toISOString(),
              sender: {
                user_id: 'patient_zhang',
                username: '张三',
                role: 'patient'
              }
            };
            dispatch({ type: 'ADD_MESSAGE', payload: autoReply });
            
            try {
              const existingMessages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
              const updatedMessages = [...existingMessages, autoReply];
              localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
              window.dispatchEvent(new CustomEvent('chatMessageAdded', { detail: autoReply }));
            } catch (error) {
              console.warn('Failed to save auto reply to localStorage:', error);
            }
          }, 1500 + Math.random() * 2500);
        }

        toast.success('消息发送成功');

        if (socketRef.current && socketRef.current.connected) {
          // 如果Socket连接可用，也通过Socket发送
          socketRef.current.emit('sendMessage', messageData);
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

  // 监听跨页面消息同步
  useEffect(() => {
    const handleChatMessageAdded = (event: CustomEvent) => {
      const newMessage = event.detail;
      console.log('📨 Received cross-page message:', newMessage);
      
      // 只有当消息不是当前用户发送的才添加（避免重复）
      if (newMessage.sender_id !== user?.id && state.currentConversation?.conversation_id === newMessage.conversation_id) {
        dispatch({ type: 'ADD_MESSAGE', payload: newMessage });
      }
    };

    window.addEventListener('chatMessageAdded', handleChatMessageAdded as EventListener);

    return () => {
      window.removeEventListener('chatMessageAdded', handleChatMessageAdded as EventListener);
    };
  }, [user, state.currentConversation]);

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
