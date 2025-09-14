#!/bin/bash

# Production Fabric Network Deployment Script
# Deploys multi-organization Hyperledger Fabric network for EMR system
# Compliant with read111.md requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FABRIC_VERSION="2.5"
CA_VERSION="1.5"
NETWORK_NAME="emr-production-network"
CHANNEL_NAME="emr-channel"
CHAINCODE_NAME="emr-chaincode"
CHAINCODE_VERSION="1.0"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CRYPTO_CONFIG_DIR="$NETWORK_DIR/crypto-config"
CHANNEL_ARTIFACTS_DIR="$NETWORK_DIR/channel-artifacts"
CHAINCODE_DIR="$NETWORK_DIR/../../../chaincode"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed."
        exit 1
    fi
    
    # Check if Fabric binaries are available
    if ! command -v cryptogen &> /dev/null; then
        log_warning "Fabric binaries not found in PATH. Downloading..."
        download_fabric_binaries
    fi
    
    log_success "Prerequisites check completed"
}

# Download Fabric binaries
download_fabric_binaries() {
    log_info "Downloading Hyperledger Fabric binaries..."
    
    cd "$NETWORK_DIR"
    curl -sSL https://bit.ly/2ysbOFE | bash -s -- $FABRIC_VERSION $CA_VERSION
    
    # Add binaries to PATH for this session
    export PATH="$NETWORK_DIR/bin:$PATH"
    
    log_success "Fabric binaries downloaded"
}

# Generate crypto materials
generate_crypto_materials() {
    log_info "Generating cryptographic materials..."
    
    cd "$NETWORK_DIR"
    
    # Remove existing crypto materials
    rm -rf "$CRYPTO_CONFIG_DIR"
    
    # Generate crypto materials
    cryptogen generate --config=crypto-config.yaml --output="$CRYPTO_CONFIG_DIR"
    
    if [ $? -ne 0 ]; then
        log_error "Failed to generate crypto materials"
        exit 1
    fi
    
    log_success "Cryptographic materials generated"
}

# Generate channel artifacts
generate_channel_artifacts() {
    log_info "Generating channel artifacts..."
    
    cd "$NETWORK_DIR"
    
    # Create channel artifacts directory
    mkdir -p "$CHANNEL_ARTIFACTS_DIR"
    
    # Set fabric config path
    export FABRIC_CFG_PATH="$NETWORK_DIR"
    
    # Generate genesis block
    log_info "Generating genesis block..."
    configtxgen -profile SampleMultiNodeEtcdRaft -channelID system-channel -outputBlock "$CHANNEL_ARTIFACTS_DIR/genesis.block"
    
    if [ $? -ne 0 ]; then
        log_error "Failed to generate genesis block"
        exit 1
    fi
    
    # Generate channel configuration transaction
    log_info "Generating channel configuration transaction..."
    configtxgen -profile EMRChannel -outputCreateChannelTx "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.tx" -channelID "$CHANNEL_NAME"
    
    if [ $? -ne 0 ]; then
        log_error "Failed to generate channel configuration transaction"
        exit 1
    fi
    
    # Generate anchor peer transactions
    log_info "Generating anchor peer transactions..."
    
    # Hospital1 anchor peer
    configtxgen -profile EMRChannel -outputAnchorPeersUpdate "$CHANNEL_ARTIFACTS_DIR/Hospital1MSPanchors.tx" -channelID "$CHANNEL_NAME" -asOrg Hospital1MSP
    
    # Hospital2 anchor peer
    configtxgen -profile EMRChannel -outputAnchorPeersUpdate "$CHANNEL_ARTIFACTS_DIR/Hospital2MSPanchors.tx" -channelID "$CHANNEL_NAME" -asOrg Hospital2MSP
    
    # Regulator anchor peer
    configtxgen -profile EMRChannel -outputAnchorPeersUpdate "$CHANNEL_ARTIFACTS_DIR/RegulatorMSPanchors.tx" -channelID "$CHANNEL_NAME" -asOrg RegulatorMSP
    
    log_success "Channel artifacts generated"
}

# Start the network
start_network() {
    log_info "Starting Fabric network..."
    
    cd "$NETWORK_DIR"
    
    # Start the network
    docker-compose -f docker-compose-production.yaml up -d
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start Fabric network"
        exit 1
    fi
    
    # Wait for network to be ready
    log_info "Waiting for network to be ready..."
    sleep 30
    
    # Check if all containers are running
    if [ "$(docker-compose -f docker-compose-production.yaml ps -q | wc -l)" -eq "$(docker-compose -f docker-compose-production.yaml ps -q --filter status=running | wc -l)" ]; then
        log_success "Fabric network started successfully"
    else
        log_error "Some containers failed to start"
        docker-compose -f docker-compose-production.yaml ps
        exit 1
    fi
}

# Create channel
create_channel() {
    log_info "Creating channel: $CHANNEL_NAME"
    
    cd "$NETWORK_DIR"
    
    # Set environment variables for peer0.hospital1
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Hospital1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/users/Admin@hospital1.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:7051
    
    # Create channel
    peer channel create -o localhost:7050 -c "$CHANNEL_NAME" -f "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.tx" --outputBlock "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block" --tls --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem"
    
    if [ $? -ne 0 ]; then
        log_error "Failed to create channel"
        exit 1
    fi
    
    log_success "Channel created successfully"
}

