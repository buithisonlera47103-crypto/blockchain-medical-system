#!/bin/bash

# Chaincode Deployment Script for Production EMR Network
# Deploys and configures EMR chaincode with multi-organization endorsement
# Compliant with read111.md requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHANNEL_NAME="emr-channel"
CHAINCODE_NAME="emr-chaincode"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"
CHAINCODE_PATH="../../../chaincode"
CHAINCODE_LANG="node"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CRYPTO_CONFIG_DIR="$NETWORK_DIR/crypto-config"

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

# Set environment for Hospital1 peer0
set_hospital1_peer0_env() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Hospital1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/users/Admin@hospital1.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:7051
}

# Set environment for Hospital2 peer0
set_hospital2_peer0_env() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Hospital2MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/peers/peer0.hospital2.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/users/Admin@hospital2.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:9051
}

# Set environment for Regulator peer0
set_regulator_peer0_env() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="RegulatorMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/peers/peer0.regulator.emr.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/users/Admin@regulator.emr.com/msp"
    export CORE_PEER_ADDRESS=localhost:11051
}

# Package chaincode
package_chaincode() {
    log_info "Packaging chaincode..."
    
    cd "$NETWORK_DIR"
    
    # Check if chaincode directory exists
    if [ ! -d "$CHAINCODE_PATH" ]; then
        log_error "Chaincode directory not found: $CHAINCODE_PATH"
        exit 1
    fi
    
    # Package the chaincode
    peer lifecycle chaincode package "${CHAINCODE_NAME}.tar.gz" \
        --path "$CHAINCODE_PATH" \
        --lang "$CHAINCODE_LANG" \
        --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
    
    if [ $? -ne 0 ]; then
        log_error "Failed to package chaincode"
        exit 1
    fi
    
    log_success "Chaincode packaged successfully"
}

# Install chaincode on all peers
install_chaincode() {
    log_info "Installing chaincode on all peers..."
    
    cd "$NETWORK_DIR"
    
    # Install on Hospital1 peer0
    log_info "Installing on Hospital1 peer0..."
    set_hospital1_peer0_env
    peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"
    
    # Install on Hospital1 peer1
    log_info "Installing on Hospital1 peer1..."
    export CORE_PEER_ADDRESS=localhost:8051
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer1.hospital1.emr.com/tls/ca.crt"
    peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"
    
    # Install on Hospital2 peer0
    log_info "Installing on Hospital2 peer0..."
    set_hospital2_peer0_env
    peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"
    
    # Install on Hospital2 peer1
    log_info "Installing on Hospital2 peer1..."
    export CORE_PEER_ADDRESS=localhost:10051
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/peers/peer1.hospital2.emr.com/tls/ca.crt"
    peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"
    
    # Install on Regulator peer0
    log_info "Installing on Regulator peer0..."
    set_regulator_peer0_env
    peer lifecycle chaincode install "${CHAINCODE_NAME}.tar.gz"
    
    log_success "Chaincode installed on all peers"
}

# Query installed chaincode to get package ID
query_installed_chaincode() {
    log_info "Querying installed chaincode..."
    
    set_hospital1_peer0_env
    peer lifecycle chaincode queryinstalled >&log.txt
    PACKAGE_ID=$(sed -n "/${CHAINCODE_NAME}_${CHAINCODE_VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
    
    if [ -z "$PACKAGE_ID" ]; then
        log_error "Failed to get package ID"
        exit 1
    fi
    
    log_info "Package ID: $PACKAGE_ID"
    echo "$PACKAGE_ID"
}

# Approve chaincode for each organization
approve_chaincode() {
    local package_id="$1"
    
    log_info "Approving chaincode for each organization..."
    
    cd "$NETWORK_DIR"
    
    # Approve for Hospital1
    log_info "Approving for Hospital1..."
    set_hospital1_peer0_env
    peer lifecycle chaincode approveformyorg \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.emr.com \
        --tls \
        --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem" \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME" \
        --version "$CHAINCODE_VERSION" \
        --package-id "$package_id" \
        --sequence "$CHAINCODE_SEQUENCE" \
        --init-required
    
    # Approve for Hospital2
    log_info "Approving for Hospital2..."
    set_hospital2_peer0_env
    peer lifecycle chaincode approveformyorg \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.emr.com \
        --tls \
        --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem" \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME" \
        --version "$CHAINCODE_VERSION" \
        --package-id "$package_id" \
        --sequence "$CHAINCODE_SEQUENCE" \
        --init-required
    
    # Approve for Regulator
    log_info "Approving for Regulator..."
    set_regulator_peer0_env
    peer lifecycle chaincode approveformyorg \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.emr.com \
        --tls \
        --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem" \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME" \
        --version "$CHAINCODE_VERSION" \
        --package-id "$package_id" \
        --sequence "$CHAINCODE_SEQUENCE" \
        --init-required
    
    log_success "Chaincode approved by all organizations"
}

# Check commit readiness
check_commit_readiness() {
    log_info "Checking commit readiness..."
    
    set_hospital1_peer0_env
    peer lifecycle chaincode checkcommitreadiness \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME" \
        --version "$CHAINCODE_VERSION" \
        --sequence "$CHAINCODE_SEQUENCE" \
        --output json \
        --init-required
    
    log_success "Commit readiness checked"
}

# Commit chaincode
commit_chaincode() {
    log_info "Committing chaincode..."
    
    cd "$NETWORK_DIR"
    
    set_hospital1_peer0_env
    peer lifecycle chaincode commit \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.emr.com \
        --tls \
        --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem" \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME" \
        --peerAddresses localhost:7051 \
        --tlsRootCertFiles "$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt" \
        --peerAddresses localhost:9051 \
        --tlsRootCertFiles "$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/peers/peer0.hospital2.emr.com/tls/ca.crt" \
        --peerAddresses localhost:11051 \
        --tlsRootCertFiles "$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/peers/peer0.regulator.emr.com/tls/ca.crt" \
        --version "$CHAINCODE_VERSION" \
        --sequence "$CHAINCODE_SEQUENCE" \
        --init-required
    
    if [ $? -ne 0 ]; then
        log_error "Failed to commit chaincode"
        exit 1
    fi
    
    log_success "Chaincode committed successfully"
}

# Initialize chaincode
initialize_chaincode() {
    log_info "Initializing chaincode..."
    
    set_hospital1_peer0_env
    peer chaincode invoke \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.emr.com \
        --tls \
        --cafile "$CRYPTO_CONFIG_DIR/ordererOrganizations/emr.com/orderers/orderer.emr.com/msp/tlscacerts/tlsca.emr.com-cert.pem" \
        -C "$CHANNEL_NAME" \
        -n "$CHAINCODE_NAME" \
        --peerAddresses localhost:7051 \
        --tlsRootCertFiles "$CRYPTO_CONFIG_DIR/peerOrganizations/hospital1.emr.com/peers/peer0.hospital1.emr.com/tls/ca.crt" \
        --peerAddresses localhost:9051 \
        --tlsRootCertFiles "$CRYPTO_CONFIG_DIR/peerOrganizations/hospital2.emr.com/peers/peer0.hospital2.emr.com/tls/ca.crt" \
        --peerAddresses localhost:11051 \
        --tlsRootCertFiles "$CRYPTO_CONFIG_DIR/peerOrganizations/regulator.emr.com/peers/peer0.regulator.emr.com/tls/ca.crt" \
        --isInit \
        -c '{"function":"InitLedger","Args":[]}'
    
    if [ $? -ne 0 ]; then
        log_error "Failed to initialize chaincode"
        exit 1
    fi
    
    log_success "Chaincode initialized successfully"
}

# Test chaincode functionality
test_chaincode() {
    log_info "Testing chaincode functionality..."
    
    set_hospital1_peer0_env
    
    # Test query
    log_info "Testing query function..."
    peer chaincode query \
        -C "$CHANNEL_NAME" \
        -n "$CHAINCODE_NAME" \
        -c '{"function":"GetAllRecords","Args":[]}'
    
    log_success "Chaincode test completed"
}

# Query committed chaincode
query_committed_chaincode() {
    log_info "Querying committed chaincode..."
    
    set_hospital1_peer0_env
    peer lifecycle chaincode querycommitted \
        --channelID "$CHANNEL_NAME" \
        --name "$CHAINCODE_NAME"
    
    log_success "Committed chaincode queried"
}

# Main deployment function
main() {
    echo ""
    log_info "=== EMR Chaincode Deployment ==="
    echo ""
    
    package_chaincode
    install_chaincode
    
    # Get package ID
    PACKAGE_ID=$(query_installed_chaincode)
    
    approve_chaincode "$PACKAGE_ID"
    check_commit_readiness
    commit_chaincode
    initialize_chaincode
    test_chaincode
    query_committed_chaincode
    
    echo ""
    log_success "Chaincode deployment completed successfully!"
    echo ""
    log_info "Chaincode Information:"
    echo "  Name: $CHAINCODE_NAME"
    echo "  Version: $CHAINCODE_VERSION"
    echo "  Sequence: $CHAINCODE_SEQUENCE"
    echo "  Package ID: $PACKAGE_ID"
    echo "  Channel: $CHANNEL_NAME"
    echo ""
    log_info "Available Functions:"
    echo "  - InitLedger"
    echo "  - CreateMedicalRecord"
    echo "  - GetMedicalRecord"
    echo "  - UpdateMedicalRecord"
    echo "  - GrantAccess"
    echo "  - RevokeAccess"
    echo "  - CheckAccess"
    echo "  - GetAllRecords"
    echo ""
}

# Handle script arguments
case "$1" in
    "upgrade")
        CHAINCODE_VERSION="$2"
        CHAINCODE_SEQUENCE="$3"
        if [ -z "$CHAINCODE_VERSION" ] || [ -z "$CHAINCODE_SEQUENCE" ]; then
            log_error "Usage: $0 upgrade <version> <sequence>"
            exit 1
        fi
        log_info "Upgrading chaincode to version $CHAINCODE_VERSION, sequence $CHAINCODE_SEQUENCE"
        main
        ;;
    "test")
        test_chaincode
        ;;
    "query")
        query_committed_chaincode
        ;;
    *)
        main
        ;;
esac
