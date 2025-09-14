#!/bin/bash

# IPFS Cluster Setup Script for Blockchain EMR System
# Sets up a multi-node IPFS cluster for redundant storage

set -e

# Configuration
CLUSTER_SECRET=${IPFS_CLUSTER_SECRET:-$(openssl rand -hex 32)}
CLUSTER_SIZE=${CLUSTER_SIZE:-3}
IPFS_VERSION=${IPFS_VERSION:-latest}
CLUSTER_VERSION=${CLUSTER_VERSION:-latest}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

function log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

function success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Generate IPFS cluster configuration
function generate_cluster_config() {
    log "Generating IPFS cluster configuration..."
    
    mkdir -p ipfs/config
    
    # Create cluster service configuration
    cat > ipfs/config/service.json << EOF
{
  "cluster": {
    "secret": "$CLUSTER_SECRET",
    "leave_on_shutdown": false,
    "listen_multiaddress": "/ip4/0.0.0.0/tcp/9096",
    "state_sync_interval": "5m0s",
    "ipfs_sync_interval": "2m10s",
    "replication_factor_min": 2,
    "replication_factor_max": 3,
    "monitor_ping_interval": "15s",
    "peer_watch_interval": "5s",
    "mdns_interval": "10s",
    "disable_repinning": false,
    "connection_manager": {
      "high_water": 400,
      "low_water": 100,
      "grace_period": "2m0s"
    }
  },
  "consensus": {
    "crdt": {
      "cluster_name": "blockchain-emr-cluster",
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
      "node_multiaddress": "/ip4/127.0.0.1/tcp/5001",
      "log_level": "error",
      "read_timeout": "0s",
      "read_header_timeout": "5s",
      "write_timeout": "0s",
      "idle_timeout": "1m0s",
      "max_header_bytes": 4096
    },
    "restapi": {
      "http_listen_multiaddress": "/ip4/0.0.0.0/tcp/9094",
      "read_timeout": "0s",
      "read_header_timeout": "5s",
      "write_timeout": "0s",
      "idle_timeout": "2m0s",
      "max_header_bytes": 4096,
      "cors_allowed_origins": ["*"],
      "cors_allowed_methods": ["GET", "POST", "PUT", "DELETE"],
      "cors_allowed_headers": ["*"],
      "cors_exposed_headers": ["*"],
      "cors_allow_credentials": true,
      "cors_max_age": "0s"
    }
  },
  "ipfs_connector": {
    "ipfshttp": {
      "node_multiaddress": "/ip4/127.0.0.1/tcp/5001",
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
        "group": "medical-records"
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
      "jaeger_agent_endpoint": "/ip4/0.0.0.0/udp/6831",
      "sampling_prob": 0.3,
      "service_name": "cluster-daemon"
    }
  },
  "datastore": {
    "badger": {
      "badger_options": {
        "dir": "",
        "value_dir": "",
        "sync_writes": false,
        "num_versions_to_keep": 1,
        "read_only": false,
        "compression": 1,
        "in_memory": false,
        "metric_update_frequency": 10000000000,
        "num_compactors": 2,
        "num_level_zero_tables": 5,
        "num_level_zero_tables_stall": 15,
        "num_memtables": 5,
        "bloom_false_positive": 0.01,
        "block_size": 4096,
        "sync_writes": false,
        "num_versions_to_keep": 1,
        "compact_l_0_on_close": true,
        "lru_cache_size": 1073741824,
        "max_table_size": 67108864,
        "size_based_compaction": true,
        "level_size_multiplier": 10
      }
    }
  }
}
EOF

    # Create IPFS node configuration
    cat > ipfs/config/ipfs-config.json << EOF
{
  "API": {
    "HTTPHeaders": {
      "Server": ["go-ipfs/0.4.10"],
      "Access-Control-Allow-Origin": ["*"],
      "Access-Control-Allow-Methods": ["PUT", "GET", "POST"],
      "Access-Control-Allow-Headers": ["*"]
    }
  },
  "Addresses": {
    "API": "/ip4/0.0.0.0/tcp/5001",
    "Announce": [],
    "Gateway": "/ip4/0.0.0.0/tcp/8080",
    "NoAnnounce": [],
    "Swarm": [
      "/ip4/0.0.0.0/tcp/4001",
      "/ip6/::/tcp/4001",
      "/ip4/0.0.0.0/udp/4001/quic",
      "/ip6/::/udp/4001/quic"
    ]
  },
  "Bootstrap": [
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zp9FGkLz9fPQGhx98CJAzHw5aUFxZn",
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
    "FilestoreEnabled": false,
    "Libp2pStreamMounting": false,
    "P2pHttpProxy": false,
    "QUIC": false,
    "ShardingEnabled": false,
    "UrlstoreEnabled": false
  },
  "Gateway": {
    "HTTPHeaders": {
      "Access-Control-Allow-Headers": ["X-Requested-With", "Range", "User-Agent"],
      "Access-Control-Allow-Methods": ["GET"],
      "Access-Control-Allow-Origin": ["*"]
    },
    "PathPrefixes": [],
    "RootRedirect": "",
    "Writable": false
  },
  "Identity": {
    "PeerID": "",
    "PrivKey": ""
  },
  "Ipns": {
    "RecordLifetime": "",
    "RepublishPeriod": "",
    "ResolveCacheSize": 128
  },
  "Mounts": {
    "FuseAllowOther": false,
    "IPFS": "/ipfs",
    "IPNS": "/ipns"
  },
  "Pubsub": {
    "Router": "",
    "DisableSigning": false
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
    "DisableRelay": false,
    "EnableAutoRelay": false,
    "EnableRelayHop": false
  }
}
EOF

    success "IPFS cluster configuration generated"
}

# Initialize IPFS cluster
function init_cluster() {
    log "Initializing IPFS cluster..."
    
    # Create cluster initialization script
    cat > ipfs/init-cluster.sh << 'EOF'
#!/bin/bash

# Wait for IPFS node to be ready
while ! ipfs id > /dev/null 2>&1; do
    echo "Waiting for IPFS node to be ready..."
    sleep 2
done

# Initialize cluster if not already done
if [ ! -f /data/ipfs-cluster/service.json ]; then
    echo "Initializing IPFS cluster..."
    ipfs-cluster-service init
    
    # Copy custom configuration
    if [ -f /container-init.d/service.json ]; then
        cp /container-init.d/service.json /data/ipfs-cluster/service.json
    fi
fi

# Start cluster service
exec ipfs-cluster-service daemon
EOF

    chmod +x ipfs/init-cluster.sh
    
    success "IPFS cluster initialization script created"
}

# Create cluster monitoring script
function create_monitoring() {
    log "Creating cluster monitoring script..."
    
    cat > ipfs/monitor-cluster.sh << 'EOF'
#!/bin/bash

# IPFS Cluster Monitoring Script

CLUSTER_API="http://localhost:9094"

function check_cluster_status() {
    echo "=== IPFS Cluster Status ==="
    curl -s "$CLUSTER_API/id" | jq '.'
    
    echo -e "\n=== Cluster Peers ==="
    curl -s "$CLUSTER_API/peers" | jq '.'
    
    echo -e "\n=== Pin Status ==="
    curl -s "$CLUSTER_API/pins" | jq '.[] | {cid: .cid, status: .status, peer_map: .peer_map}'
    
    echo -e "\n=== Cluster Health ==="
    curl -s "$CLUSTER_API/health/graph" | jq '.'
}

function pin_test_file() {
    echo "=== Testing Pin Operation ==="
    
    # Create test file
    echo "Test medical record data $(date)" > /tmp/test-record.txt
    
    # Add to IPFS
    HASH=$(ipfs add -q /tmp/test-record.txt)
    echo "Added test file with hash: $HASH"
    
    # Pin via cluster
    curl -X POST "$CLUSTER_API/pins/$HASH" | jq '.'
    
    # Check pin status
    sleep 2
    curl -s "$CLUSTER_API/pins/$HASH" | jq '.'
    
    # Cleanup
    rm /tmp/test-record.txt
}

function cluster_metrics() {
    echo "=== Cluster Metrics ==="
    curl -s "http://localhost:8888/metrics" | grep -E "(ipfs_cluster|pintracker|informer)"
}

case "$1" in
    "status")
        check_cluster_status
        ;;
    "test")
        pin_test_file
        ;;
    "metrics")
        cluster_metrics
        ;;
    *)
        echo "Usage: $0 [status|test|metrics]"
        ;;
esac
EOF

    chmod +x ipfs/monitor-cluster.sh
    
    success "Cluster monitoring script created"
}

# Main execution
function main() {
    log "Setting up IPFS cluster for Blockchain EMR..."
    
    generate_cluster_config
    init_cluster
    create_monitoring
    
    # Save cluster secret to environment file
    echo "IPFS_CLUSTER_SECRET=$CLUSTER_SECRET" > ipfs/.env
    
    success "IPFS cluster setup completed!"
    log "Cluster secret saved to ipfs/.env"
    log "Use 'docker-compose up ipfs-cluster-0 ipfs-0' to start the cluster"
}

# Run main function
main "$@"
