#!/bin/sh
set -e

# 替换环境变量
if [ -n "$REACT_APP_API_URL" ]; then
    echo "Setting API URL to: $REACT_APP_API_URL"
    # 在构建的JavaScript文件中替换API URL占位符
    find /usr/share/nginx/html -name "*.js" -exec sed -i "s|REACT_APP_API_URL_PLACEHOLDER|${REACT_APP_API_URL}|g" {} \;
    
    # 在nginx配置中替换API URL
    envsubst '${REACT_APP_API_URL}' < /etc/nginx/nginx.conf > /tmp/nginx.conf
    mv /tmp/nginx.conf /etc/nginx/nginx.conf
fi

# 替换其他环境变量
if [ -n "$REACT_APP_TITLE" ]; then
    echo "Setting app title to: $REACT_APP_TITLE"
    sed -i "s|REACT_APP_TITLE_PLACEHOLDER|${REACT_APP_TITLE}|g" /usr/share/nginx/html/index.html
fi

# 创建运行时配置文件
cat > /usr/share/nginx/html/config.js << EOF
window.ENV = {
  REACT_APP_API_URL: '${REACT_APP_API_URL:-http://localhost:3001}',
  REACT_APP_TITLE: '${REACT_APP_TITLE:-区块链EMR系统}',
  REACT_APP_VERSION: '${REACT_APP_VERSION:-1.0.0}',
  REACT_APP_BUILD_TIME: '${BUILD_TIME:-unknown}'
};
EOF

echo "Environment variables configured successfully"
echo "API URL: ${REACT_APP_API_URL:-http://localhost:3001}"

# 启动nginx
exec "$@"