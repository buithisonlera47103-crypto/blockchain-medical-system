# EMR区块链系统部署指南

## 📋 目录

### 📚 系统文档
- 📖 [用户手册](../backend-app/docs/USER_GUIDE.md) - 系统安装、使用和常见问题
- 🔧 [开发者文档](../backend-app/docs/DEVELOPER_GUIDE.md) - API参考、架构说明和开发指南

### 🚀 部署指南
- [系统概述](#系统概述)
- [架构设计](#架构设计)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [Docker部署](#docker部署)
- [Kubernetes部署](#kubernetes部署)
- [监控配置](#监控配置)
- [SSL证书配置](#ssl证书配置)
- [性能测试](#性能测试)
- [故障排除](#故障排除)
- [维护指南](#维护指南)
- [API文档](#api文档)
- [常见问题](#常见问题)

## 🏥 系统概述

EMR区块链系统是一个基于Hyperledger Fabric的电子病历共享平台，提供安全、透明、不可篡改的医疗数据管理服务。

### 核心特性

- **区块链技术**: 基于Hyperledger Fabric，确保数据不可篡改
- **分布式存储**: 使用IPFS进行大文件存储
- **权限控制**: 细粒度的访问权限管理
- **数据加密**: 端到端加密保护患者隐私
- **审计追踪**: 完整的操作日志记录
- **高可用性**: 支持多节点部署和自动扩缩容

### 技术栈

- **前端**: React 18 + TypeScript + Ant Design
- **后端**: Node.js + Express + TypeScript
- **区块链**: Hyperledger Fabric 2.4
- **数据库**: MySQL 8.0
- **存储**: IPFS
- **缓存**: Redis
- **容器化**: Docker + Kubernetes
- **反向代理**: Nginx
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack

## 🏗️ 架构设计

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户界面      │    │   移动应用      │    │   第三方系统    │
│   (React)       │    │   (React Native)│    │   (API)         │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Nginx 反向代理       │
                    │    (SSL终止/负载均衡)     │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      后端服务集群         │
                    │   (Express + TypeScript)  │
                    └─────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                       │
┌───────┴───────┐    ┌─────────┴─────────┐    ┌───────┴───────┐
│   MySQL 集群   │    │ Hyperledger Fabric │    │   IPFS 集群   │
│  (主从复制)    │    │    (区块链网络)    │    │  (分布式存储) │
└───────────────┘    └───────────────────┘    └───────────────┘
        │                       │                       │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      监控和日志系统       │
                    │ (Prometheus + Grafana +   │
                    │      ELK Stack)          │
                    └───────────────────────────┘
```

## 🔧 环境要求

### 硬件要求

#### 开发环境
- **CPU**: 4核心以上
- **内存**: 8GB以上
- **存储**: 50GB可用空间
- **网络**: 稳定的互联网连接

#### 生产环境
- **CPU**: 8核心以上（每个节点）
- **内存**: 16GB以上（每个节点）
- **存储**: 200GB SSD（每个节点）
- **网络**: 千兆网络，低延迟

### 软件要求

#### 必需软件
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Kubernetes**: 1.24+ (生产环境)
- **kubectl**: 与Kubernetes版本匹配
- **Node.js**: 18.0+
- **npm**: 8.0+

#### 可选软件
- **Helm**: 3.8+ (Kubernetes包管理)
- **k6**: 性能测试工具
- **jq**: JSON处理工具

### 网络要求

#### 端口配置
- **80**: HTTP (重定向到HTTPS)
- **443**: HTTPS
- **3001**: 后端服务 (内部)
- **3004**: 前端服务 (内部)
- **3306**: MySQL (内部)
- **5001**: IPFS API (内部)
- **8080**: IPFS Gateway (内部)
- **6379**: Redis (内部)
- **9090**: Prometheus (监控)
- **3000**: Grafana (监控)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd blockchain-project
```

### 2. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

### 3. 选择部署方式

#### Docker部署（推荐用于开发）
```bash
./deployment/deploy.sh --mode docker --domain localhost
```

#### Kubernetes部署（推荐用于生产）
```bash
./deployment/deploy.sh --mode kubernetes --domain emr.example.com
```

### 4. 验证部署

```bash
./deployment/scripts/verify-deployment.sh --mode kubernetes --domain emr.example.com
```

## 🐳 Docker部署

### 本地开发环境

#### 1. 构建镜像

```bash
# 构建后端镜像
cd backend-app
docker build -t emr-backend:latest .

# 构建前端镜像
cd ../react-app
docker build -t emr-frontend:latest .
```

#### 2. 启动服务

```bash
# 使用Docker Compose启动所有服务
cd deployment
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 3. 初始化数据

```bash
# 等待MySQL启动完成
docker-compose exec mysql mysql -u root -ppassword -e "SHOW DATABASES;"

# 数据库会自动初始化，检查表结构
docker-compose exec mysql mysql -u root -ppassword emr_blockchain -e "SHOW TABLES;"
```

#### 4. 访问应用

- **前端**: http://localhost:3004
- **后端API**: http://localhost:3001
- **API文档**: http://localhost:3001/api-docs
- **健康检查**: http://localhost:3001/health

### 生产环境配置

#### 1. 环境变量配置

```bash
# 生产环境变量
cat > .env.production << EOF
# 数据库配置
MYSQL_HOST=mysql-service
MYSQL_PORT=3306
MYSQL_DATABASE=emr_blockchain
MYSQL_USER=emr_user
MYSQL_PASSWORD=your_secure_password

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# IPFS配置
IPFS_HOST=ipfs-service
IPFS_PORT=5001
IPFS_PROTOCOL=http

# Redis配置
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 应用配置
NODE_ENV=production
PORT=3001
FRONTEND_PORT=3004
DOMAIN=emr.example.com

# 区块链配置
FABRIC_NETWORK_PATH=/app/fabric
FABRIC_WALLET_PATH=/app/wallet
FABRIC_CONNECTION_PROFILE=connection-profile.json

# 日志配置
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# 安全配置
CORS_ORIGIN=https://emr.example.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

#### 2. 生产环境Docker Compose

```bash
# 使用生产配置启动
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## ☸️ Kubernetes部署

### 前置条件

#### 1. 安装kubectl

```bash
# Ubuntu/Debian
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# 验证安装
kubectl version --client
```

#### 2. 配置集群访问

```bash
# 配置kubeconfig
export KUBECONFIG=/path/to/your/kubeconfig

# 验证集群连接
kubectl cluster-info
kubectl get nodes
```

### 部署步骤

#### 1. 创建命名空间和基础资源

```bash
# 应用命名空间配置
kubectl apply -f k8s/namespace.yaml

# 创建Secrets和ConfigMaps
kubectl apply -f k8s/secrets.yaml

# 验证资源创建
kubectl get all -n emr-namespace
```

#### 2. 部署数据库服务

```bash
# 部署MySQL
kubectl apply -f k8s/mysql-deployment.yaml

# 等待MySQL就绪
kubectl wait --for=condition=ready pod -l component=mysql -n emr-namespace --timeout=300s

# 验证数据库连接
kubectl exec -n emr-namespace deployment/mysql -- mysql -u root -ppassword -e "SELECT 1"
```

#### 3. 部署IPFS服务

```bash
# 部署IPFS
kubectl apply -f k8s/ipfs-deployment.yaml

# 等待IPFS就绪
kubectl wait --for=condition=ready pod -l component=ipfs -n emr-namespace --timeout=300s

# 验证IPFS节点
kubectl exec -n emr-namespace deployment/ipfs -- ipfs id
```

#### 4. 部署应用服务

```bash
# 部署后端服务
kubectl apply -f k8s/backend-deployment.yaml

# 部署前端服务
kubectl apply -f k8s/frontend-deployment.yaml

# 等待应用就绪
kubectl wait --for=condition=ready pod -l component=backend -n emr-namespace --timeout=300s
kubectl wait --for=condition=ready pod -l component=frontend -n emr-namespace --timeout=300s
```

#### 5. 配置Ingress

```bash
# 安装Nginx Ingress Controller (如果未安装)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# 部署Ingress配置
kubectl apply -f k8s/ingress.yaml

# 检查Ingress状态
kubectl get ingress -n emr-namespace
kubectl describe ingress emr-ingress -n emr-namespace
```

#### 6. 验证部署

```bash
# 检查所有资源状态
kubectl get all -n emr-namespace

# 检查Pod日志
kubectl logs -l component=backend -n emr-namespace --tail=50
kubectl logs -l component=frontend -n emr-namespace --tail=50

# 运行健康检查
./scripts/healthcheck.js
```

### 高级配置

#### 1. 自动扩缩容

```bash
# HPA已在deployment中配置，检查状态
kubectl get hpa -n emr-namespace

# 查看扩缩容历史
kubectl describe hpa backend-hpa -n emr-namespace
kubectl describe hpa frontend-hpa -n emr-namespace
```

#### 2. 滚动更新

```bash
# 更新后端镜像
kubectl set image deployment/backend backend=emr-backend:v2.0.0 -n emr-namespace

# 查看更新状态
kubectl rollout status deployment/backend -n emr-namespace

# 回滚到上一版本
kubectl rollout undo deployment/backend -n emr-namespace
```

#### 3. 数据备份

```bash
# 创建MySQL备份
kubectl exec -n emr-namespace deployment/mysql -- mysqldump -u root -ppassword emr_blockchain > backup-$(date +%Y%m%d).sql

# 恢复数据库
kubectl exec -i -n emr-namespace deployment/mysql -- mysql -u root -ppassword emr_blockchain < backup-20231201.sql
```

## 📊 监控配置

### Prometheus + Grafana

#### 1. 部署监控栈

```bash
# 使用Helm安装Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring/prometheus-values.yaml
```

#### 2. 配置自定义监控

```bash
# 应用Prometheus配置
kubectl apply -f monitoring/prometheus.yml

# 应用告警规则
kubectl apply -f monitoring/alert_rules.yml

# 导入Grafana仪表板
kubectl create configmap grafana-dashboard \
  --from-file=monitoring/grafana-dashboard.json \
  -n monitoring
```

#### 3. 访问监控界面

```bash
# 获取Grafana密码
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# 端口转发访问Grafana
kubectl port-forward --namespace monitoring svc/prometheus-grafana 3000:80

# 访问 http://localhost:3000
# 用户名: admin
# 密码: 上面获取的密码
```

### 日志收集

#### 1. ELK Stack部署

```bash
# 部署Elasticsearch
kubectl apply -f monitoring/elasticsearch.yaml

# 部署Logstash
kubectl apply -f monitoring/logstash.yaml

# 部署Kibana
kubectl apply -f monitoring/kibana.yaml

# 部署Filebeat
kubectl apply -f monitoring/filebeat.yaml
```

#### 2. 日志查看

```bash
# 访问Kibana
kubectl port-forward --namespace monitoring svc/kibana 5601:5601

# 访问 http://localhost:5601
```

## 🔒 SSL证书配置

### Let's Encrypt自动证书

#### 1. 安装cert-manager

```bash
# 安装cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 验证安装
kubectl get pods --namespace cert-manager
```

#### 2. 配置ClusterIssuer

```bash
# ClusterIssuer已在ingress.yaml中定义
kubectl get clusterissuer

# 检查证书状态
kubectl get certificate -n emr-namespace
kubectl describe certificate emr-tls -n emr-namespace
```

### 手动证书配置

#### 1. 生成证书

```bash
# 使用certbot生成证书
sudo certbot certonly --standalone -d emr.example.com

# 创建TLS Secret
kubectl create secret tls emr-tls \
  --cert=/etc/letsencrypt/live/emr.example.com/fullchain.pem \
  --key=/etc/letsencrypt/live/emr.example.com/privkey.pem \
  -n emr-namespace
```

#### 2. 证书续期

```bash
# 自动续期脚本
cat > /etc/cron.daily/certbot-renew << 'EOF'
#!/bin/bash
certbot renew --quiet
if [ $? -eq 0 ]; then
    kubectl create secret tls emr-tls \
      --cert=/etc/letsencrypt/live/emr.example.com/fullchain.pem \
      --key=/etc/letsencrypt/live/emr.example.com/privkey.pem \
      -n emr-namespace \
      --dry-run=client -o yaml | kubectl apply -f -
fi
EOF

chmod +x /etc/cron.daily/certbot-renew
```

## 🧪 性能测试

### k6负载测试

#### 1. 安装k6

```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### 2. 运行性能测试

```bash
# 基础负载测试
k6 run tests/load-test.js

# 压力测试
k6 run --vus 100 --duration 5m tests/load-test.js

# 生成HTML报告
k6 run --out json=results.json tests/load-test.js
k6-reporter results.json --output results.html
```

#### 3. 性能基准

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 响应时间 | < 200ms | 95%的请求 |
| 吞吐量 | > 1000 RPS | 每秒请求数 |
| 错误率 | < 0.1% | 错误请求比例 |
| CPU使用率 | < 70% | 平均CPU使用率 |
| 内存使用率 | < 80% | 平均内存使用率 |

## 🔧 故障排除

### 常见问题

#### 1. Pod启动失败

```bash
# 查看Pod状态
kubectl get pods -n emr-namespace

# 查看Pod详细信息
kubectl describe pod <pod-name> -n emr-namespace

# 查看Pod日志
kubectl logs <pod-name> -n emr-namespace

# 查看前一个容器的日志
kubectl logs <pod-name> -n emr-namespace --previous
```

#### 2. 服务无法访问

```bash
# 检查Service状态
kubectl get svc -n emr-namespace

# 检查Endpoints
kubectl get endpoints -n emr-namespace

# 测试服务连通性
kubectl run test-pod --image=curlimages/curl -it --rm -- sh
# 在Pod内执行: curl http://backend-service:3001/health
```

#### 3. Ingress问题

```bash
# 检查Ingress状态
kubectl get ingress -n emr-namespace
kubectl describe ingress emr-ingress -n emr-namespace

# 检查Ingress Controller日志
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# 检查DNS解析
nslookup emr.example.com
```

#### 4. 数据库连接问题

```bash
# 检查MySQL Pod状态
kubectl get pods -l component=mysql -n emr-namespace

# 测试数据库连接
kubectl exec -it deployment/mysql -n emr-namespace -- mysql -u root -ppassword

# 检查数据库配置
kubectl exec deployment/mysql -n emr-namespace -- cat /etc/mysql/my.cnf
```

#### 5. IPFS连接问题

```bash
# 检查IPFS节点状态
kubectl exec deployment/ipfs -n emr-namespace -- ipfs id

# 检查IPFS配置
kubectl exec deployment/ipfs -n emr-namespace -- ipfs config show

# 测试IPFS API
kubectl exec deployment/ipfs -n emr-namespace -- curl http://localhost:5001/api/v0/version
```

### 日志分析

#### 1. 应用日志

```bash
# 实时查看后端日志
kubectl logs -f deployment/backend -n emr-namespace

# 查看特定时间段的日志
kubectl logs deployment/backend -n emr-namespace --since=1h

# 搜索错误日志
kubectl logs deployment/backend -n emr-namespace | grep -i error
```

#### 2. 系统日志

```bash
# 查看节点事件
kubectl get events -n emr-namespace --sort-by='.lastTimestamp'

# 查看集群事件
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

### 性能调优

#### 1. 资源优化

```bash
# 查看资源使用情况
kubectl top nodes
kubectl top pods -n emr-namespace

# 调整资源限制
kubectl patch deployment backend -n emr-namespace -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "backend",
          "resources": {
            "requests": {"cpu": "500m", "memory": "1Gi"},
            "limits": {"cpu": "2", "memory": "4Gi"}
          }
        }]
      }
    }
  }
}'
```

#### 2. 数据库优化

```sql
-- 查看慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 分析查询性能
EXPLAIN SELECT * FROM MEDICAL_RECORDS WHERE patient_id = 'P001';

-- 添加索引
CREATE INDEX idx_medical_records_created_at ON MEDICAL_RECORDS(created_at);
CREATE INDEX idx_audit_logs_timestamp ON AUDIT_LOGS(timestamp);
```

## 🛠️ 维护指南

### 定期维护任务

#### 1. 数据备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/$DATE"
mkdir -p "$BACKUP_DIR"

# 备份MySQL数据库
kubectl exec deployment/mysql -n emr-namespace -- mysqldump -u root -ppassword emr_blockchain > "$BACKUP_DIR/mysql_backup.sql"

# 备份IPFS数据
kubectl exec deployment/ipfs -n emr-namespace -- tar czf - /data/ipfs > "$BACKUP_DIR/ipfs_backup.tar.gz"

# 备份Kubernetes配置
kubectl get all -n emr-namespace -o yaml > "$BACKUP_DIR/k8s_config.yaml"

echo "备份完成: $BACKUP_DIR"
EOF

chmod +x backup.sh
```

#### 2. 日志清理

```bash
# 清理旧日志
kubectl exec deployment/backend -n emr-namespace -- find /app/logs -name "*.log" -mtime +7 -delete
kubectl exec deployment/frontend -n emr-namespace -- find /var/log/nginx -name "*.log" -mtime +7 -delete
```

#### 3. 镜像更新

```bash
# 更新镜像脚本
cat > update-images.sh << 'EOF'
#!/bin/bash
VERSION=${1:-latest}

# 更新后端
kubectl set image deployment/backend backend=emr-backend:$VERSION -n emr-namespace
kubectl rollout status deployment/backend -n emr-namespace

# 更新前端
kubectl set image deployment/frontend frontend=emr-frontend:$VERSION -n emr-namespace
kubectl rollout status deployment/frontend -n emr-namespace

echo "镜像更新完成: $VERSION"
EOF

chmod +x update-images.sh
```

### 监控告警

#### 1. 关键指标监控

- **服务可用性**: > 99.9%
- **响应时间**: < 200ms (P95)
- **错误率**: < 0.1%
- **CPU使用率**: < 70%
- **内存使用率**: < 80%
- **磁盘使用率**: < 85%

#### 2. 告警配置

```yaml
# 示例告警规则
groups:
- name: emr-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "高错误率告警"
      description: "错误率超过1%，当前值: {{ $value }}"
```

### 扩容指南

#### 1. 水平扩容

```bash
# 手动扩容
kubectl scale deployment backend --replicas=5 -n emr-namespace
kubectl scale deployment frontend --replicas=5 -n emr-namespace

# 调整HPA配置
kubectl patch hpa backend-hpa -n emr-namespace -p '{
  "spec": {
    "minReplicas": 3,
    "maxReplicas": 15
  }
}'
```

#### 2. 垂直扩容

```bash
# 增加资源限制
kubectl patch deployment backend -n emr-namespace -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "backend",
          "resources": {
            "requests": {"cpu": "1", "memory": "2Gi"},
            "limits": {"cpu": "4", "memory": "8Gi"}
          }
        }]
      }
    }
  }
}'
```

#### 3. 集群扩容

```bash
# 添加新节点后，验证节点状态
kubectl get nodes
kubectl describe node <new-node-name>

# 重新平衡Pod分布
kubectl delete pods -l component=backend -n emr-namespace
kubectl delete pods -l component=frontend -n emr-namespace
```

## 📚 API文档

### 认证接口

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "doctor1",
  "password": "password123",
  "email": "doctor1@hospital.com",
  "role": "doctor",
  "department": "cardiology"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "doctor1",
  "password": "password123"
}
```

### 医疗记录接口

#### 创建医疗记录
```http
POST /api/medical-records
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "patientId": "P001",
  "diagnosis": "高血压",
  "treatment": "降压药物治疗",
  "notes": "患者血压控制良好",
  "attachments": ["file1.pdf", "image1.jpg"]
}
```

#### 查询医疗记录
```http
GET /api/medical-records?patientId=P001&page=1&limit=10
Authorization: Bearer <jwt-token>
```

### 区块链接口

#### 查询区块链状态
```http
GET /api/blockchain/status
Authorization: Bearer <jwt-token>
```

#### 验证记录完整性
```http
POST /api/blockchain/verify
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "recordId": "R001",
  "hash": "0x1234567890abcdef"
}
```

### 文件存储接口

#### 上传文件
```http
POST /api/files/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

file: <binary-data>
patientId: P001
description: X光片
```

#### 下载文件
```http
GET /api/files/:fileHash
Authorization: Bearer <jwt-token>
```

## ❓ 常见问题

### Q1: 如何重置管理员密码？

```bash
# 连接到数据库
kubectl exec -it deployment/mysql -n emr-namespace -- mysql -u root -ppassword emr_blockchain

# 重置密码
UPDATE USERS SET password_hash = SHA2('new_password', 256) WHERE username = 'admin';
```

### Q2: 如何备份和恢复区块链数据？

```bash
# 备份Fabric数据
kubectl exec deployment/backend -n emr-namespace -- tar czf /tmp/fabric-backup.tar.gz /app/fabric
kubectl cp emr-namespace/backend-pod:/tmp/fabric-backup.tar.gz ./fabric-backup.tar.gz

# 恢复Fabric数据
kubectl cp ./fabric-backup.tar.gz emr-namespace/backend-pod:/tmp/fabric-backup.tar.gz
kubectl exec deployment/backend -n emr-namespace -- tar xzf /tmp/fabric-backup.tar.gz -C /app
```

### Q3: 如何查看区块链网络状态？

```bash
# 查看Fabric网络状态
kubectl exec deployment/backend -n emr-namespace -- peer channel list
kubectl exec deployment/backend -n emr-namespace -- peer chaincode list --installed
```

### Q4: 如何处理IPFS存储空间不足？

```bash
# 清理IPFS垃圾数据
kubectl exec deployment/ipfs -n emr-namespace -- ipfs repo gc

# 扩展存储卷
kubectl patch pvc ipfs-storage -n emr-namespace -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

### Q5: 如何启用调试模式？

```bash
# 设置环境变量
kubectl set env deployment/backend LOG_LEVEL=debug -n emr-namespace
kubectl set env deployment/frontend LOG_LEVEL=debug -n emr-namespace

# 重启服务
kubectl rollout restart deployment/backend -n emr-namespace
kubectl rollout restart deployment/frontend -n emr-namespace
```

## 📞 支持与联系

- **技术支持**: support@emr-blockchain.com
- **文档更新**: docs@emr-blockchain.com
- **安全问题**: security@emr-blockchain.com
- **GitHub Issues**: https://github.com/your-org/emr-blockchain/issues

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

---

**最后更新**: 2023年12月
**版本**: v1.0.0
**维护者**: EMR区块链开发团队
## 📚 相关文档

- [用户手册](../backend-app/docs/USER_GUIDE.md)
- [开发者文档](../backend-app/docs/DEVELOPER_GUIDE.md)