# Join peers to channel
join_peers_to_channel() {
    log_info "Joining peers to channel..."
    
    cd "$NETWORK_DIR"
    
    # Join Hospital1 peers
    log_info "Joining Hospital1 peers to channel..."
    
    # peer0.hospital1
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Hospital1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/users/Admin@hospital1.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:7051
    
    peer channel join -b "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block"
    
    # peer1.hospital1
    export CORE_PEER_ADDRESS=localhost:8051
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer1.hospital1.emr.com/tls/ca.crt"
    
    peer channel join -b "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block"
    
    # Join Hospital2 peers
    log_info "Joining Hospital2 peers to channel..."
    
    # peer0.hospital2
    export CORE_PEER_LOCALMSPID="Hospital2MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/peers/peer0.hospital2.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/users/Admin@hospital2.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:9051
    
    peer channel join -b "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block"
    
    # peer1.hospital2
    export CORE_PEER_ADDRESS=localhost:10051
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/peers/peer1.hospital2.emr.com/tls/ca.crt"
    
    peer channel join -b "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block"
    
    # Join Regulator peer
    log_info "Joining Regulator peer to channel..."
    
    # peer0.regulator
    export CORE_PEER_LOCALMSPID="RegulatorMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/peers/peer0.regulator.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/users/Admin@regulator.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:11051
    
    peer channel join -b "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block"
    
    log_success "All peers joined to channel"
}

# Update anchor peers
update_anchor_peers() {
    log_info "Updating anchor peers..."
    
    cd "$NETWORK_DIR"
    
    # Update Hospital1 anchor peer
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Hospital1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/users/Admin@hospital1.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:7051
    
    peer channel update -o localhost:7050 -c "$CHANNEL_NAME" -f "$CHANNEL_ARTIFACTS_DIR/Hospital1MSPanchors.tx" --tls --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem"
    
    # Update Hospital2 anchor peer
    export CORE_PEER_LOCALMSPID="Hospital2MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/peers/peer0.hospital2.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/users/Admin@hospital2.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:9051
    
    peer channel update -o localhost:7050 -c "$CHANNEL_NAME" -f "$CHANNEL_ARTIFACTS_DIR/Hospital2MSPanchors.tx" --tls --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem"
    
    # Update Regulator anchor peer
    export CORE_PEER_LOCALMSPID="RegulatorMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/peers/peer0.regulator.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/users/Admin@regulator.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:11051
    
    peer channel update -o localhost:7050 -c "$CHANNEL_NAME" -f "$CHANNEL_ARTIFACTS_DIR/RegulatorMSPanchors.tx" --tls --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem"
    
    log_success "Anchor peers updated"
}

# Display network information
display_network_info() {
    log_info "=== Production Fabric Network Information ==="
    echo ""
    echo "Network Name: $NETWORK_NAME"
    echo "Channel Name: $CHANNEL_NAME"
    echo "Fabric Version: $FABRIC_VERSION"
    echo ""
    echo "Organizations:"
    echo "  - Hospital1MSP (2 peers)"
    echo "  - Hospital2MSP (2 peers)"
    echo "  - RegulatorMSP (1 peer)"
    echo ""
    echo "Endpoints:"
    echo "  - Orderer: localhost:7050"
    echo "  - Hospital1 Peer0: localhost:7051"
    echo "  - Hospital1 Peer1: localhost:8051"
    echo "  - Hospital2 Peer0: localhost:9051"
    echo "  - Hospital2 Peer1: localhost:10051"
    echo "  - Regulator Peer0: localhost:11051"
    echo ""
    echo "Certificate Authorities:"
    echo "  - Hospital1 CA: localhost:7054"
    echo "  - Hospital2 CA: localhost:8054"
    echo "  - Regulator CA: localhost:9054"
    echo ""
    echo "Monitoring Endpoints:"
    echo "  - Orderer Operations: localhost:17050"
    echo "  - Hospital1 Peer0 Operations: localhost:17051"
    echo "  - Hospital1 Peer1 Operations: localhost:18051"
    echo "  - Hospital2 Peer0 Operations: localhost:19051"
    echo "  - Hospital2 Peer1 Operations: localhost:20051"
    echo "  - Regulator Peer0 Operations: localhost:21051"
    echo ""
}

# Main deployment function
main() {
    echo ""
    log_info "=== EMR Production Fabric Network Deployment ==="
    echo ""
    
    check_prerequisites
    generate_crypto_materials
    generate_channel_artifacts
    start_network
    create_channel
    join_peers_to_channel
    update_anchor_peers
    
    echo ""
    log_success "Production Fabric network deployed successfully!"
    display_network_info
    
    echo ""
    log_info "Next steps:"
    echo "1. Deploy chaincode: ./deploy-chaincode.sh"
    echo "2. Test network: ./test-network.sh"
    echo "3. Configure monitoring: ./setup-monitoring.sh"
    echo ""
}

# Handle script arguments
case "$1" in
    "down")
        log_info "Stopping Fabric network..."
        cd "$NETWORK_DIR"
        docker-compose -f docker-compose-production.yaml down --volumes --remove-orphans
        docker system prune -f
        log_success "Network stopped and cleaned up"
        ;;
    "restart")
        log_info "Restarting Fabric network..."
        cd "$NETWORK_DIR"
        docker-compose -f docker-compose-production.yaml down --volumes --remove-orphans
        main
        ;;
    "clean")
        log_info "Cleaning up all network artifacts..."
        cd "$NETWORK_DIR"
        docker-compose -f docker-compose-production.yaml down --volumes --remove-orphans
        rm -rf "$CRYPTO_CONFIG_DIR" "$CHANNEL_ARTIFACTS_DIR"
        docker system prune -f
        log_success "Network cleaned up"
        ;;
    *)
        main
        ;;
esac
