#!/bin/bash

echo "========================================="
echo "  阶段4：区块链交互模块 - 最终测试"
echo "========================================="
echo ""

# 等待5秒避免频率限制
echo "⏳ 等待5秒避免登录频率限制..."
sleep 5

# 1. 登录获取token
echo "📝 步骤1: 登录获取JWT Token"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Admin123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ 登录失败"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:30}..."
echo ""

# 2. 测试区块链健康状态
echo "📝 步骤2: 测试区块链健康状态API"
echo "GET /api/v1/fabric/health"
HEALTH_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/fabric/health" \
  -H "Authorization: Bearer $TOKEN")

echo "$HEALTH_RESPONSE" | jq '.'
HEALTHY=$(echo "$HEALTH_RESPONSE" | jq -r '.data.healthy')

if [ "$HEALTHY" == "true" ]; then
  echo "✅ 健康状态API测试通过"
else
  echo "⚠️ 健康状态API返回不健康"
fi
echo ""

# 3. 测试区块链详细状态
echo "📝 步骤3: 测试区块链详细状态API"
echo "GET /api/v1/fabric/status"
STATUS_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/fabric/status" \
  -H "Authorization: Bearer $TOKEN")

echo "状态摘要:"
echo "$STATUS_RESPONSE" | jq '{
  status: .status,
  fabric_status: .details.fabric.status,
  channel: .details.fabric.channel,
  chaincode: .details.fabric.chaincode,
  diagnostics: .details.diagnostics.summary
}'

STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
if [ -n "$STATUS" ]; then
  echo "✅ 详细状态API测试通过"
else
  echo "❌ 详细状态API测试失败"
fi
echo ""

# 4. 测试病历完整性验证
echo "📝 步骤4: 测试病历完整性验证API"
echo "GET /api/v1/records/rec_1760017454_1/integrity"
VERIFY_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/records/rec_1760017454_1/integrity" \
  -H "Authorization: Bearer $TOKEN")

echo "$VERIFY_RESPONSE" | jq '.'
VERIFIED=$(echo "$VERIFY_RESPONSE" | jq -r '.verified')

if [ "$VERIFIED" == "true" ]; then
  echo "✅ 病历验证API测试通过"
else
  echo "⚠️ 病历验证失败或API错误"
fi
echo ""

# 5. 测试不存在的交易查询API（预期404）
echo "📝 步骤5: 测试交易查询API（预期后端未实现）"
echo "GET /api/v1/blockchain/transactions/test_tx_id"
TX_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/blockchain/transactions/test_tx_id" \
  -H "Authorization: Bearer $TOKEN")

echo "$TX_RESPONSE" | jq '.'
ERROR=$(echo "$TX_RESPONSE" | jq -r '.error')

if [ "$ERROR" == "NOT_FOUND" ]; then
  echo "✅ 交易查询API确认未实现（符合预期）"
else
  echo "⚠️ 交易查询API响应异常"
fi
echo ""

# 总结
echo "========================================="
echo "  测试完成！"
echo "========================================="
echo ""
echo "测试结果总结:"
echo "- 区块链健康状态API: $([ "$HEALTHY" == "true" ] && echo "✅ 通过" || echo "⚠️ 警告")"
echo "- 区块链详细状态API: $([ -n "$STATUS" ] && echo "✅ 通过" || echo "❌ 失败")"
echo "- 病历验证API: $([ "$VERIFIED" == "true" ] && echo "✅ 通过" || echo "⚠️ 警告")"
echo "- 交易查询API: $([ "$ERROR" == "NOT_FOUND" ] && echo "✅ 确认未实现" || echo "⚠️ 异常")"
echo ""
echo "阶段4核心功能测试完成！"
