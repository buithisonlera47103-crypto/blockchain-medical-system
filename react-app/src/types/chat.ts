/**
 * 聊天系统相关的TypeScript类型定义
 */

// 用户信息
export interface User {
  userId: string;
  username: string;
  role: 'super_admin' | 'hospital_admin' | 'doctor' | 'patient';
  email?: string;
  avatar?: string;
}

// 对话信息
export interface Conversation {
  conversation_id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_user: {
    user_id: string;
    username: string;
    role: string;
    avatar?: string;
  };
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

// 消息信息
export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  is_read: boolean;
  timestamp: string;
  sender: {
    user_id: string;
    username: string;
    role: string;
    avatar?: string;
  };
}

// 创建消息请求
export interface CreateMessageRequest {
  recipientId: string;
  content: string;
  messageType?: 'text' | 'file' | 'system';
}

// 创建消息响应
export interface CreateMessageResponse {
  messageId: string;
  timestamp: number;
  conversationId: string;
}

// 聊天通知
export interface ChatNotification {
  type: 'new_message' | 'user_online' | 'user_offline' | 'typing' | 'message_read';
  title: string;
  message: string;
  conversationId?: string;
  senderId?: string;
  timestamp: number;
}

// 正在输入指示器
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
  timestamp: number;
}

// Socket用户信息
export interface SocketUser {
  userId: string;
  username: string;
  role: string;
  socketId: string;
  lastSeen: Date;
}

// 在线状态
export interface OnlineStatus {
  [userId: string]: boolean;
}

// Socket事件类型
export interface ServerToClientEvents {
  connected: (data: { message: string; userId: string; timestamp: number }) => void;
  userOnline: (data: { userId: string; username: string; role: string; timestamp: number }) => void;
  userOffline: (data: { userId: string; username: string; timestamp: number }) => void;
  joinedConversation: (data: { conversationId: string; timestamp: number }) => void;
  leftConversation: (data: { conversationId: string; timestamp: number }) => void;
  messageSent: (data: { messageId: string; conversationId: string; timestamp: number }) => void;
  newMessage: (data: {
    messageId: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: string;
    timestamp: number;
    sender: { userId: string; username: string; role: string };
  }) => void;
  userTyping: (data: TypingIndicator) => void;
  messageRead: (data: {
    messageId: string;
    conversationId: string;
    readBy: string;
    timestamp: number;
  }) => void;
  messageMarkedAsRead: (data: {
    messageId: string;
    conversationId: string;
    timestamp: number;
  }) => void;
  onlineStatus: (data: { status: OnlineStatus; timestamp: number }) => void;
  notification: (data: ChatNotification) => void;
  forceDisconnect: (data: { reason: string; timestamp: number }) => void;
  error: (data: { message: string; code: string; timestamp: number }) => void;
}

export interface ClientToServerEvents {
  joinConversation: (data: { conversationId: string }) => void;
  leaveConversation: (data: { conversationId: string }) => void;
  sendMessage: (data: CreateMessageRequest & { conversationId?: string }) => void;
  typing: (data: { conversationId: string }) => void;
  stopTyping: (data: { conversationId: string }) => void;
  markAsRead: (data: { messageId: string; conversationId: string }) => void;
  getOnlineStatus: (data: { userIds: string[] }) => void;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
  timestamp: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  limit: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 聊天统计信息
export interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  messagesPerDay: number;
  averageResponseTime: number;
}

// 聊天上下文状态
export interface ChatContextState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  onlineUsers: SocketUser[];
  typingUsers: { [conversationId: string]: string[] };
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

// 聊天上下文动作
export interface ChatContextActions {
  // 连接管理
  connect: () => void;
  disconnect: () => void;

  // 对话管理
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  createConversation: (recipientId: string) => Promise<Conversation | null>;

  // 消息管理
  sendMessage: (content: string, recipientId?: string) => Promise<void>;
  loadMessages: (conversationId: string, page?: number) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;

  // 实时功能
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;

  // 在线状态
  checkOnlineStatus: (userIds: string[]) => void;

  // 通知
  clearNotifications: () => void;
}

// 聊天Hook返回类型
export interface UseChatReturn extends ChatContextState, ChatContextActions {}

// 消息组件Props
export interface MessageProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onMarkAsRead?: (messageId: string) => void;
}

// 对话列表项Props
export interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: (conversationId: string) => void;
  onlineStatus?: boolean;
}

// 聊天输入框Props
export interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  placeholder?: string;
}

// 通知栏Props
export interface NotificationBarProps {
  notifications: ChatNotification[];
  onDismiss: (index: number) => void;
  onDismissAll: () => void;
}

// 在线用户指示器Props
export interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 正在输入指示器Props
export interface TypingIndicatorProps {
  typingUsers: string[];
  className?: string;
}

// 聊天面板Props
export interface ChatPanelProps {
  className?: string;
  height?: string;
  showHeader?: boolean;
  showOnlineUsers?: boolean;
}

// 对话列表Props
export interface ConversationListProps {
  className?: string;
  height?: string;
  showSearch?: boolean;
  onConversationSelect?: (conversationId: string) => void;
}

// 消息列表Props
export interface MessageListProps {
  conversationId: string;
  className?: string;
  height?: string;
  autoScroll?: boolean;
}

// 聊天设置
export interface ChatSettings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showOnlineStatus: boolean;
  autoMarkAsRead: boolean;
  messagePreview: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// 文件上传相关
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

// 错误类型
export interface ChatError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// 连接状态
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

// 消息状态
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// 用户状态
export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

// 聊天主题
export type ChatTheme = 'light' | 'dark' | 'blue' | 'green' | 'purple';

// 消息类型
export type MessageType = 'text' | 'file' | 'image' | 'system' | 'notification';

// 通知类型
export type NotificationType =
  | 'new_message'
  | 'user_online'
  | 'user_offline'
  | 'typing'
  | 'message_read'
  | 'system';
