#!/bin/bash

# IPFS Cluster Production Deployment Script
# Deploys high-availability IPFS cluster for EMR blockchain system
# Compliant with read111.md distributed storage requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_SECRET="${CLUSTER_SECRET:-$(openssl rand -hex 32)}"
REPLICATION_FACTOR_MIN="${REPLICATION_FACTOR_MIN:-2}"
REPLICATION_FACTOR_MAX="${REPLICATION_FACTOR_MAX:-3}"
CLUSTER_SIZE="${CLUSTER_SIZE:-3}"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$CLUSTER_DIR/config"

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
    
    # Check available disk space (minimum 50GB)
    local available_space=$(df . | awk 'NR==2 {print $4}')
    local required_space=$((50 * 1024 * 1024)) # 50GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_warning "Available disk space is less than 50GB. IPFS cluster may run out of space."
    fi
    
    log_success "Prerequisites check completed"
}

# Generate cluster secret
generate_cluster_secret() {
    if [ -z "$CLUSTER_SECRET" ] || [ "$CLUSTER_SECRET" = "$(openssl rand -hex 32)" ]; then
        CLUSTER_SECRET=$(openssl rand -hex 32)
        log_info "Generated new cluster secret"
    else
        log_info "Using provided cluster secret"
    fi
    
    # Save cluster secret to file
    echo "$CLUSTER_SECRET" > "$CLUSTER_DIR/.cluster_secret"
    chmod 600 "$CLUSTER_DIR/.cluster_secret"
    
    # Export for docker-compose
    export CLUSTER_SECRET
}

# Create configuration directories
create_config_directories() {
    log_info "Creating configuration directories..."
    
    mkdir -p "$CONFIG_DIR"/{ipfs0,ipfs1,ipfs2,cluster0,cluster1,cluster2,nginx}
    
    log_success "Configuration directories created"
}

# Generate IPFS configurations
generate_ipfs_configs() {
    log_info "Generating IPFS configurations..."
    
    for i in {0..2}; do
        local config_file="$CONFIG_DIR/ipfs$i/config"
        
        cat > "$config_file" << EOF
{
  "API": {
    "HTTPHeaders": {
      "Server": ["kubo-gateway"]
    }
  },
  "Addresses": {
    "API": "/ip4/0.0.0.0/tcp/5001",
    "Announce": [],
    "AppendAnnounce": [],
    "Gateway": "/ip4/0.0.0.0/tcp/8080",
    "NoAnnounce": [],
    "Swarm": [
      "/ip4/0.0.0.0/tcp/4001",
      "/ip6/::/tcp/4001",
      "/ip4/0.0.0.0/udp/4001/quic",
      "/ip6/::/udp/4001/quic"
    ]
  },
  "AutoNAT": {},
  "Bootstrap": [
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zp9FSD43rdKqiUb5VsfpDdy4ot94Fz",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt"
  ],
  "Datastore": {
    "BloomFilterSize": 0,
    "GCPeriod": "1h",
    "HashOnRead": false,
    "Spec": {
      "mounts": [
        {
          "child": {
            "path": "blocks",
            "shardFunc": "/repo/flatfs/shard/v1/next-to-last/2",
            "sync": true,
            "type": "flatfs"
          },
          "mountpoint": "/blocks",
          "prefix": "flatfs.datastore",
          "type": "measure"
        },
        {
          "child": {
            "compression": "none",
            "path": "datastore",
            "type": "levelds"
          },
          "mountpoint": "/",
          "prefix": "leveldb.datastore",
          "type": "measure"
        }
      ],
      "type": "mount"
    },
    "StorageGCWatermark": 90,
    "StorageMax": "10GB"
  },
  "Discovery": {
    "MDNS": {
      "Enabled": true,
      "Interval": 10
    }
  },
  "Experimental": {
    "AcceleratedDHTClient": false,
    "FilestoreEnabled": false,
    "GraphsyncEnabled": false,
    "Libp2pStreamMounting": false,
    "P2pHttpProxy": false,
    "StrategicProviding": false,
    "UrlstoreEnabled": false
  },
  "Gateway": {
    "APICommands": [],
    "HTTPHeaders": {
      "Access-Control-Allow-Headers": [
        "X-Requested-With",
        "Range",
        "User-Agent"
      ],
      "Access-Control-Allow-Methods": [
        "GET"
      ],
      "Access-Control-Allow-Origin": [
        "*"
      ]
    },
    "NoDNSLink": false,
    "NoFetch": false,
    "PathPrefixes": [],
    "PublicGateways": null,
    "RootRedirect": "",
    "Writable": false
  },
  "Identity": {
    "PeerID": "",
    "PrivKey": ""
  },
  "Internal": {},
  "Ipns": {
    "RecordLifetime": "",
    "RepublishPeriod": "",
    "ResolveCacheSize": 128
  },
  "Migration": {
    "DownloadSources": [],
    "Keep": ""
  },
  "Mounts": {
    "FuseAllowOther": false,
    "IPFS": "/ipfs",
    "IPNS": "/ipns"
  },
  "Peering": {
    "Peers": []
  },
  "Pinning": {
    "RemoteServices": {}
  },
  "Plugins": {
    "Plugins": null
  },
  "Provider": {
    "Strategy": ""
  },
  "Pubsub": {
    "DisableSigning": false,
    "Router": ""
  },
  "Reprovider": {
    "Interval": "12h",
    "Strategy": "all"
  },
  "Routing": {
    "Type": "dht"
  },
  "Swarm": {
    "AddrFilters": null,
    "ConnMgr": {
      "GracePeriod": "20s",
      "HighWater": 900,
      "LowWater": 600,
      "Type": "basic"
    },
    "DisableBandwidthMetrics": false,
    "DisableNatPortMap": false,
    "RelayClient": {
      "Enabled": true,
      "StaticRelays": []
    },
    "RelayService": {
      "Enabled": true,
      "HopLimit": 3,
      "DurationLimit": "2m",
      "DataLimit": 131072
    },
    "ResourceMgr": {
      "Enabled": true
    },
    "Transports": {
      "Multiplexers": {},
      "Network": {},
      "Security": {}
    }
  }
}
EOF
    done
    
    log_success "IPFS configurations generated"
}

