#!/bin/bash

# EMR区块链系统部署脚本
# 用法: ./deploy.sh [staging|production] [backend|frontend|all]

set -e

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT=${1:-staging}
COMPONENT=${2:-all}
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    local deps=("docker" "kubectl" "helm")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep 未安装或不在PATH中"
            exit 1
        fi
    done
    
    # 检查Docker是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker守护进程未运行"
        exit 1
    fi
    
    # 检查kubectl连接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "无法连接到Kubernetes集群"
        exit 1
    fi
    
    log_info "依赖检查通过"
}

# 构建Docker镜像
build_images() {
    log_info "构建Docker镜像..."
    
    local tag_suffix=""
    if [ "$ENVIRONMENT" = "staging" ]; then
        tag_suffix="-staging"
    fi
    
    if [ "$COMPONENT" = "backend" ] || [ "$COMPONENT" = "all" ]; then
        log_info "构建后端镜像..."
        cd "$PROJECT_ROOT/backend-app"
        docker build -t "emr-backend:latest${tag_suffix}" \
                     -t "emr-backend:${BUILD_TIME}${tag_suffix}" .
    fi
    
    if [ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]; then
        log_info "构建前端镜像..."
        cd "$PROJECT_ROOT/react-app"
        docker build -t "emr-frontend:latest${tag_suffix}" \
                     -t "emr-frontend:${BUILD_TIME}${tag_suffix}" \
                     --build-arg BUILD_TIME="$BUILD_TIME" .
    fi
    
    cd "$PROJECT_ROOT"
    log_info "镜像构建完成"
}

# 推送镜像到仓库
push_images() {
    log_info "推送镜像到容器仓库..."
    
    local registry="${DOCKER_REGISTRY:-ghcr.io/emr-blockchain}"
    local tag_suffix=""
    if [ "$ENVIRONMENT" = "staging" ]; then
        tag_suffix="-staging"
    fi
    
    if [ "$COMPONENT" = "backend" ] || [ "$COMPONENT" = "all" ]; then
        docker tag "emr-backend:latest${tag_suffix}" "$registry/emr-backend:latest${tag_suffix}"
        docker tag "emr-backend:${BUILD_TIME}${tag_suffix}" "$registry/emr-backend:${BUILD_TIME}${tag_suffix}"
        docker push "$registry/emr-backend:latest${tag_suffix}"
        docker push "$registry/emr-backend:${BUILD_TIME}${tag_suffix}"
    fi
    
    if [ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]; then
        docker tag "emr-frontend:latest${tag_suffix}" "$registry/emr-frontend:latest${tag_suffix}"
        docker tag "emr-frontend:${BUILD_TIME}${tag_suffix}" "$registry/emr-frontend:${BUILD_TIME}${tag_suffix}"
        docker push "$registry/emr-frontend:latest${tag_suffix}"
        docker push "$registry/emr-frontend:${BUILD_TIME}${tag_suffix}"
    fi
    
    log_info "镜像推送完成"
}

