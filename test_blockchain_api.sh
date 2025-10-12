#!/bin/bash

echo "========================================="
echo "  区块链API完整测试"
echo "========================================="
echo ""

# 1. 登录获取token
echo "📝 步骤1: 登录获取JWT Token"
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Admin123!"}' > /tmp/login_response.json

TOKEN=$(cat /tmp/login_response.json | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ 登录失败"
  cat /tmp/login_response.json | jq '.'
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:30}..."
echo ""

# 2. 测试区块链健康状态
echo "📝 步骤2: 获取区块链健康状态"
echo "GET /api/v1/fabric/health"
curl -s -X GET "http://localhost:3001/api/v1/fabric/health" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

# 3. 测试区块链详细状态
echo "📝 步骤3: 获取区块链详细状态"
echo "GET /api/v1/fabric/status"
curl -s -X GET "http://localhost:3001/api/v1/fabric/status" \
  -H "Authorization: Bearer $TOKEN" | jq '.status, .details.fabric.status, .details.fabric.channel, .details.fabric.chaincode'
echo ""

# 4. 测试病历完整性验证
echo "📝 步骤4: 验证病历完整性"
echo "GET /api/v1/records/rec_1760017454_1/integrity"
curl -s -X GET "http://localhost:3001/api/v1/records/rec_1760017454_1/integrity" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo ""

echo "========================================="
echo "  测试完成！"
echo "========================================="
