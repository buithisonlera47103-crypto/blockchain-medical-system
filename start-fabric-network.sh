#!/bin/bash

###############################################################################
# Hyperledger Fabric 网络完整启动脚本
# 功能：清理旧环境、启动网络、创建通道、部署链码
# 作者：AI助手
# 日期：2025-10-11
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 配置变量
FABRIC_NETWORK_DIR="fabric-samples/test-network"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="emr"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"
CHAINCODE_PATH="../chaincode/emr"  # 相对于test-network目录

# 检查必要的工具
check_prerequisites() {
    log_step "检查必要的工具..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_info "✓ Docker 已安装: $(docker --version)"
    log_info "✓ Docker Compose 已安装"
}

# 清理旧环境
cleanup_old_environment() {
    log_step "清理旧的Fabric网络环境..."
    
    cd "$FABRIC_NETWORK_DIR" || exit 1
    
    # 停止并删除所有Fabric容器
    log_info "停止Fabric容器..."
    docker ps -a | grep -E "hyperledger|dev-peer" | awk '{print $1}' | xargs -r docker stop 2>/dev/null || true
    docker ps -a | grep -E "hyperledger|dev-peer" | awk '{print $1}' | xargs -r docker rm 2>/dev/null || true
    
    # 删除链码容器和镜像
    log_info "清理链码容器和镜像..."
    docker images | grep "dev-peer" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    
    # 清理网络
    log_info "清理Docker网络..."
    docker network ls | grep "fabric_test" | awk '{print $1}' | xargs -r docker network rm 2>/dev/null || true
    
    # 清理卷
    log_info "清理Docker卷..."
    docker volume ls | grep "fabric" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true
    
    # 清理生成的文件
    log_info "清理生成的证书和配置文件..."
    rm -rf organizations/peerOrganizations
    rm -rf organizations/ordererOrganizations
    rm -rf organizations/fabric-ca/org1/msp
    rm -rf organizations/fabric-ca/org1/tls-cert.pem
    rm -rf organizations/fabric-ca/org1/ca-cert.pem
    rm -rf organizations/fabric-ca/org1/IssuerPublicKey
    rm -rf organizations/fabric-ca/org1/IssuerRevocationPublicKey
    rm -rf organizations/fabric-ca/org1/fabric-ca-server.db
    rm -rf organizations/fabric-ca/org2/msp
    rm -rf organizations/fabric-ca/org2/tls-cert.pem
    rm -rf organizations/fabric-ca/org2/ca-cert.pem
    rm -rf organizations/fabric-ca/org2/IssuerPublicKey
    rm -rf organizations/fabric-ca/org2/IssuerRevocationPublicKey
    rm -rf organizations/fabric-ca/org2/fabric-ca-server.db
    rm -rf organizations/fabric-ca/ordererOrg/msp
    rm -rf organizations/fabric-ca/ordererOrg/tls-cert.pem
    rm -rf organizations/fabric-ca/ordererOrg/ca-cert.pem
    rm -rf organizations/fabric-ca/ordererOrg/IssuerPublicKey
    rm -rf organizations/fabric-ca/ordererOrg/IssuerRevocationPublicKey
    rm -rf organizations/fabric-ca/ordererOrg/fabric-ca-server.db
    rm -rf channel-artifacts/*
    rm -rf system-genesis-block/*
    
    log_info "✓ 旧环境清理完成"
    cd - > /dev/null
}

# 启动Fabric网络
start_fabric_network() {
    log_step "启动Hyperledger Fabric网络..."
    
    cd "$FABRIC_NETWORK_DIR" || exit 1
    
    # 使用network.sh启动网络
    log_info "启动CA、Peer和Orderer节点..."
    ./network.sh up -ca -s couchdb
    
    if [ $? -ne 0 ]; then
        log_error "Fabric网络启动失败"
        cd - > /dev/null
        exit 1
    fi
    
    log_info "✓ Fabric网络启动成功"
    
    # 等待容器完全启动
    log_info "等待容器完全启动..."
    sleep 10
    
    # 验证容器状态
    log_info "验证容器状态..."
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|ca"
    
    cd - > /dev/null
}

# 创建通道
create_channel() {
    log_step "创建通道: $CHANNEL_NAME..."
    
    cd "$FABRIC_NETWORK_DIR" || exit 1
    
    ./network.sh createChannel -c "$CHANNEL_NAME"
    
    if [ $? -ne 0 ]; then
        log_error "通道创建失败"
        cd - > /dev/null
        exit 1
    fi
    
    log_info "✓ 通道 $CHANNEL_NAME 创建成功"
    cd - > /dev/null
}

# 准备链码
prepare_chaincode() {
    log_step "准备链码..."
    
    # 检查链码目录
    if [ ! -d "$FABRIC_NETWORK_DIR/$CHAINCODE_PATH" ]; then
        log_warn "链码目录不存在: $FABRIC_NETWORK_DIR/$CHAINCODE_PATH"
        log_info "创建示例链码..."
        
        mkdir -p "$FABRIC_NETWORK_DIR/$CHAINCODE_PATH"
        
        # 创建简单的Go链码
        cat > "$FABRIC_NETWORK_DIR/$CHAINCODE_PATH/emr.go" << 'EOF'
package main

import (
    "encoding/json"
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type EMRContract struct {
    contractapi.Contract
}

type MedicalRecord struct {
    RecordID    string `json:"recordId"`
    PatientID   string `json:"patientId"`
    DoctorID    string `json:"doctorId"`
    IPFSCid     string `json:"ipfsCid"`
    ContentHash string `json:"contentHash"`
    Timestamp   string `json:"timestamp"`
}

func (c *EMRContract) CreateMedicalRecord(ctx contractapi.TransactionContextInterface, recordId string, patientId string, doctorId string, ipfsCid string, contentHash string) error {
    record := MedicalRecord{
        RecordID:    recordId,
        PatientID:   patientId,
        DoctorID:    doctorId,
        IPFSCid:     ipfsCid,
        ContentHash: contentHash,
        Timestamp:   ctx.GetStub().GetTxTimestamp().String(),
    }
    
    recordJSON, err := json.Marshal(record)
    if err != nil {
        return err
    }
    
    return ctx.GetStub().PutState(recordId, recordJSON)
}

func (c *EMRContract) GetMedicalRecord(ctx contractapi.TransactionContextInterface, recordId string) (*MedicalRecord, error) {
    recordJSON, err := ctx.GetStub().GetState(recordId)
    if err != nil {
        return nil, fmt.Errorf("failed to read from world state: %v", err)
    }
    if recordJSON == nil {
        return nil, fmt.Errorf("record %s does not exist", recordId)
    }
    
    var record MedicalRecord
    err = json.Unmarshal(recordJSON, &record)
    if err != nil {
        return nil, err
    }
    
    return &record, nil
}

func main() {
    chaincode, err := contractapi.NewChaincode(&EMRContract{})
    if err != nil {
        fmt.Printf("Error creating EMR chaincode: %v\n", err)
        return
    }
    
    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting EMR chaincode: %v\n", err)
    }
}
EOF

        # 创建go.mod
        cat > "$FABRIC_NETWORK_DIR/$CHAINCODE_PATH/go.mod" << 'EOF'
module github.com/hyperledger/fabric-samples/chaincode/emr

go 1.20

require github.com/hyperledger/fabric-contract-api-go v1.2.1
EOF
        
        log_info "✓ 示例链码创建完成"
    else
        log_info "✓ 链码目录已存在"
    fi
}

# 部署链码
deploy_chaincode() {
    log_step "部署链码: $CHAINCODE_NAME..."
    
    cd "$FABRIC_NETWORK_DIR" || exit 1
    
    # 使用network.sh部署链码
    ./network.sh deployCC -c "$CHANNEL_NAME" -ccn "$CHAINCODE_NAME" -ccp "$CHAINCODE_PATH" -ccl go -ccv "$CHAINCODE_VERSION" -ccs "$CHAINCODE_SEQUENCE"
    
    if [ $? -ne 0 ]; then
        log_error "链码部署失败"
        cd - > /dev/null
        exit 1
    fi
    
    log_info "✓ 链码 $CHAINCODE_NAME 部署成功"
    cd - > /dev/null
}

# 验证网络
verify_network() {
    log_step "验证Fabric网络..."
    
    log_info "检查运行中的容器..."
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "peer|orderer|ca|couchdb"
    
    log_info ""
    log_info "检查网络连接..."
    
    # 测试peer0.org1
    if docker exec peer0.org1.example.com peer version &> /dev/null; then
        log_info "✓ peer0.org1.example.com 正常运行"
    else
        log_warn "✗ peer0.org1.example.com 可能有问题"
    fi
    
    # 测试peer0.org2
    if docker exec peer0.org2.example.com peer version &> /dev/null; then
        log_info "✓ peer0.org2.example.com 正常运行"
    else
        log_warn "✗ peer0.org2.example.com 可能有问题"
    fi
    
    # 测试orderer
    if docker exec orderer.example.com orderer version &> /dev/null; then
        log_info "✓ orderer.example.com 正常运行"
    else
        log_warn "✗ orderer.example.com 可能有问题"
    fi
}

# 生成连接配置文件
generate_connection_profile() {
    log_step "生成连接配置文件..."
    
    local OUTPUT_FILE="backend-app/connection-org1.json"
    
    cat > "$OUTPUT_FILE" << 'EOF'
{
  "name": "test-network-org1",
  "version": "1.0.0",
  "client": {
    "organization": "Org1",
    "connection": {
      "timeout": {
        "peer": {
          "endorser": "300"
        },
        "orderer": "300"
      }
    }
  },
  "organizations": {
    "Org1": {
      "mspid": "Org1MSP",
      "peers": [
        "peer0.org1.example.com"
      ],
      "certificateAuthorities": [
        "ca.org1.example.com"
      ]
    }
  },
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": {
        "path": "../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.org1.example.com",
        "hostnameOverride": "peer0.org1.example.com"
      }
    }
  },
  "certificateAuthorities": {
    "ca.org1.example.com": {
      "url": "https://localhost:7054",
      "caName": "ca-org1",
      "tlsCACerts": {
        "path": "../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem"
      },
      "httpOptions": {
        "verify": false
      }
    }
  }
}
EOF
    
    log_info "✓ 连接配置文件已生成: $OUTPUT_FILE"
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  Hyperledger Fabric 网络启动脚本"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    cleanup_old_environment
    start_fabric_network
    create_channel
    prepare_chaincode
    deploy_chaincode
    verify_network
    generate_connection_profile
    
    echo ""
    echo "=========================================="
    log_info "✓ Fabric网络启动完成！"
    echo "=========================================="
    echo ""
    log_info "网络信息:"
    log_info "  - 通道名称: $CHANNEL_NAME"
    log_info "  - 链码名称: $CHAINCODE_NAME"
    log_info "  - Peer节点: peer0.org1.example.com:7051, peer0.org2.example.com:9051"
    log_info "  - Orderer节点: orderer.example.com:7050"
    log_info "  - CA节点: ca.org1.example.com:7054, ca.org2.example.com:8054"
    echo ""
    log_info "后续步骤:"
    log_info "  1. 重启后端服务以连接到Fabric网络"
    log_info "  2. 运行测试验证区块链功能"
    echo ""
}

# 执行主函数
main "$@"

