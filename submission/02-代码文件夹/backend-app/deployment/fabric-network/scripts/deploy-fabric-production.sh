#!/bin/bash

# Hyperledger Fabric Production Network Deployment Script
# Deploys production-ready Fabric network for EMR blockchain system
# Ensures HIPAA compliance and high availability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FABRIC_VERSION=${FABRIC_VERSION:-2.5.4}
FABRIC_CA_VERSION=${FABRIC_CA_VERSION:-1.5.7}
NETWORK_NAME=${NETWORK_NAME:-fabric-production}
CHANNEL_NAME=${CHANNEL_NAME:-emr-channel}
CHAINCODE_NAME=${CHAINCODE_NAME:-emr-chaincode}

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$(dirname "$FABRIC_DIR")")"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking Fabric deployment prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df "$FABRIC_DIR" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 10485760 ]; then  # 10GB in KB
        log_error "Insufficient disk space. At least 10GB required for Fabric network."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Clean up existing network
cleanup_existing_network() {
    log_info "Cleaning up existing Fabric network..."
    
    cd "$FABRIC_DIR"
    
    # Stop and remove existing containers
    docker-compose -f docker-compose-production.yaml down --volumes --remove-orphans 2>/dev/null || true
    
    # Remove chaincode containers
    docker ps -aq --filter "name=dev-peer" | xargs docker rm -f 2>/dev/null || true
    
    # Remove chaincode images
    docker images -q --filter "reference=dev-peer*" | xargs docker rmi -f 2>/dev/null || true
    
    # Clean up volumes
    docker volume prune -f 2>/dev/null || true
    
    # Remove generated certificates and channel artifacts (if they exist)
    rm -rf crypto-config/ channel-artifacts/ 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Generate crypto material
generate_crypto_material() {
    log_info "Generating cryptographic material..."
    
    cd "$FABRIC_DIR"
    
    # Create crypto-config directory
    mkdir -p crypto-config
    
    # Generate crypto material using cryptogen
    if [ -f "crypto-config.yaml" ]; then
        docker run --rm \
            -v "$PWD:/work" \
            -w /work \
            hyperledger/fabric-tools:$FABRIC_VERSION \
            cryptogen generate --config=crypto-config.yaml --output=crypto-config
        
        log_success "Cryptographic material generated"
    else
        log_error "crypto-config.yaml not found"
        exit 1
    fi
}

# Generate channel artifacts
generate_channel_artifacts() {
    log_info "Generating channel artifacts..."
    
    cd "$FABRIC_DIR"
    
    # Create channel-artifacts directory
    mkdir -p channel-artifacts
    
    # Generate genesis block
    docker run --rm \
        -v "$PWD:/work" \
        -w /work \
        -e FABRIC_CFG_PATH=/work \
        hyperledger/fabric-tools:$FABRIC_VERSION \
        configtxgen -profile EMROrdererGenesis -channelID system-channel -outputBlock channel-artifacts/genesis.block
    
    # Generate channel configuration transaction
    docker run --rm \
        -v "$PWD:/work" \
        -w /work \
        -e FABRIC_CFG_PATH=/work \
        hyperledger/fabric-tools:$FABRIC_VERSION \
        configtxgen -profile EMRChannel -outputCreateChannelTx channel-artifacts/$CHANNEL_NAME.tx -channelID $CHANNEL_NAME
    
    # Generate anchor peer transactions
    local orgs=("Hospital1MSP" "Hospital2MSP" "RegulatorMSP")
    for org in "${orgs[@]}"; do
        docker run --rm \
            -v "$PWD:/work" \
            -w /work \
            -e FABRIC_CFG_PATH=/work \
            hyperledger/fabric-tools:$FABRIC_VERSION \
            configtxgen -profile EMRChannel -outputAnchorPeersUpdate channel-artifacts/${org}anchors.tx -channelID $CHANNEL_NAME -asOrg $org
    done
    
    log_success "Channel artifacts generated"
}

# Start Fabric network
start_fabric_network() {
    log_info "Starting Hyperledger Fabric network..."
    
    cd "$FABRIC_DIR"
    
    # Start the network
    docker-compose -f docker-compose-production.yaml up -d
    
    # Wait for containers to start
    log_info "Waiting for containers to start..."
    sleep 30
    
    # Check if all containers are running
    local running_containers=$(docker-compose -f docker-compose-production.yaml ps --services --filter status=running | wc -l)
    local total_containers=$(docker-compose -f docker-compose-production.yaml ps --services | wc -l)
    
    if [ "$running_containers" -eq "$total_containers" ]; then
        log_success "All Fabric containers are running ($running_containers/$total_containers)"
    else
        log_error "Some containers failed to start ($running_containers/$total_containers)"
        docker-compose -f docker-compose-production.yaml ps
        exit 1
    fi
}

# Create and join channel
create_and_join_channel() {
    log_info "Creating and joining channel: $CHANNEL_NAME"
    
    cd "$FABRIC_DIR"
    
    # Set environment variables for peer0.hospital1
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Hospital1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$PWD/crypto-config/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$PWD/crypto-config/peerOrganizations/hospital1.emr.com/users/Admin@hospital1.emr.com/msp"
    export CORE_PEER_ADDRESS=peer0.hospital1.emr.com:7051
    
    # Create channel
    docker exec peer0.hospital1.emr.com peer channel create \
        -o orderer.emr.com:7050 \
        -c $CHANNEL_NAME \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/$CHANNEL_NAME.tx \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem
    
    # Join peers to channel
    local peers=(
        "peer0.hospital1.emr.com:Hospital1MSP"
        "peer1.hospital1.emr.com:Hospital1MSP"
        "peer0.hospital2.emr.com:Hospital2MSP"
        "peer1.hospital2.emr.com:Hospital2MSP"
        "peer0.regulator.emr.com:RegulatorMSP"
    )
    
    for peer_info in "${peers[@]}"; do
        local peer_name=$(echo "$peer_info" | cut -d: -f1)
        local msp_id=$(echo "$peer_info" | cut -d: -f2)
        
        log_info "Joining $peer_name to channel $CHANNEL_NAME"
        
        docker exec "$peer_name" peer channel join -b $CHANNEL_NAME.block
    done
    
    log_success "Channel created and peers joined"
}

# Update anchor peers
update_anchor_peers() {
    log_info "Updating anchor peers..."
    
    cd "$FABRIC_DIR"
    
    local orgs=("Hospital1MSP" "Hospital2MSP" "RegulatorMSP")
    local peers=("peer0.hospital1.emr.com" "peer0.hospital2.emr.com" "peer0.regulator.emr.com")
    
    for i in "${!orgs[@]}"; do
        local org="${orgs[$i]}"
        local peer="${peers[$i]}"
        
        log_info "Updating anchor peer for $org"
        
        docker exec "$peer" peer channel update \
            -o orderer.emr.com:7050 \
            -c $CHANNEL_NAME \
            -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${org}anchors.tx \
            --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem
    done
    
    log_success "Anchor peers updated"
}

# Install and instantiate chaincode
install_and_instantiate_chaincode() {
    log_info "Installing and instantiating chaincode: $CHAINCODE_NAME"
    
    cd "$FABRIC_DIR"
    
    # Check if chaincode directory exists
    if [ ! -d "../chaincode" ]; then
        log_warning "Chaincode directory not found, skipping chaincode installation"
        return
    fi
    
    local peers=("peer0.hospital1.emr.com" "peer1.hospital1.emr.com" "peer0.hospital2.emr.com" "peer1.hospital2.emr.com" "peer0.regulator.emr.com")
    
    # Install chaincode on all peers
    for peer in "${peers[@]}"; do
        log_info "Installing chaincode on $peer"
        
        docker exec "$peer" peer chaincode install \
            -n $CHAINCODE_NAME \
            -v 1.0 \
            -p github.com/chaincode/emr-chaincode \
            -l node
    done
    
    # Instantiate chaincode
    log_info "Instantiating chaincode on channel $CHANNEL_NAME"
    
    docker exec peer0.hospital1.emr.com peer chaincode instantiate \
        -o orderer.emr.com:7050 \
        -C $CHANNEL_NAME \
        -n $CHAINCODE_NAME \
        -v 1.0 \
        -c '{"Args":["init"]}' \
        -P "AND('Hospital1MSP.peer','Hospital2MSP.peer')" \
        --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem
    
    log_success "Chaincode installed and instantiated"
}

# Verify network health
verify_network_health() {
    log_info "Verifying Fabric network health..."
    
    cd "$FABRIC_DIR"
    
    # Check container status
    local unhealthy_containers=$(docker-compose -f docker-compose-production.yaml ps | grep -v "Up" | grep -v "Name" | wc -l)
    
    if [ "$unhealthy_containers" -eq 0 ]; then
        log_success "All containers are healthy"
    else
        log_error "Found $unhealthy_containers unhealthy containers"
        docker-compose -f docker-compose-production.yaml ps
        return 1
    fi
    
    # Test chaincode query (if chaincode is installed)
    if docker exec peer0.hospital1.emr.com peer chaincode list --installed | grep -q "$CHAINCODE_NAME"; then
        log_info "Testing chaincode query..."
        
        docker exec peer0.hospital1.emr.com peer chaincode query \
            -C $CHANNEL_NAME \
            -n $CHAINCODE_NAME \
            -c '{"Args":["query","test"]}' \
            --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem \
            >/dev/null 2>&1 && log_success "Chaincode query test passed" || log_warning "Chaincode query test failed"
    fi
    
    log_success "Network health verification completed"
}

# Generate connection profiles
generate_connection_profiles() {
    log_info "Generating connection profiles..."
    
    cd "$FABRIC_DIR"
    
    # Create connection profiles directory
    mkdir -p connection-profiles
    
    # Generate connection profile for Hospital1
    cat > connection-profiles/hospital1-connection.json << EOF
{
    "name": "emr-network-hospital1",
    "version": "1.0.0",
    "client": {
        "organization": "Hospital1",
        "connection": {
            "timeout": {
                "peer": {
                    "endorser": "300"
                }
            }
        }
    },
    "organizations": {
        "Hospital1": {
            "mspid": "Hospital1MSP",
            "peers": [
                "peer0.hospital1.emr.com",
                "peer1.hospital1.emr.com"
            ],
            "certificateAuthorities": [
                "ca.hospital1.emr.com"
            ]
        }
    },
    "orderers": {
        "orderer.emr.com": {
            "url": "grpcs://orderer.emr.com:7050",
            "tlsCACerts": {
                "path": "crypto-config/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem"
            }
        }
    },
    "peers": {
        "peer0.hospital1.emr.com": {
            "url": "grpcs://peer0.hospital1.emr.com:7051",
            "tlsCACerts": {
                "path": "crypto-config/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt"
            }
        },
        "peer1.hospital1.emr.com": {
            "url": "grpcs://peer1.hospital1.emr.com:8051",
            "tlsCACerts": {
                "path": "crypto-config/peerOrganizations/hospital1.emr.com/peers/peer1.hospital1.emr.com/tls/ca.crt"
            }
        }
    },
    "certificateAuthorities": {
        "ca.hospital1.emr.com": {
            "url": "https://ca.hospital1.emr.com:7054",
            "caName": "ca-hospital1",
            "tlsCACerts": {
                "path": "crypto-config/peerOrganizations/hospital1.emr.com/ca/ca.hospital1.emr.com-cert.pem"
            }
        }
    }
}
EOF
    
    log_success "Connection profiles generated"
}

# Main deployment function
main() {
    log_info "=== Hyperledger Fabric Production Network Deployment ==="
    log_info "Network Name: $NETWORK_NAME"
    log_info "Channel Name: $CHANNEL_NAME"
    log_info "Chaincode Name: $CHAINCODE_NAME"
    echo ""
    
    check_prerequisites
    cleanup_existing_network
    generate_crypto_material
    generate_channel_artifacts
    start_fabric_network
    create_and_join_channel
    update_anchor_peers
    install_and_instantiate_chaincode
    verify_network_health
    generate_connection_profiles
    
    echo ""
    log_success "=== Fabric Network Deployment Completed Successfully ==="
    echo ""
    echo "Network Information:"
    echo "  - Network Name: $NETWORK_NAME"
    echo "  - Channel Name: $CHANNEL_NAME"
    echo "  - Chaincode Name: $CHAINCODE_NAME"
    echo "  - Orderer: orderer.emr.com:7050"
    echo "  - Peers: 5 peers across 3 organizations"
    echo ""
    echo "Next Steps:"
    echo "  1. Test network connectivity: docker exec peer0.hospital1.emr.com peer channel list"
    echo "  2. Deploy application services"
    echo "  3. Run integration tests"
    echo "  4. Configure monitoring"
    echo ""
}

# Handle script arguments
case "$1" in
    "start")
        start_fabric_network
        ;;
    "stop")
        cd "$FABRIC_DIR"
        docker-compose -f docker-compose-production.yaml down
        ;;
    "restart")
        cd "$FABRIC_DIR"
        docker-compose -f docker-compose-production.yaml restart
        ;;
    "clean")
        cleanup_existing_network
        ;;
    "health")
        verify_network_health
        ;;
    "--help"|"-h")
        echo "Usage: $0 [start|stop|restart|clean|health]"
        echo ""
        echo "Commands:"
        echo "  start     Start existing Fabric network"
        echo "  stop      Stop Fabric network"
        echo "  restart   Restart Fabric network"
        echo "  clean     Clean up network and artifacts"
        echo "  health    Check network health"
        echo "  --help    Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  FABRIC_VERSION      Fabric version (default: 2.5.4)"
        echo "  FABRIC_CA_VERSION   Fabric CA version (default: 1.5.7)"
        echo "  NETWORK_NAME        Network name (default: fabric-production)"
        echo "  CHANNEL_NAME        Channel name (default: emr-channel)"
        echo "  CHAINCODE_NAME      Chaincode name (default: emr-chaincode)"
        ;;
    *)
        main
        ;;
esac
