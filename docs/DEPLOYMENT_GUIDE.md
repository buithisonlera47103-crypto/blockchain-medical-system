# 区块链电子病历系统部署指南

## 📋 目录

1. [系统要求](#系统要求)
2. [快速开始](#快速开始)
3. [详细部署步骤](#详细部署步骤)
4. [配置说明](#配置说明)
5. [监控和维护](#监控和维护)
6. [故障排除](#故障排除)
7. [安全配置](#安全配置)

## 🎯 系统要求

### 硬件要求

| 组件 | 最低配置  | 推荐配置   |
| ---- | --------- | ---------- |
| CPU  | 4核       | 8核+       |
| 内存 | 8GB       | 16GB+      |
| 存储 | 100GB SSD | 500GB+ SSD |
| 网络 | 100Mbps   | 1Gbps+     |

### 软件要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18.0+ (开发环境)
- **MySQL**: 8.0+
- **Redis**: 6.2+

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-org/blockchain-emr-system.git
cd blockchain-emr-system
```

### 2. 一键启动

```bash
# 给启动脚本执行权限
chmod +x scripts/start-complete-system.sh

# 启动完整系统
./scripts/start-complete-system.sh
```

### 3. 验证部署

```bash
# 检查所有服务状态
docker-compose ps

# 验证API可用性
curl http://localhost:3000/health

# 访问前端界面
open http://localhost:3001
```

## 📋 详细部署步骤

### 步骤1: 环境准备

#### 1.1 安装Docker和Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 1.2 系统优化

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化内核参数
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 步骤2: 配置文件设置

#### 2.1 复制环境配置

```bash
# 复制配置模板
cp config/complete-system.env .env

# 编辑配置文件
nano .env
```

#### 2.2 关键配置项

```bash
# 数据库配置
DB_HOST=mysql
DB_PASSWORD=your_secure_database_password

# JWT密钥 (生成强密钥)
JWT_SECRET=$(openssl rand -base64 32)

# 加密主密钥 (256位)
MASTER_KEY=$(openssl rand -base64 32)

# Redis密码
REDIS_PASSWORD=your_secure_redis_password
```

### 步骤3: 数据库初始化

#### 3.1 启动数据库服务

```bash
docker-compose up -d mysql redis
```

#### 3.2 创建数据库和表

```bash
# 等待MySQL启动
sleep 30

# 执行数据库初始化脚本
docker-compose exec mysql mysql -uroot -p$DB_PASSWORD < backend-app/src/database/medical_records_schema.sql
docker-compose exec mysql mysql -uroot -p$DB_PASSWORD < backend-app/src/database/envelope_keys_schema.sql
docker-compose exec mysql mysql -uroot -p$DB_PASSWORD < backend-app/src/database/constraints_and_indexes.sql
```

### 步骤4: 区块链网络部署

#### 4.1 启动Hyperledger Fabric网络

```bash
# 启动区块链网络
cd fabric-network
./network.sh up createChannel -c emr-channel -ca

# 部署链码
./network.sh deployCC -ccn emr-contract -ccp ../chaincode/emr -ccl go
```

#### 4.2 验证区块链网络

```bash
# 检查peer节点状态
docker-compose -f fabric-network/docker-compose.yaml ps

# 测试链码调用
peer chaincode invoke -o orderer.emr.com:7050 \
  -C emr-channel -n emr-contract \
  -c '{"function":"TestConnection","Args":[]}'
```

### 步骤5: IPFS集群设置

#### 5.1 启动IPFS节点

```bash
docker-compose up -d ipfs
```

#### 5.2 配置IPFS集群

```bash
# 获取IPFS节点ID
IPFS_NODE_ID=$(docker-compose exec ipfs ipfs id -f '<id>')

# 配置集群设置
docker-compose exec ipfs ipfs config --json Experimental.FilestoreEnabled true
docker-compose exec ipfs ipfs config --json Experimental.Libp2pStreamMounting true
```

### 步骤6: 应用服务部署

#### 6.1 启动后端服务

```bash
# 构建后端镜像
docker-compose build backend

# 启动后端服务
docker-compose up -d backend
```

#### 6.2 启动前端服务

```bash
# 构建前端镜像
docker-compose build frontend

# 启动前端服务
docker-compose up -d frontend
```

### 步骤7: 启动监控服务

```bash
# 启动监控栈
docker-compose up -d prometheus grafana jaeger
```

## ⚙️ 配置说明

### 网络配置

```yaml
# docker-compose.yml 网络配置
networks:
  emr-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 存储卷配置

```yaml
volumes:
  mysql_data:
    driver: local
  ipfs_data:
    driver: local
  fabric_data:
    driver: local
  prometheus_data:
    driver: local
```

### 端口映射

| 服务       | 内部端口 | 外部端口 | 描述            |
| ---------- | -------- | -------- | --------------- |
| Frontend   | 3001     | 3001     | React前端应用   |
| Backend    | 3000     | 3000     | Node.js API服务 |
| MySQL      | 3306     | 3306     | 数据库服务      |
| Redis      | 6379     | 6379     | 缓存服务        |
| IPFS       | 5001     | 5001     | IPFS API        |
| Prometheus | 9090     | 9090     | 监控服务        |
| Grafana    | 3000     | 3002     | 监控面板        |

## 📊 监控和维护

### 健康检查

```bash
# API健康检查
curl http://localhost:3000/health

# 数据库连接检查
curl http://localhost:3000/health/database

# 区块链连接检查
curl http://localhost:3000/health/blockchain

# IPFS连接检查
curl http://localhost:3000/health/ipfs
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# 查看最近100行日志
docker-compose logs --tail=100 backend
```

### 性能监控

访问监控面板:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3002 (admin/admin)
- **Jaeger**: http://localhost:16686

### 备份策略

#### 数据库备份

```bash
# 创建数据库备份
docker-compose exec mysql mysqldump -uroot -p$DB_PASSWORD emr_blockchain > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker-compose exec -T mysql mysql -uroot -p$DB_PASSWORD emr_blockchain < backup_file.sql
```

#### IPFS数据备份

```bash
# 导出IPFS数据
docker-compose exec ipfs ipfs repo fsck
docker-compose exec ipfs tar czf /export/ipfs_backup_$(date +%Y%m%d).tar.gz /data/ipfs
```

#### 区块链数据备份

```bash
# 备份账本数据
cp -r fabric-network/organizations/ backup/organizations_$(date +%Y%m%d)/
cp -r fabric-network/channel-artifacts/ backup/channel-artifacts_$(date +%Y%m%d)/
```

## 🔐 安全配置

### SSL/TLS配置

#### 1. 生成SSL证书

```bash
# 创建证书目录
mkdir -p ssl/{certs,private}

# 生成自签名证书（开发环境）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private/emr.key \
  -out ssl/certs/emr.crt \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=EMR System/CN=emr.local"
```

#### 2. 配置Nginx SSL

```nginx
# nginx/ssl.conf
server {
    listen 443 ssl http2;
    server_name emr.local;

    ssl_certificate /etc/ssl/certs/emr.crt;
    ssl_certificate_key /etc/ssl/private/emr.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 防火墙配置

```bash
# 配置UFW防火墙
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # API (可选，生产环境建议通过代理访问)

# 启用防火墙
sudo ufw enable
```

### 密钥管理

```bash
# 使用外部密钥管理服务 (推荐)
export KMS_MODE=aws_kms
export AWS_KMS_KEY_ID=arn:aws:kms:region:account:key/key-id

# 或使用本地硬件安全模块
export KMS_MODE=hsm
export HSM_SLOT_ID=0
export HSM_PIN=your_hsm_pin
```

## 🛠️ 故障排除

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查MySQL容器状态
docker-compose ps mysql

# 查看MySQL日志
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -uroot -p$DB_PASSWORD -e "SELECT 1"
```

#### 2. 区块链网络连接失败

```bash
# 检查peer节点状态
docker-compose exec peer0.hospital1.emr.com peer node status

# 重启区块链网络
cd fabric-network
./network.sh down
./network.sh up createChannel -c emr-channel
```

#### 3. IPFS节点无法启动

```bash
# 检查IPFS配置
docker-compose exec ipfs ipfs config show

# 重新初始化IPFS
docker-compose down ipfs
docker volume rm blockchain-project_ipfs_data
docker-compose up -d ipfs
```

#### 4. 内存不足

```bash
# 增加swap空间
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 日志分析

```bash
# 检查应用错误日志
docker-compose exec backend tail -f /app/logs/error.log

# 检查系统资源使用
docker stats

# 检查磁盘空间
df -h
docker system df
```

### 性能调优

```bash
# 清理未使用的Docker资源
docker system prune -a

# 优化MySQL配置
echo "innodb_buffer_pool_size = 2G" >> mysql/conf.d/mysql.cnf
echo "max_connections = 500" >> mysql/conf.d/mysql.cnf

# 优化Redis配置
echo "maxmemory 1gb" >> redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> redis/redis.conf
```

## 📝 维护计划

### 日常维护

- **每日**: 检查系统状态、监控告警
- **每周**: 备份数据库、清理日志
- **每月**: 更新安全补丁、性能优化
- **每季**: 容量规划、灾难恢复演练

### 升级流程

```bash
# 1. 备份当前系统
./scripts/backup-system.sh

# 2. 拉取最新代码
git pull origin main

# 3. 构建新镜像
docker-compose build

# 4. 滚动更新
docker-compose up -d --no-deps backend
docker-compose up -d --no-deps frontend

# 5. 验证升级
./scripts/verify-deployment.sh
```

---

## 📞 技术支持

如遇到部署问题，请联系技术支持团队：

- **邮箱**: support@emr-system.com
- **文档**: https://docs.emr-system.com
- **GitHub Issues**: https://github.com/your-org/blockchain-emr-system/issues

---

**注意**: 本部署指南适用于生产环境。开发环境部署请参考
[开发环境搭建指南](./DEVELOPMENT_SETUP.md)。