# Generate cluster configurations
generate_cluster_configs() {
    log_info "Generating cluster configurations..."
    
    for i in {0..2}; do
        local config_file="$CONFIG_DIR/cluster$i/service.json"
        
        cat > "$config_file" << EOF
{
  "cluster": {
    "secret": "$CLUSTER_SECRET",
    "leave_on_shutdown": false,
    "listen_multiaddress": "/ip4/0.0.0.0/tcp/9095",
    "state_sync_interval": "5m0s",
    "ipfs_sync_interval": "2m10s",
    "replication_factor_min": $REPLICATION_FACTOR_MIN,
    "replication_factor_max": $REPLICATION_FACTOR_MAX,
    "monitor_ping_interval": "15s",
    "peer_watch_interval": "5s",
    "mdns_interval": "10s",
    "pin_recover_interval": "1h0m0s",
    "disable_repinning": false
  },
  "consensus": {
    "crdt": {
      "cluster_name": "emr-ipfs-cluster",
      "trusted_peers": ["*"],
      "batching": {
        "max_batch_size": 0,
        "max_batch_age": "0s"
      },
      "repair_interval": "1h0m0s"
    }
  },
  "api": {
    "ipfsproxy": {
      "listen_multiaddress": "/ip4/0.0.0.0/tcp/9095",
      "node_multiaddress": "/dns4/ipfs$i/tcp/5001",
      "log_level": "error",
      "extract_headers_extra": [],
      "extract_headers_path": "/api/v0/version",
      "extract_headers_ttl": "5m"
    },
    "restapi": {
      "http_listen_multiaddress": "/ip4/0.0.0.0/tcp/9094",
      "read_timeout": "30s",
      "read_header_timeout": "5s",
      "write_timeout": "60s",
      "idle_timeout": "120s",
      "max_header_bytes": 4096,
      "cors_allowed_origins": ["*"],
      "cors_allowed_methods": ["GET", "POST", "PUT", "DELETE"],
      "cors_allowed_headers": [],
      "cors_exposed_headers": ["Content-Type", "X-Stream-Output", "X-Chunked-Output", "X-Content-Length"],
      "cors_allow_credentials": true,
      "cors_max_age": "0s"
    }
  },
  "ipfs_connector": {
    "ipfshttp": {
      "node_multiaddress": "/dns4/ipfs$i/tcp/5001",
      "connect_swarms_delay": "30s",
      "ipfs_request_timeout": "5m0s",
      "pin_timeout": "2m0s",
      "unpin_timeout": "3h0m0s",
      "repogc_timeout": "24h0m0s",
      "informer_trigger_interval": "0s"
    }
  },
  "pin_tracker": {
    "stateless": {
      "concurrent_pins": 10,
      "priority_pin_max_age": "24h0m0s",
      "priority_pin_max_retries": 5
    }
  },
  "monitor": {
    "pubsubmon": {
      "check_interval": "15s"
    }
  },
  "allocator": {
    "balanced": {
      "allocate_by": ["tag:group", "freespace"]
    }
  },
  "informer": {
    "disk": {
      "metric_ttl": "30s",
      "metric_type": "freespace"
    },
    "tags": {
      "metric_ttl": "30s",
      "tags": {
        "group": "emr-cluster-node-$i"
      }
    }
  },
  "observations": {
    "metrics": {
      "enable_stats": true,
      "prometheus_endpoint": "/ip4/0.0.0.0/tcp/8888",
      "reporting_interval": "2s"
    },
    "tracing": {
      "enable_tracing": false,
      "jaeger_agent_endpoint": "/ip4/localhost/udp/6831",
      "sampling_prob": 0.3,
      "service_name": "cluster-daemon"
    }
  }
}
EOF
    done
    
    log_success "Cluster configurations generated"
}

