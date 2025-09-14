-- 聊天功能数据库表结构
-- 创建时间: 2025-01-17
-- 描述: 为患者聊天功能创建必要的数据库表

-- 1. 对话表 (conversations)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    type VARCHAR(50) NOT NULL DEFAULT 'direct', -- 'direct', 'group'
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

-- 2. 对话参与者表 (conversation_participants)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(conversation_id, user_id)
);

-- 3. 消息表 (messages)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'file', 'image', 'system'
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

-- 4. 消息附件表 (message_attachments)
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 5. 用户在线状态表 (user_online_status)
CREATE TABLE IF NOT EXISTS user_online_status (
    user_id UUID PRIMARY KEY,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    socket_id VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX idx_user_online_status_is_online ON user_online_status(is_online);

-- MySQL使用ON UPDATE CURRENT_TIMESTAMP自动更新时间戳，无需触发器

-- MySQL不支持RLS，权限控制将在应用层实现

-- 创建一些有用的视图

-- 对话列表视图（包含最新消息信息）
CREATE VIEW conversation_list AS
SELECT 
    c.id,
    c.title,
    c.type,
    c.created_by,
    c.created_at,
    c.updated_at,
    c.is_active,
    c.metadata,
    m.content as last_message_content,
    m.created_at as last_message_time,
    m.sender_id as last_message_sender_id,
    (
        SELECT COUNT(*) FROM messages 
        WHERE conversation_id = c.id 
        AND created_at > cp.last_read_at
        AND sender_id != cp.user_id
        AND is_deleted = false
    ) as unread_count
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN (
    SELECT 
        conversation_id,
        content, 
        created_at, 
        sender_id,
        ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
    FROM messages 
    WHERE is_deleted = false
) m ON c.id = m.conversation_id AND m.rn = 1
WHERE c.is_active = true AND cp.is_active = true;

-- 插入一些初始数据（可选）
-- 这里可以添加一些系统默认的对话或用户