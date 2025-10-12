#!/bin/bash

###############################################################################
# Hyperledger Fabric 快速启动脚本
# 功能：快速启动已有的Fabric网络容器（不重新生成证书）
# 适用场景：证书已存在，只需要重启容器
###############################################################################

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查证书是否存在
check_certificates() {
    log_step "检查证书..."
    
    if [ ! -d "fabric-samples/test-network/organizations/peerOrganizations" ]; then
        log_error "证书不存在！请先运行 ./start-fabric-network.sh 生成证书"
        exit 1
    fi
    
    log_info "✓ 证书已存在"
}

# 启动容器
start_containers() {
    log_step "启动Fabric容器..."
    
    cd fabric-samples/test-network || exit 1
    
    # 使用docker-compose启动
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    # 启动CA
    log_info "启动CA节点..."
    $COMPOSE_CMD -f compose/compose-ca.yaml up -d
    
    # 启动网络
    log_info "启动Peer和Orderer节点..."
    $COMPOSE_CMD -f compose/compose-test-net.yaml up -d
    
    # 启动CouchDB
    log_info "启动CouchDB..."
    $COMPOSE_CMD -f compose/compose-couch.yaml up -d
    
    cd - > /dev/null
    
    log_info "✓ 容器启动完成"
}

# 等待容器就绪
wait_for_containers() {
    log_step "等待容器就绪..."
    
    sleep 5
    
    local max_wait=30
    local count=0
    
    while [ $count -lt $max_wait ]; do
        if docker ps | grep -q "peer0.org1.example.com" && \
           docker ps | grep -q "peer0.org2.example.com" && \
           docker ps | grep -q "orderer.example.com"; then
            log_info "✓ 所有容器已就绪"
            return 0
        fi
        
        count=$((count + 1))
        echo -n "."
        sleep 1
    done
    
    log_warn "容器启动超时，但可能仍在启动中"
}

# 验证网络
verify_network() {
    log_step "验证网络状态..."
    
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|ca|couchdb"
    echo ""
    
    # 测试peer连接
    if docker exec peer0.org1.example.com peer version &> /dev/null; then
        log_info "✓ peer0.org1.example.com 正常"
    else
        log_warn "✗ peer0.org1.example.com 可能有问题"
    fi
    
    if docker exec peer0.org2.example.com peer version &> /dev/null; then
        log_info "✓ peer0.org2.example.com 正常"
    else
        log_warn "✗ peer0.org2.example.com 可能有问题"
    fi
    
    if docker exec orderer.example.com orderer version &> /dev/null; then
        log_info "✓ orderer.example.com 正常"
    else
        log_warn "✗ orderer.example.com 可能有问题"
    fi
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  Fabric 快速启动"
    echo "=========================================="
    echo ""
    
    check_certificates
    start_containers
    wait_for_containers
    verify_network
    
    echo ""
    echo "=========================================="
    log_info "✓ Fabric网络已启动！"
    echo "=========================================="
    echo ""
    log_info "端口信息:"
    log_info "  - peer0.org1: localhost:7051"
    log_info "  - peer0.org2: localhost:9051"
    log_info "  - orderer: localhost:7050"
    log_info "  - ca.org1: localhost:7054"
    log_info "  - ca.org2: localhost:8054"
    echo ""
}

main "$@"

