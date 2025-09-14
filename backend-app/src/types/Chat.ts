export interface ChatMessage {
  id?: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  timestamp: Date;
  is_read: boolean;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatRoom {
  id?: string;
  participants: string[];
  created_at: Date;
  last_message?: ChatMessage;
  is_group: boolean;
  room_name?: string;
}

// Request payload to create a chat message (used by routes)
export interface CreateMessageRequest {
  recipientId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, unknown>;
}

// Simple pagination params (used by routes)
export interface PaginationParams {
  page: number;
  limit: number;
}
