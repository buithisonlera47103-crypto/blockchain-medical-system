#!/bin/bash

# IPFS Cluster Testing Script
# Comprehensive testing for production IPFS cluster
# Tests functionality, replication, performance, and failover

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="test-results"
PERFORMANCE_ITERATIONS=50
LARGE_FILE_SIZE="10MB"
REPLICATION_FACTOR=2
TEST_TIMEOUT=30

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_DIR="$(dirname "$SCRIPT_DIR")"

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

# Create test results directory
create_test_results_dir() {
    mkdir -p "$CLUSTER_DIR/$TEST_RESULTS_DIR"
    echo "Test started at $(date)" > "$CLUSTER_DIR/$TEST_RESULTS_DIR/test-summary.log"
}

# Test cluster connectivity
test_cluster_connectivity() {
    log_info "Testing cluster connectivity..."
    
    local test_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/connectivity-test.log"
    
    # Test IPFS nodes
    local ipfs_ports=("5001" "5002" "5003")
    local ipfs_names=("IPFS-Node-0" "IPFS-Node-1" "IPFS-Node-2")
    
    for i in "${!ipfs_ports[@]}"; do
        if timeout $TEST_TIMEOUT curl -f "http://localhost:${ipfs_ports[$i]}/api/v0/id" >/dev/null 2>&1; then
            echo "✅ ${ipfs_names[$i]} connectivity: PASS" | tee -a "$test_file"
        else
            echo "❌ ${ipfs_names[$i]} connectivity: FAIL" | tee -a "$test_file"
            return 1
        fi
    done
    
    # Test cluster nodes
    local cluster_ports=("9094" "9096" "9098")
    local cluster_names=("Cluster-Node-0" "Cluster-Node-1" "Cluster-Node-2")
    
    for i in "${!cluster_ports[@]}"; do
        if timeout $TEST_TIMEOUT curl -f "http://localhost:${cluster_ports[$i]}/id" >/dev/null 2>&1; then
            echo "✅ ${cluster_names[$i]} connectivity: PASS" | tee -a "$test_file"
        else
            echo "❌ ${cluster_names[$i]} connectivity: FAIL" | tee -a "$test_file"
            return 1
        fi
    done
    
    # Test load balancer
    if timeout $TEST_TIMEOUT curl -f "http://localhost:8090/health" >/dev/null 2>&1; then
        echo "✅ Load Balancer connectivity: PASS" | tee -a "$test_file"
    else
        echo "❌ Load Balancer connectivity: FAIL" | tee -a "$test_file"
        return 1
    fi
    
    log_success "Cluster connectivity test completed"
}

# Test cluster status and peers
test_cluster_status() {
    log_info "Testing cluster status..."
    
    local test_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/cluster-status-test.log"
    
    # Get cluster peers from primary node
    local peers_response=$(curl -s "http://localhost:9094/peers")
    local peer_count=$(echo "$peers_response" | jq length 2>/dev/null || echo "0")
    
    if [ "$peer_count" -ge 3 ]; then
        echo "✅ Cluster peers: PASS ($peer_count peers)" | tee -a "$test_file"
    else
        echo "❌ Cluster peers: FAIL ($peer_count peers, expected 3)" | tee -a "$test_file"
        return 1
    fi
    
    # Test cluster health
    local health_response=$(curl -s "http://localhost:9094/health")
    if echo "$health_response" | grep -q "cluster is healthy" 2>/dev/null; then
        echo "✅ Cluster health: PASS" | tee -a "$test_file"
    else
        echo "⚠️ Cluster health: WARNING (check cluster logs)" | tee -a "$test_file"
    fi
    
    log_success "Cluster status test completed"
}