# Generate Nginx load balancer configuration
generate_nginx_config() {
    log_info "Generating Nginx load balancer configuration..."
    
    cat > "$CONFIG_DIR/nginx/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream ipfs_gateways {
        least_conn;
        server ipfs0:8080 max_fails=3 fail_timeout=30s;
        server ipfs1:8080 max_fails=3 fail_timeout=30s;
        server ipfs2:8080 max_fails=3 fail_timeout=30s;
    }

    upstream ipfs_apis {
        least_conn;
        server ipfs0:5001 max_fails=3 fail_timeout=30s;
        server ipfs1:5001 max_fails=3 fail_timeout=30s;
        server ipfs2:5001 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        server_name _;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # IPFS Gateway (read-only)
        location /ipfs/ {
            proxy_pass http://ipfs_gateways;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
            
            # CORS headers
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
        }

        # IPFS API (internal use only)
        location /api/ {
            proxy_pass http://ipfs_apis;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
            
            # Restrict access to internal networks only
            allow 172.20.0.0/16;
            allow 127.0.0.1;
            deny all;
        }

        # Status page
        location /status {
            stub_status on;
            access_log off;
            allow 172.20.0.0/16;
            allow 127.0.0.1;
            deny all;
        }
    }
}
EOF

    log_success "Nginx configuration generated"
}

# Initialize IPFS nodes
initialize_ipfs_nodes() {
    log_info "Initializing IPFS nodes..."
    
    cd "$CLUSTER_DIR"
    
    # Start IPFS nodes first
    docker-compose -f docker-compose-production.yaml up -d ipfs0 ipfs1 ipfs2
    
    # Wait for IPFS nodes to be ready
    log_info "Waiting for IPFS nodes to be ready..."
    sleep 30
    
    # Check IPFS node status
    for i in {0..2}; do
        local port=$((5001 + i))
        if curl -f "http://localhost:$port/api/v0/id" >/dev/null 2>&1; then
            log_success "IPFS node $i is ready"
        else
            log_error "IPFS node $i failed to start"
            exit 1
        fi
    done
}

