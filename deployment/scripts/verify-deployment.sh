#!/bin/bash

# EMR区块链系统部署验证脚本
# 验证所有组件是否正常运行

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
NAMESPACE="emr-namespace"
DOMAIN="emr.example.com"
TIMEOUT=300
DEPLOYMENT_MODE="kubernetes"  # docker 或 kubernetes

# 日志函数
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

# 显示帮助信息
show_help() {
    cat << EOF
EMR区块链系统部署验证脚本

用法: $0 [选项]

选项:
  -m, --mode MODE          部署模式 (docker|kubernetes) [默认: kubernetes]
  -d, --domain DOMAIN      域名 [默认: emr.example.com]
  -n, --namespace NS       Kubernetes命名空间 [默认: emr-namespace]
  -t, --timeout TIMEOUT   超时时间(秒) [默认: 300]
  --skip-external         跳过外部服务检查
  --detailed              显示详细信息
  -h, --help              显示此帮助信息

示例:
  $0 --mode docker                    # Docker部署验证
  $0 --mode kubernetes --domain emr.prod.com  # Kubernetes生产验证
  $0 --detailed --skip-external      # 详细验证，跳过外部检查
EOF
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -m|--mode)
                DEPLOYMENT_MODE="$2"
                shift 2
                ;;
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --skip-external)
                SKIP_EXTERNAL=true
                shift
                ;;
            --detailed)
                DETAILED=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查命令是否存在
check_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        log_error "命令不存在: $cmd"
        return 1
    fi
    return 0
}

# 等待服务就绪
wait_for_service() {
    local service_name="$1"
    local check_command="$2"
    local timeout="$3"
    local interval=5
    local elapsed=0
    
    log_info "等待 $service_name 服务就绪..."
    
    while [[ $elapsed -lt $timeout ]]; do
        if eval "$check_command" &>/dev/null; then
            log_success "$service_name 服务已就绪"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        
        if [[ $((elapsed % 30)) -eq 0 ]]; then
            log_info "等待 $service_name 中... (${elapsed}s/${timeout}s)"
        fi
    done
    
    log_error "$service_name 服务在 ${timeout}s 内未就绪"
    return 1
}

# HTTP健康检查
http_health_check() {
    local url="$1"
    local expected_status="$2"
    local description="$3"
    
    log_info "检查 $description: $url"
    
    local response
    local status_code
    
    if response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null); then
        status_code=$(echo "$response" | tail -n1)
        response_body=$(echo "$response" | head -n -1)
        
        if [[ "$status_code" == "$expected_status" ]]; then
            log_success "$description 健康检查通过 (HTTP $status_code)"
            
            if [[ "$DETAILED" == "true" ]]; then
                echo "响应内容: $response_body" | head -c 200
                echo
            fi
            return 0
        else
            log_error "$description 健康检查失败 (HTTP $status_code)"
            return 1
        fi
    else
        log_error "$description 无法访问"
        return 1
    fi
}