# Test basic file operations
test_basic_file_operations() {
    log_info "Testing basic file operations..."
    
    local test_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/file-operations-test.log"
    local test_content="Hello IPFS Cluster - Test at $(date)"
    local temp_file="/tmp/ipfs_test_$(date +%s).txt"
    
    # Create test file
    echo "$test_content" > "$temp_file"
    
    # Add file to cluster
    log_info "Adding file to cluster..."
    local add_response=$(curl -s -X POST -F "file=@$temp_file" "http://localhost:9094/add")
    local file_hash=$(echo "$add_response" | jq -r '.cid' 2>/dev/null)
    
    if [ -n "$file_hash" ] && [ "$file_hash" != "null" ]; then
        echo "✅ File add: PASS (Hash: $file_hash)" | tee -a "$test_file"
    else
        echo "❌ File add: FAIL" | tee -a "$test_file"
        rm -f "$temp_file"
        return 1
    fi
    
    # Wait for replication
    sleep 5
    
    # Retrieve file from cluster
    log_info "Retrieving file from cluster..."
    local retrieved_content=$(curl -s "http://localhost:8090/ipfs/$file_hash")
    
    if [ "$retrieved_content" = "$test_content" ]; then
        echo "✅ File retrieve: PASS" | tee -a "$test_file"
    else
        echo "❌ File retrieve: FAIL" | tee -a "$test_file"
        rm -f "$temp_file"
        return 1
    fi
    
    # Test file status
    local status_response=$(curl -s "http://localhost:9094/pins/$file_hash")
    if echo "$status_response" | jq -e '.peer_map' >/dev/null 2>&1; then
        local replica_count=$(echo "$status_response" | jq '.peer_map | length')
        if [ "$replica_count" -ge "$REPLICATION_FACTOR" ]; then
            echo "✅ File replication: PASS ($replica_count replicas)" | tee -a "$test_file"
        else
            echo "⚠️ File replication: WARNING ($replica_count replicas, expected $REPLICATION_FACTOR)" | tee -a "$test_file"
        fi
    else
        echo "❌ File status: FAIL" | tee -a "$test_file"
    fi
    
    # Cleanup
    rm -f "$temp_file"
    
    log_success "Basic file operations test completed"
}

# Test data replication
test_data_replication() {
    log_info "Testing data replication across nodes..."
    
    local test_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/replication-test.log"
    local test_content="Replication test data - $(date)"
    local temp_file="/tmp/replication_test_$(date +%s).txt"
    
    # Create test file
    echo "$test_content" > "$temp_file"
    
    # Add file to cluster
    local add_response=$(curl -s -X POST -F "file=@$temp_file" "http://localhost:9094/add")
    local file_hash=$(echo "$add_response" | jq -r '.cid' 2>/dev/null)
    
    if [ -z "$file_hash" ] || [ "$file_hash" = "null" ]; then
        echo "❌ Replication test setup: FAIL" | tee -a "$test_file"
        rm -f "$temp_file"
        return 1
    fi
    
    # Wait for replication
    sleep 10
    
    # Check file availability on each IPFS node
    local ipfs_ports=("5001" "5002" "5003")
    local available_nodes=0
    
    for port in "${ipfs_ports[@]}"; do
        if timeout $TEST_TIMEOUT curl -s "http://localhost:$port/api/v0/cat?arg=$file_hash" | grep -q "$test_content" 2>/dev/null; then
            echo "✅ Node $port has file: PASS" | tee -a "$test_file"
            available_nodes=$((available_nodes + 1))
        else
            echo "❌ Node $port has file: FAIL" | tee -a "$test_file"
        fi
    done
    
    if [ "$available_nodes" -ge "$REPLICATION_FACTOR" ]; then
        echo "✅ Data replication: PASS ($available_nodes/$REPLICATION_FACTOR nodes)" | tee -a "$test_file"
    else
        echo "❌ Data replication: FAIL ($available_nodes/$REPLICATION_FACTOR nodes)" | tee -a "$test_file"
        rm -f "$temp_file"
        return 1
    fi
    
    # Cleanup
    rm -f "$temp_file"
    
    log_success "Data replication test completed"
}