# 更新Kubernetes配置
update_k8s_configs() {
    log_info "更新Kubernetes配置..."
    
    local k8s_dir="$PROJECT_ROOT/deployment/k8s/$ENVIRONMENT"
    local registry="${DOCKER_REGISTRY:-ghcr.io/emr-blockchain}"
    
    # 备份原始配置
    cp -r "$k8s_dir" "$k8s_dir.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 替换镜像标签
    if [ "$COMPONENT" = "backend" ] || [ "$COMPONENT" = "all" ]; then
        sed -i "s|IMAGE_TAG_BACKEND|$registry/emr-backend:${BUILD_TIME}|g" "$k8s_dir"/*.yaml
    fi
    
    if [ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]; then
        sed -i "s|IMAGE_TAG_FRONTEND|$registry/emr-frontend:${BUILD_TIME}|g" "$k8s_dir"/*.yaml
    fi
    
    # 更新构建时间
    sed -i "s|\${BUILD_TIME}|$BUILD_TIME|g" "$k8s_dir"/*.yaml
    
    log_info "Kubernetes配置更新完成"
}

# 部署到Kubernetes
deploy_to_k8s() {
    log_info "部署到Kubernetes集群..."
    
    local k8s_dir="$PROJECT_ROOT/deployment/k8s/$ENVIRONMENT"
    local namespace="emr-$ENVIRONMENT"
    
    # 创建命名空间
    kubectl apply -f "$k8s_dir/namespace.yaml"
    
    # 应用配置
    kubectl apply -f "$k8s_dir/configmap.yaml"
    kubectl apply -f "$k8s_dir/secrets.yaml"
    
    # 部署应用
    if [ "$COMPONENT" = "backend" ] || [ "$COMPONENT" = "all" ]; then
        kubectl apply -f "$k8s_dir/backend-deployment.yaml"
        kubectl rollout status deployment/emr-backend-$ENVIRONMENT -n "$namespace" --timeout=600s
    fi
    
    if [ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]; then
        kubectl apply -f "$k8s_dir/frontend-deployment.yaml"
        kubectl rollout status deployment/emr-frontend-$ENVIRONMENT -n "$namespace" --timeout=600s
    fi
    
    # 应用Ingress
    kubectl apply -f "$k8s_dir/ingress.yaml"
    
    log_info "Kubernetes部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local namespace="emr-$ENVIRONMENT"
    local max_attempts=30
    local attempt=1
    
    # 等待Pod就绪
    while [ $attempt -le $max_attempts ]; do
        log_info "健康检查尝试 $attempt/$max_attempts"
        
        if [ "$COMPONENT" = "backend" ] || [ "$COMPONENT" = "all" ]; then
            if kubectl wait --for=condition=ready pod -l app=emr-backend-$ENVIRONMENT -n "$namespace" --timeout=30s; then
                log_info "后端服务健康检查通过"
            else
                log_warn "后端服务健康检查失败"
            fi
        fi
        
        if [ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]; then
            if kubectl wait --for=condition=ready pod -l app=emr-frontend-$ENVIRONMENT -n "$namespace" --timeout=30s; then
                log_info "前端服务健康检查通过"
            else
                log_warn "前端服务健康检查失败"
            fi
        fi
        
        # 检查服务可达性
        if [ "$ENVIRONMENT" = "staging" ]; then
            api_url="https://staging-api.emr-blockchain.com/api/health"
            web_url="https://staging.emr-blockchain.com/health"
        else
            api_url="https://api.emr-blockchain.com/api/health"
            web_url="https://emr-blockchain.com/health"
        fi
        
        if curl -f "$api_url" &> /dev/null; then
            log_info "API服务可达性检查通过"
            break
        else
            log_warn "API服务不可达，等待..."
            sleep 10
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "健康检查超时失败"
        exit 1
    fi
    
    log_info "健康检查完成"
}

# 回滚函数
rollback() {
    log_warn "执行回滚操作..."
    
    local namespace="emr-$ENVIRONMENT"
    
    if [ "$COMPONENT" = "backend" ] || [ "$COMPONENT" = "all" ]; then
        kubectl rollout undo deployment/emr-backend-$ENVIRONMENT -n "$namespace"
    fi
    
    if [ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]; then
        kubectl rollout undo deployment/emr-frontend-$ENVIRONMENT -n "$namespace"
    fi
    
    log_info "回滚完成"
}

# 清理函数
cleanup() {
    log_info "清理部署临时文件..."
    
    # 清理镜像标签替换的备份
    find "$PROJECT_ROOT/deployment/k8s" -name "*.backup.*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    log_info "清理完成"
}

# 主函数
main() {
    log_info "开始部署EMR区块链系统"
    log_info "环境: $ENVIRONMENT"
    log_info "组件: $COMPONENT"
    log_info "构建时间: $BUILD_TIME"
    
    # 检查参数
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        log_error "无效的环境参数: $ENVIRONMENT (支持: staging, production)"
        exit 1
    fi
    
    if [[ ! "$COMPONENT" =~ ^(backend|frontend|all)$ ]]; then
        log_error "无效的组件参数: $COMPONENT (支持: backend, frontend, all)"
        exit 1
    fi
    
    # 生产环境额外确认
    if [ "$ENVIRONMENT" = "production" ]; then
        log_warn "即将部署到生产环境，请确认继续..."
        read -p "输入 'yes' 继续: " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "部署已取消"
            exit 0
        fi
    fi
    
    # 设置错误处理
    trap rollback ERR
    trap cleanup EXIT
    
    # 执行部署步骤
    check_dependencies
    build_images
    
    # 仅在CI/CD环境中推送镜像
    if [ "${CI:-false}" = "true" ]; then
        push_images
    fi
    
    update_k8s_configs
    deploy_to_k8s
    health_check
    
    log_info "🎉 部署成功完成!"
    log_info "环境: $ENVIRONMENT"
    log_info "组件: $COMPONENT"
    log_info "版本: $BUILD_TIME"
    
    if [ "$ENVIRONMENT" = "staging" ]; then
        log_info "访问地址: https://staging.emr-blockchain.com"
        log_info "API地址: https://staging-api.emr-blockchain.com"
    else
        log_info "访问地址: https://emr-blockchain.com"
        log_info "API地址: https://api.emr-blockchain.com"
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi