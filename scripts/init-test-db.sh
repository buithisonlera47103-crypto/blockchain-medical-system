#!/bin/bash

# 测试数据库初始化脚本

echo "🗄️ 初始化测试数据库..."

# 数据库配置
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-blockchain_emr_test}
DB_USER=${DB_USER:-test_user}
DB_PASSWORD=${DB_PASSWORD:-test_password}
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD:-root}

# 检查MySQL是否运行
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL客户端未安装"
    exit 1
fi

# 测试MySQL连接
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -uroot -p"$DB_ROOT_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    echo "❌ 无法连接到MySQL服务器"
    echo "请确保MySQL服务正在运行并且root密码正确"
    exit 1
fi

echo "✅ MySQL连接成功"

# 创建测试数据库和用户
mysql -h"$DB_HOST" -P"$DB_PORT" -uroot -p"$DB_ROOT_PASSWORD" << EOF
-- 创建测试数据库
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建测试用户
DROP USER IF EXISTS '$DB_USER'@'%';
CREATE USER '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;

-- 切换到测试数据库
USE $DB_NAME;

-- 创建基本测试表
CREATE TABLE IF NOT EXISTS test_connection (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_connection (id) VALUES (1);
EOF

echo "✅ 测试数据库初始化完成"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo "  主机: $DB_HOST:$DB_PORT"
