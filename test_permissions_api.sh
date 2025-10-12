#!/bin/bash

echo "========================================="
echo "权限API测试脚本"
echo "========================================="
echo ""

# 获取token
echo "1. 登录获取Token..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Admin123!"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 登录失败，无法获取Token"
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:20}..."
echo ""

# 测试1: 获取权限列表
echo "2. 测试获取权限列表..."
echo "GET /api/v1/permissions"
curl -s -X GET "http://localhost:3001/api/v1/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# 测试2: 检查权限
echo "3. 测试检查权限..."
echo "POST /api/v1/permissions/check"
curl -s -X POST "http://localhost:3001/api/v1/permissions/check" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recordId":"rec_1760017454_1","action":"read"}' | jq '.'
echo ""

# 测试3: 创建访问请求
echo "4. 测试创建访问请求..."
echo "POST /api/v1/permissions/request"
curl -s -X POST "http://localhost:3001/api/v1/permissions/request" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recordId":"rec_1760017454_1",
    "action":"read",
    "purpose":"需要查看患者病历进行诊断",
    "urgency":"medium",
    "requestedDuration":24
  }' | jq '.'
echo ""

# 测试4: 获取访问请求列表
echo "5. 测试获取访问请求列表..."
echo "GET /api/v1/permissions/requests"
curl -s -X GET "http://localhost:3001/api/v1/permissions/requests?type=sent&status=all&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
