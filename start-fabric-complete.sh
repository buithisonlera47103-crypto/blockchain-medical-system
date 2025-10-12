#!/bin/bash

# ========================================
# Hyperledger Fabric网络完整启动脚本
# ========================================
# 用途: 一键启动Fabric网络、创建通道、部署EMR链码
# 作者: Augment Agent
# 日期: 2025-10-11
# ========================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 检查依赖
check_dependencies() {
    print_header "检查依赖"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装"
        exit 1
    fi
    print_success "Docker已安装"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装"
        exit 1
    fi
    print_success "Docker Compose已安装"
    
    if [ ! -d "fabric-samples/test-network" ]; then
        print_error "fabric-samples/test-network目录不存在"
        exit 1
    fi
    print_success "Fabric test-network目录存在"
    
    if [ ! -d "chaincode/emr" ]; then
        print_error "chaincode/emr目录不存在"
        exit 1
    fi
    print_success "EMR链码目录存在"
}

# 清理旧环境
cleanup_old_environment() {
    print_header "清理旧环境"
    
    cd fabric-samples/test-network
    
    print_info "停止并删除所有容器..."
    ./network.sh down 2>&1 | grep -E "Stopping|Removing" || true
    
    print_info "删除Docker网络..."
    docker network rm fabric_test 2>/dev/null || true
    
    print_info "清理链码包..."
    rm -f *.tar.gz 2>/dev/null || true
    
    cd ../..
    
    print_success "环境清理完成"
}

# 启动网络
start_network() {
    print_header "启动Fabric网络"
    
    cd fabric-samples/test-network
    
    print_info "启动CA、Peer、Orderer、CouchDB容器..."
    IMAGE_TAG=latest docker-compose -f compose/compose-ca.yaml -f compose/compose-test-net.yaml -f compose/compose-couch.yaml up -d
    
    print_info "等待容器完全启动..."
    sleep 10
    
    # 验证容器状态
    if [ $(docker ps | grep -c "peer0.org1.example.com") -eq 0 ]; then
        print_error "peer0.org1容器未运行"
        docker logs peer0.org1.example.com 2>&1 | tail -20
        exit 1
    fi
    
    if [ $(docker ps | grep -c "peer0.org2.example.com") -eq 0 ]; then
        print_error "peer0.org2容器未运行"
        docker logs peer0.org2.example.com 2>&1 | tail -20
        exit 1
    fi
    
    if [ $(docker ps | grep -c "orderer.example.com") -eq 0 ]; then
        print_error "orderer容器未运行"
        docker logs orderer.example.com 2>&1 | tail -20
        exit 1
    fi
    
    cd ../..
    
    print_success "Fabric网络启动成功"
    print_info "运行中的容器:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|ca_|couch"
}

# 创建通道
create_channel() {
    print_header "创建通道mychannel"
    
    cd fabric-samples/test-network
    
    print_info "生成通道配置..."
    ./network.sh createChannel -c mychannel 2>&1 | tail -20
    
    if [ $? -ne 0 ]; then
        print_error "通道创建失败"
        exit 1
    fi
    
    cd ../..
    
    print_success "通道mychannel创建成功"
}

# 部署链码
deploy_chaincode() {
    print_header "部署EMR链码"
    
    cd fabric-samples/test-network
    
    print_info "打包、安装、批准、提交链码..."
    ./network.sh deployCC -c mychannel -ccn emr -ccp ../../chaincode/emr -ccl javascript 2>&1 | tail -30
    
    if [ $? -ne 0 ]; then
        print_error "链码部署失败"
        exit 1
    fi
    
    cd ../..
    
    print_success "EMR链码部署成功"
}

# 测试链码
test_chaincode() {
    print_header "测试链码功能"
    
    cd fabric-samples/test-network
    
    export FABRIC_CFG_PATH=${PWD}/../config
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
    
    print_info "测试1: InitLedger"
    peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n emr --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}' 2>&1 | grep -E "status|Error"
    
    if [ $? -eq 0 ]; then
        print_success "InitLedger调用成功"
    else
        print_error "InitLedger调用失败"
    fi
    
    print_info "测试2: ListRecords"
    peer chaincode query -C mychannel -n emr -c '{"function":"ListRecords","Args":["{}"]}' 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "ListRecords查询成功"
    else
        print_error "ListRecords查询失败"
    fi
    
    cd ../..
}

# 生成连接配置
generate_connection_profile() {
    print_header "生成连接配置文件"
    
    if [ -f "fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.yaml" ]; then
        cp fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.yaml backend-app/connection-org1.yaml
        print_success "连接配置文件已复制到backend-app/"
    else
        print_warning "连接配置文件不存在，跳过"
    fi
}

# 显示网络状态
show_network_status() {
    print_header "网络状态摘要"
    
    echo ""
    echo "【容器状态】"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|peer|orderer|ca_|couch"
    
    echo ""
    echo "【通道信息】"
    cd fabric-samples/test-network
    export FABRIC_CFG_PATH=${PWD}/../config
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
    peer channel list 2>&1 | grep -v "INFO"
    
    echo ""
    echo "【已部署的链码】"
    peer lifecycle chaincode querycommitted --channelID mychannel 2>&1 | grep -E "Committed|Name|Version"
    
    cd ../..
    
    echo ""
    print_success "Fabric网络完全正常运行！"
    echo ""
    print_info "详细报告请查看: FABRIC_NETWORK_STATUS_REPORT.md"
}

# 主函数
main() {
    echo ""
    print_header "Hyperledger Fabric网络完整启动"
    echo ""
    
    # 检查是否在正确的目录
    if [ ! -f "package.json" ] || [ ! -d "fabric-samples" ]; then
        print_error "请在blockchain-project根目录下运行此脚本"
        exit 1
    fi
    
    # 执行步骤
    check_dependencies
    echo ""
    
    cleanup_old_environment
    echo ""
    
    start_network
    echo ""
    
    create_channel
    echo ""
    
    deploy_chaincode
    echo ""
    
    test_chaincode
    echo ""
    
    generate_connection_profile
    echo ""
    
    show_network_status
    echo ""
    
    print_header "启动完成"
    echo ""
    print_success "Fabric网络已成功启动并配置完成！"
    echo ""
    print_info "下一步:"
    echo "  1. 查看详细报告: cat FABRIC_NETWORK_STATUS_REPORT.md"
    echo "  2. 启动后端服务: cd backend-app && npm run dev"
    echo "  3. 测试区块链端点: curl http://localhost:3001/api/v1/blockchain/health"
    echo ""
}

# 运行主函数
main