# Test performance
test_performance() {
    log_info "Testing cluster performance..."
    
    local test_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/performance-test.log"
    local start_time=$(date +%s)
    
    echo "Performance Test - $PERFORMANCE_ITERATIONS iterations" | tee -a "$test_file"
    echo "Started at: $(date)" | tee -a "$test_file"
    
    local success_count=0
    local total_upload_time=0
    local total_download_time=0
    
    for i in $(seq 1 $PERFORMANCE_ITERATIONS); do
        local test_content="Performance test data $i - $(date +%s%3N)"
        local temp_file="/tmp/perf_test_$i.txt"
        echo "$test_content" > "$temp_file"
        
        # Upload test
        local upload_start=$(date +%s%3N)
        local add_response=$(curl -s -X POST -F "file=@$temp_file" "http://localhost:9094/add")
        local upload_end=$(date +%s%3N)
        local upload_time=$((upload_end - upload_start))
        
        local file_hash=$(echo "$add_response" | jq -r '.cid' 2>/dev/null)
        
        if [ -n "$file_hash" ] && [ "$file_hash" != "null" ]; then
            # Download test
            local download_start=$(date +%s%3N)
            local retrieved_content=$(curl -s "http://localhost:8090/ipfs/$file_hash")
            local download_end=$(date +%s%3N)
            local download_time=$((download_end - download_start))
            
            if [ "$retrieved_content" = "$test_content" ]; then
                success_count=$((success_count + 1))
                total_upload_time=$((total_upload_time + upload_time))
                total_download_time=$((total_download_time + download_time))
            fi
        fi
        
        rm -f "$temp_file"
        
        if [ $((i % 10)) -eq 0 ]; then
            log_info "Completed $i/$PERFORMANCE_ITERATIONS operations"
        fi
    done
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    local avg_upload_latency=$((total_upload_time / success_count))
    local avg_download_latency=$((total_download_time / success_count))
    local ops_per_second=$((success_count / total_duration))
    
    echo "Performance Results:" | tee -a "$test_file"
    echo "  Total operations: $PERFORMANCE_ITERATIONS" | tee -a "$test_file"
    echo "  Successful operations: $success_count" | tee -a "$test_file"
    echo "  Success rate: $(echo "scale=2; $success_count * 100 / $PERFORMANCE_ITERATIONS" | bc)%" | tee -a "$test_file"
    echo "  Total duration: ${total_duration}s" | tee -a "$test_file"
    echo "  Average upload latency: ${avg_upload_latency}ms" | tee -a "$test_file"
    echo "  Average download latency: ${avg_download_latency}ms" | tee -a "$test_file"
    echo "  Operations per second: $ops_per_second OPS" | tee -a "$test_file"
    
    if [ $ops_per_second -ge 10 ]; then
        echo "✅ Performance test: PASS (OPS: $ops_per_second)" | tee -a "$test_file"
    else
        echo "❌ Performance test: FAIL (OPS: $ops_per_second, Expected: ≥10)" | tee -a "$test_file"
        return 1
    fi
    
    log_success "Performance test completed"
}