# Initialize cluster nodes
initialize_cluster_nodes() {
    log_info "Initializing cluster nodes..."
    
    cd "$CLUSTER_DIR"
    
    # Start cluster nodes
    docker-compose -f docker-compose-production.yaml up -d cluster0 cluster1 cluster2
    
    # Wait for cluster to form
    log_info "Waiting for cluster to form..."
    sleep 60
    
    # Check cluster status
    for i in {0..2}; do
        local port=$((9094 + i * 2))
        if curl -f "http://localhost:$port/id" >/dev/null 2>&1; then
            log_success "Cluster node $i is ready"
        else
            log_error "Cluster node $i failed to start"
            exit 1
        fi
    done
}

# Start additional services
start_additional_services() {
    log_info "Starting additional services..."
    
    cd "$CLUSTER_DIR"
    
    # Start monitoring and load balancer
    docker-compose -f docker-compose-production.yaml up -d cluster-monitor ipfs-gateway-lb ipfs-exporter
    
    # Wait for services to be ready
    sleep 10
    
    # Check load balancer
    if curl -f "http://localhost:8090/health" >/dev/null 2>&1; then
        log_success "Load balancer is ready"
    else
        log_warning "Load balancer may not be ready"
    fi
    
    # Check Prometheus exporter
    if curl -f "http://localhost:9401/metrics" >/dev/null 2>&1; then
        log_success "Prometheus exporter is ready"
    else
        log_warning "Prometheus exporter may not be ready"
    fi
}

# Display cluster information
display_cluster_info() {
    log_info "=== IPFS Cluster Information ==="
    echo ""
    echo "Cluster Secret: $CLUSTER_SECRET"
    echo "Replication Factor: $REPLICATION_FACTOR_MIN - $REPLICATION_FACTOR_MAX"
    echo "Cluster Size: $CLUSTER_SIZE nodes"
    echo ""
    echo "IPFS Nodes:"
    echo "  - Node 0: http://localhost:5001 (API), http://localhost:8080 (Gateway)"
    echo "  - Node 1: http://localhost:5002 (API), http://localhost:8081 (Gateway)"
    echo "  - Node 2: http://localhost:5003 (API), http://localhost:8082 (Gateway)"
    echo ""
    echo "Cluster Nodes:"
    echo "  - Cluster 0: http://localhost:9094 (API)"
    echo "  - Cluster 1: http://localhost:9096 (API)"
    echo "  - Cluster 2: http://localhost:9098 (API)"
    echo ""
    echo "Load Balancer:"
    echo "  - Gateway: http://localhost:8090"
    echo "  - Health: http://localhost:8090/health"
    echo ""
    echo "Monitoring:"
    echo "  - Prometheus Metrics: http://localhost:9401/metrics"
    echo ""
}

# Main deployment function
main() {
    echo ""
    log_info "=== IPFS Cluster Production Deployment ==="
    echo ""
    
    check_prerequisites
    generate_cluster_secret
    create_config_directories
    generate_ipfs_configs
    generate_cluster_configs
    generate_nginx_config
    initialize_ipfs_nodes
    initialize_cluster_nodes
    start_additional_services
    
    echo ""
    log_success "IPFS cluster deployment completed successfully!"
    display_cluster_info
    
    echo ""
    log_info "Next steps:"
    echo "1. Test cluster: ./test-ipfs-cluster.sh"
    echo "2. Configure monitoring: ./setup-ipfs-monitoring.sh"
    echo "3. Run performance tests: ./benchmark-ipfs-cluster.sh"
    echo ""
}

# Handle script arguments
case "$1" in
    "down")
        log_info "Stopping IPFS cluster..."
        cd "$CLUSTER_DIR"
        docker-compose -f docker-compose-production.yaml down --volumes --remove-orphans
        log_success "IPFS cluster stopped"
        ;;
    "restart")
        log_info "Restarting IPFS cluster..."
        cd "$CLUSTER_DIR"
        docker-compose -f docker-compose-production.yaml down --volumes --remove-orphans
        main
        ;;
    "clean")
        log_info "Cleaning IPFS cluster..."
        cd "$CLUSTER_DIR"
        docker-compose -f docker-compose-production.yaml down --volumes --remove-orphans
        rm -rf "$CONFIG_DIR"
        rm -f "$CLUSTER_DIR/.cluster_secret"
        docker system prune -f
        log_success "IPFS cluster cleaned"
        ;;
    *)
        main
        ;;
esac