# Kubernetes资源检查
check_k8s_resources() {
    log_info "检查Kubernetes资源状态..."
    
    # 检查命名空间
    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log_error "命名空间 $NAMESPACE 不存在"
        return 1
    fi
    log_success "命名空间 $NAMESPACE 存在"
    
    # 检查Pod状态
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null || true)
    
    if [[ -z "$pods" ]]; then
        log_error "命名空间 $NAMESPACE 中没有Pod"
        return 1
    fi
    
    local total_pods=0
    local running_pods=0
    local failed_pods=()
    
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            local pod_name=$(echo "$line" | awk '{print $1}')
            local status=$(echo "$line" | awk '{print $3}')
            local ready=$(echo "$line" | awk '{print $2}')
            
            total_pods=$((total_pods + 1))
            
            if [[ "$status" == "Running" ]] && [[ "$ready" =~ ^[0-9]+/[0-9]+$ ]]; then
                local ready_count=$(echo "$ready" | cut -d'/' -f1)
                local total_count=$(echo "$ready" | cut -d'/' -f2)
                
                if [[ "$ready_count" == "$total_count" ]]; then
                    running_pods=$((running_pods + 1))
                    if [[ "$DETAILED" == "true" ]]; then
                        log_success "Pod $pod_name 运行正常 ($ready)"
                    fi
                else
                    failed_pods+=("$pod_name ($status, $ready)")
                fi
            else
                failed_pods+=("$pod_name ($status, $ready)")
            fi
        fi
    done <<< "$pods"
    
    log_info "Pod状态: $running_pods/$total_pods 运行正常"
    
    if [[ ${#failed_pods[@]} -gt 0 ]]; then
        log_warning "以下Pod状态异常:"
        for pod in "${failed_pods[@]}"; do
            echo "  - $pod"
        done
    fi
    
    # 检查服务状态
    local services
    services=$(kubectl get services -n "$NAMESPACE" --no-headers 2>/dev/null || true)
    
    if [[ -n "$services" ]]; then
        local service_count
        service_count=$(echo "$services" | wc -l)
        log_success "发现 $service_count 个服务"
        
        if [[ "$DETAILED" == "true" ]]; then
            echo "$services"
        fi
    else
        log_warning "命名空间 $NAMESPACE 中没有服务"
    fi
    
    # 检查Ingress状态
    local ingress
    ingress=$(kubectl get ingress -n "$NAMESPACE" --no-headers 2>/dev/null || true)
    
    if [[ -n "$ingress" ]]; then
        log_success "Ingress配置存在"
        if [[ "$DETAILED" == "true" ]]; then
            echo "$ingress"
        fi
    else
        log_warning "没有找到Ingress配置"
    fi
    
    return 0
}

# Docker容器检查
check_docker_containers() {
    log_info "检查Docker容器状态..."
    
    local containers
    containers=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true)
    
    if [[ -z "$containers" ]]; then
        log_error "没有运行中的Docker容器"
        return 1
    fi
    
    local emr_containers
    emr_containers=$(echo "$containers" | grep -E "(emr|blockchain)" || true)
    
    if [[ -z "$emr_containers" ]]; then
        log_error "没有找到EMR相关的容器"
        return 1
    fi
    
    log_success "找到EMR相关容器:"
    echo "$emr_containers"
    
    return 0
}

# 数据库连接检查
check_database() {
    log_info "检查数据库连接..."
    
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        local mysql_pod
        mysql_pod=$(kubectl get pods -n "$NAMESPACE" -l component=mysql --no-headers -o custom-columns=":metadata.name" 2>/dev/null | head -n1)
        
        if [[ -z "$mysql_pod" ]]; then
            log_error "没有找到MySQL Pod"
            return 1
        fi
        
        if kubectl exec -n "$NAMESPACE" "$mysql_pod" -- mysql -u root -ppassword -e "SELECT 1" &>/dev/null; then
            log_success "MySQL数据库连接正常"
        else
            log_error "MySQL数据库连接失败"
            return 1
        fi
        
        # 检查数据库表
        local tables
        tables=$(kubectl exec -n "$NAMESPACE" "$mysql_pod" -- mysql -u root -ppassword emr_blockchain -e "SHOW TABLES" 2>/dev/null | tail -n +2 || true)
        
        if [[ -n "$tables" ]]; then
            local table_count
            table_count=$(echo "$tables" | wc -l)
            log_success "数据库包含 $table_count 个表"
            
            if [[ "$DETAILED" == "true" ]]; then
                echo "数据库表: $tables"
            fi
        else
            log_warning "数据库中没有表或无法访问"
        fi
    else
        # Docker模式下的数据库检查
        if docker exec blockchain-emr-mysql mysql -u root -ppassword -e "SELECT 1" &>/dev/null; then
            log_success "MySQL数据库连接正常"
        else
            log_error "MySQL数据库连接失败"
            return 1
        fi
    fi
    
    return 0
}

# IPFS节点检查
check_ipfs() {
    log_info "检查IPFS节点状态..."
    
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        local ipfs_pod
        ipfs_pod=$(kubectl get pods -n "$NAMESPACE" -l component=ipfs --no-headers -o custom-columns=":metadata.name" 2>/dev/null | head -n1)
        
        if [[ -z "$ipfs_pod" ]]; then
            log_error "没有找到IPFS Pod"
            return 1
        fi
        
        if kubectl exec -n "$NAMESPACE" "$ipfs_pod" -- ipfs id &>/dev/null; then
            log_success "IPFS节点运行正常"
            
            if [[ "$DETAILED" == "true" ]]; then
                local ipfs_id
                ipfs_id=$(kubectl exec -n "$NAMESPACE" "$ipfs_pod" -- ipfs id --format="<id>" 2>/dev/null || true)
                if [[ -n "$ipfs_id" ]]; then
                    echo "IPFS节点ID: $ipfs_id"
                fi
            fi
        else
            log_error "IPFS节点状态异常"
            return 1
        fi
    else
        # Docker模式下的IPFS检查
        if docker exec blockchain-emr-ipfs ipfs id &>/dev/null; then
            log_success "IPFS节点运行正常"
        else
            log_error "IPFS节点状态异常"
            return 1
        fi
    fi
    
    return 0
}

# 应用服务检查
check_application_services() {
    log_info "检查应用服务..."
    
    local base_url
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        base_url="https://$DOMAIN"
    else
        base_url="http://localhost"
    fi
    
    # 检查前端服务
    if [[ "$SKIP_EXTERNAL" != "true" ]]; then
        http_health_check "$base_url" "200" "前端服务"
    fi
    
    # 检查后端健康检查
    if [[ "$SKIP_EXTERNAL" != "true" ]]; then
        http_health_check "$base_url/health" "200" "后端健康检查"
    fi
    
    # 检查API文档
    if [[ "$SKIP_EXTERNAL" != "true" ]]; then
        http_health_check "$base_url/api-docs" "200" "API文档"
    fi
    
    # 内部服务检查（仅Kubernetes）
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        # 检查后端服务内部端点
        local backend_pod
        backend_pod=$(kubectl get pods -n "$NAMESPACE" -l component=backend --no-headers -o custom-columns=":metadata.name" 2>/dev/null | head -n1)
        
        if [[ -n "$backend_pod" ]]; then
            if kubectl exec -n "$NAMESPACE" "$backend_pod" -- curl -f http://localhost:3001/health &>/dev/null; then
                log_success "后端服务内部健康检查通过"
            else
                log_warning "后端服务内部健康检查失败"
            fi
        fi
        
        # 检查前端服务内部端点
        local frontend_pod
        frontend_pod=$(kubectl get pods -n "$NAMESPACE" -l component=frontend --no-headers -o custom-columns=":metadata.name" 2>/dev/null | head -n1)
        
        if [[ -n "$frontend_pod" ]]; then
            if kubectl exec -n "$NAMESPACE" "$frontend_pod" -- curl -f http://localhost:3004/health &>/dev/null; then
                log_success "前端服务内部健康检查通过"
            else
                log_warning "前端服务内部健康检查失败"
            fi
        fi
    fi
    
    return 0
}

# SSL证书检查
check_ssl_certificate() {
    if [[ "$SKIP_EXTERNAL" == "true" ]] || [[ "$DEPLOYMENT_MODE" == "docker" ]]; then
        return 0
    fi
    
    log_info "检查SSL证书..."
    
    local cert_info
    cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || true)
    
    if [[ -n "$cert_info" ]]; then
        log_success "SSL证书有效"
        
        if [[ "$DETAILED" == "true" ]]; then
            echo "$cert_info"
        fi
        
        # 检查证书过期时间
        local not_after
        not_after=$(echo "$cert_info" | grep "notAfter" | cut -d'=' -f2)
        
        if [[ -n "$not_after" ]]; then
            local expiry_timestamp
            expiry_timestamp=$(date -d "$not_after" +%s 2>/dev/null || true)
            
            if [[ -n "$expiry_timestamp" ]]; then
                local current_timestamp
                current_timestamp=$(date +%s)
                local days_until_expiry
                days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [[ $days_until_expiry -lt 7 ]]; then
                    log_warning "SSL证书将在 $days_until_expiry 天后过期"
                elif [[ $days_until_expiry -lt 30 ]]; then
                    log_info "SSL证书将在 $days_until_expiry 天后过期"
                else
                    log_success "SSL证书有效期还有 $days_until_expiry 天"
                fi
            fi
        fi
    else
        log_error "SSL证书检查失败"
        return 1
    fi
    
    return 0
}

# 性能基准测试
performance_benchmark() {
    if [[ "$SKIP_EXTERNAL" == "true" ]]; then
        return 0
    fi
    
    log_info "执行性能基准测试..."
    
    local base_url
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        base_url="https://$DOMAIN"
    else
        base_url="http://localhost"
    fi
    
    # 简单的响应时间测试
    local response_time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$base_url/health" 2>/dev/null || echo "0")
    
    if [[ "$response_time" != "0" ]]; then
        local response_ms
        response_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null | cut -d'.' -f1)
        
        if [[ $response_ms -lt 1000 ]]; then
            log_success "响应时间: ${response_ms}ms (良好)"
        elif [[ $response_ms -lt 2000 ]]; then
            log_warning "响应时间: ${response_ms}ms (一般)"
        else
            log_error "响应时间: ${response_ms}ms (较慢)"
        fi
    else
        log_warning "无法测量响应时间"
    fi
    
    return 0
}

# 生成验证报告
generate_report() {
    local report_file="deployment-verification-$(date +%Y%m%d-%H%M%S).txt"
    
    log_info "生成验证报告: $report_file"
    
    cat > "$report_file" << EOF
EMR区块链系统部署验证报告
==============================

验证时间: $(date)
部署模式: $DEPLOYMENT_MODE
域名: $DOMAIN
命名空间: $NAMESPACE

系统状态:
EOF
    
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        echo "\nKubernetes资源:" >> "$report_file"
        kubectl get all -n "$NAMESPACE" >> "$report_file" 2>/dev/null || echo "无法获取资源信息" >> "$report_file"
    else
        echo "\nDocker容器:" >> "$report_file"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" >> "$report_file" 2>/dev/null || echo "无法获取容器信息" >> "$report_file"
    fi
    
    echo "\n验证完成时间: $(date)" >> "$report_file"
    
    log_success "验证报告已生成: $report_file"
}