# Test failover capabilities
test_failover() {
    log_info "Testing failover capabilities..."
    
    local test_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/failover-test.log"
    local test_content="Failover test data - $(date)"
    local temp_file="/tmp/failover_test_$(date +%s).txt"
    
    # Create and add test file
    echo "$test_content" > "$temp_file"
    local add_response=$(curl -s -X POST -F "file=@$temp_file" "http://localhost:9094/add")
    local file_hash=$(echo "$add_response" | jq -r '.cid' 2>/dev/null)
    
    if [ -z "$file_hash" ] || [ "$file_hash" = "null" ]; then
        echo "❌ Failover test setup: FAIL" | tee -a "$test_file"
        rm -f "$temp_file"
        return 1
    fi
    
    # Wait for replication
    sleep 10
    
    # Stop one IPFS node
    log_info "Stopping IPFS node 1 for failover test..."
    docker stop ipfs1 >/dev/null 2>&1
    
    # Wait for cluster to detect failure
    sleep 15
    
    # Test file retrieval through load balancer
    local retrieved_content=$(curl -s "http://localhost:8090/ipfs/$file_hash")
    
    if [ "$retrieved_content" = "$test_content" ]; then
        echo "✅ Failover retrieval: PASS" | tee -a "$test_file"
    else
        echo "❌ Failover retrieval: FAIL" | tee -a "$test_file"
        # Restart the stopped node
        docker start ipfs1 >/dev/null 2>&1
        rm -f "$temp_file"
        return 1
    fi
    
    # Test new file addition during node failure
    local failover_content="Failover add test - $(date)"
    local failover_file="/tmp/failover_add_$(date +%s).txt"
    echo "$failover_content" > "$failover_file"
    
    local failover_response=$(curl -s -X POST -F "file=@$failover_file" "http://localhost:9094/add")
    local failover_hash=$(echo "$failover_response" | jq -r '.cid' 2>/dev/null)
    
    if [ -n "$failover_hash" ] && [ "$failover_hash" != "null" ]; then
        echo "✅ Failover add: PASS" | tee -a "$test_file"
    else
        echo "❌ Failover add: FAIL" | tee -a "$test_file"
    fi
    
    # Restart the stopped node
    log_info "Restarting IPFS node 1..."
    docker start ipfs1 >/dev/null 2>&1
    
    # Wait for node to rejoin
    sleep 30
    
    # Verify cluster recovery
    local peers_response=$(curl -s "http://localhost:9094/peers")
    local peer_count=$(echo "$peers_response" | jq length 2>/dev/null || echo "0")
    
    if [ "$peer_count" -ge 3 ]; then
        echo "✅ Cluster recovery: PASS ($peer_count peers)" | tee -a "$test_file"
    else
        echo "⚠️ Cluster recovery: WARNING ($peer_count peers)" | tee -a "$test_file"
    fi
    
    # Cleanup
    rm -f "$temp_file" "$failover_file"
    
    log_success "Failover test completed"
}

# Test large file handling
test_large_file_handling() {
    log_info "Testing large file handling..."
    
    local test_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/large-file-test.log"
    local large_file="/tmp/large_test_$(date +%s).bin"
    
    # Create large test file
    log_info "Creating $LARGE_FILE_SIZE test file..."
    dd if=/dev/urandom of="$large_file" bs=1M count=10 >/dev/null 2>&1
    
    # Calculate file hash for verification
    local original_hash=$(sha256sum "$large_file" | cut -d' ' -f1)
    
    # Upload large file
    log_info "Uploading large file to cluster..."
    local upload_start=$(date +%s)
    local add_response=$(curl -s -X POST -F "file=@$large_file" "http://localhost:9094/add")
    local upload_end=$(date +%s)
    local upload_time=$((upload_end - upload_start))
    
    local file_hash=$(echo "$add_response" | jq -r '.cid' 2>/dev/null)
    
    if [ -n "$file_hash" ] && [ "$file_hash" != "null" ]; then
        echo "✅ Large file upload: PASS (${upload_time}s)" | tee -a "$test_file"
    else
        echo "❌ Large file upload: FAIL" | tee -a "$test_file"
        rm -f "$large_file"
        return 1
    fi
    
    # Wait for replication
    sleep 20
    
    # Download and verify large file
    log_info "Downloading and verifying large file..."
    local download_start=$(date +%s)
    curl -s "http://localhost:8090/ipfs/$file_hash" -o "/tmp/downloaded_large_file.bin"
    local download_end=$(date +%s)
    local download_time=$((download_end - download_start))
    
    local downloaded_hash=$(sha256sum "/tmp/downloaded_large_file.bin" | cut -d' ' -f1)
    
    if [ "$original_hash" = "$downloaded_hash" ]; then
        echo "✅ Large file download: PASS (${download_time}s)" | tee -a "$test_file"
    else
        echo "❌ Large file download: FAIL (hash mismatch)" | tee -a "$test_file"
        rm -f "$large_file" "/tmp/downloaded_large_file.bin"
        return 1
    fi
    
    # Check replication of large file
    local status_response=$(curl -s "http://localhost:9094/pins/$file_hash")
    local replica_count=$(echo "$status_response" | jq '.peer_map | length' 2>/dev/null || echo "0")
    
    if [ "$replica_count" -ge "$REPLICATION_FACTOR" ]; then
        echo "✅ Large file replication: PASS ($replica_count replicas)" | tee -a "$test_file"
    else
        echo "⚠️ Large file replication: WARNING ($replica_count replicas)" | tee -a "$test_file"
    fi
    
    # Cleanup
    rm -f "$large_file" "/tmp/downloaded_large_file.bin"
    
    log_success "Large file handling test completed"
}

# Generate test report
generate_test_report() {
    log_info "Generating test report..."
    
    local report_file="$CLUSTER_DIR/$TEST_RESULTS_DIR/test-report.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>IPFS Cluster Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .pass { color: green; }
        .fail { color: red; }
        .warning { color: orange; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>IPFS Cluster Test Report</h1>
        <p>Generated on: $(date)</p>
        <p>Cluster: Production IPFS Cluster (3 nodes)</p>
    </div>
    
    <div class="test-section">
        <h2>Test Summary</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/test-summary.log")</pre>
    </div>
    
    <div class="test-section">
        <h2>Connectivity Test Results</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/connectivity-test.log" 2>/dev/null || echo "Test not run")</pre>
    </div>
    
    <div class="test-section">
        <h2>Cluster Status Test Results</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/cluster-status-test.log" 2>/dev/null || echo "Test not run")</pre>
    </div>
    
    <div class="test-section">
        <h2>File Operations Test Results</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/file-operations-test.log" 2>/dev/null || echo "Test not run")</pre>
    </div>
    
    <div class="test-section">
        <h2>Replication Test Results</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/replication-test.log" 2>/dev/null || echo "Test not run")</pre>
    </div>
    
    <div class="test-section">
        <h2>Performance Test Results</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/performance-test.log" 2>/dev/null || echo "Test not run")</pre>
    </div>
    
    <div class="test-section">
        <h2>Failover Test Results</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/failover-test.log" 2>/dev/null || echo "Test not run")</pre>
    </div>
    
    <div class="test-section">
        <h2>Large File Test Results</h2>
        <pre>$(cat "$CLUSTER_DIR/$TEST_RESULTS_DIR/large-file-test.log" 2>/dev/null || echo "Test not run")</pre>
    </div>
</body>
</html>
EOF

    log_success "Test report generated: $report_file"
}

# Main test function
run_all_tests() {
    log_info "=== IPFS Cluster Comprehensive Testing ==="
    echo ""
    
    create_test_results_dir
    
    local failed_tests=0
    
    # Run all tests
    test_cluster_connectivity || ((failed_tests++))
    test_cluster_status || ((failed_tests++))
    test_basic_file_operations || ((failed_tests++))
    test_data_replication || ((failed_tests++))
    test_performance || ((failed_tests++))
    test_failover || ((failed_tests++))
    test_large_file_handling || ((failed_tests++))
    
    generate_test_report
    
    echo ""
    if [ $failed_tests -eq 0 ]; then
        log_success "All tests passed! IPFS cluster is ready for production."
    else
        log_error "$failed_tests test(s) failed. Please review the results."
        exit 1
    fi
    
    echo ""
    log_info "Test results available in: $CLUSTER_DIR/$TEST_RESULTS_DIR/"
    echo ""
}

# Handle script arguments
case "$1" in
    "connectivity")
        create_test_results_dir
        test_cluster_connectivity
        ;;
    "performance")
        create_test_results_dir
        test_performance
        ;;
    "failover")
        create_test_results_dir
        test_failover
        ;;
    "replication")
        create_test_results_dir
        test_data_replication
        ;;
    "large-files")
        create_test_results_dir
        test_large_file_handling
        ;;
    "report")
        generate_test_report
        ;;
    *)
        run_all_tests
        ;;
esac