# 主验证函数
main() {
    echo "🏥 EMR区块链系统部署验证"
    echo "=============================="
    
    # 解析参数
    parse_args "$@"
    
    # 显示配置
    log_info "验证配置:"
    echo "  模式: $DEPLOYMENT_MODE"
    echo "  域名: $DOMAIN"
    echo "  命名空间: $NAMESPACE"
    echo "  超时: ${TIMEOUT}s"
    [[ "$SKIP_EXTERNAL" == "true" ]] && echo "  跳过外部检查: 是"
    [[ "$DETAILED" == "true" ]] && echo "  详细模式: 是"
    echo
    
    local failed_checks=0
    
    # 检查必要的命令
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        if ! check_command kubectl; then
            exit 1
        fi
    else
        if ! check_command docker; then
            exit 1
        fi
    fi
    
    # 执行各项检查
    log_info "开始验证部署状态..."
    echo
    
    # 1. 基础资源检查
    if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
        if ! check_k8s_resources; then
            failed_checks=$((failed_checks + 1))
        fi
    else
        if ! check_docker_containers; then
            failed_checks=$((failed_checks + 1))
        fi
    fi
    
    echo
    
    # 2. 数据库检查
    if ! check_database; then
        failed_checks=$((failed_checks + 1))
    fi
    
    echo
    
    # 3. IPFS检查
    if ! check_ipfs; then
        failed_checks=$((failed_checks + 1))
    fi
    
    echo
    
    # 4. 应用服务检查
    if ! check_application_services; then
        failed_checks=$((failed_checks + 1))
    fi
    
    echo
    
    # 5. SSL证书检查
    if ! check_ssl_certificate; then
        failed_checks=$((failed_checks + 1))
    fi
    
    echo
    
    # 6. 性能基准测试
    performance_benchmark
    
    echo
    
    # 生成报告
    generate_report
    
    echo
    
    # 总结
    if [[ $failed_checks -eq 0 ]]; then
        log_success "🎉 所有验证检查都通过了！"
        echo "系统部署成功，可以正常使用。"
        
        if [[ "$DEPLOYMENT_MODE" == "kubernetes" ]]; then
            echo "访问地址: https://$DOMAIN"
        else
            echo "访问地址: http://localhost"
        fi
        
        exit 0
    else
        log_error "❌ 有 $failed_checks 项检查失败"
        echo "请检查上述错误信息并修复问题后重新验证。"
        exit 1
    fi
}

# 信号处理
trap 'log_error "验证被中断"; exit 1' INT TERM

# 如果脚本被直接执行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi