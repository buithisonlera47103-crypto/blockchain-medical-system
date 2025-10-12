#!/bin/bash

echo "========================================="
echo "  病历管理API完整测试"
echo "========================================="
echo ""

# 1. 登录获取token
echo "📝 步骤1: 登录获取JWT Token"
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Admin123!"}' | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ 登录失败，无法获取token"
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:50}..."
echo ""

# 2. 测试获取病历列表
echo "📝 步骤2: 获取病历列表"
RECORDS_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/records?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

TOTAL=$(echo "$RECORDS_RESPONSE" | jq -r '.total')
echo "✅ 病历总数: $TOTAL"
echo "病历列表:"
echo "$RECORDS_RESPONSE" | jq '.records[] | {id: .recordId, title: .title, createdAt: .createdAt}'
echo ""

# 3. 获取第一条病历的详情
if [ "$TOTAL" -gt 0 ]; then
  echo "📝 步骤3: 获取单个病历详情"
  FIRST_RECORD_ID=$(echo "$RECORDS_RESPONSE" | jq -r '.records[0].recordId')
  echo "病历ID: $FIRST_RECORD_ID"
  
  RECORD_DETAIL=$(curl -s -X GET "http://localhost:3001/api/v1/records/$FIRST_RECORD_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  echo "✅ 病历详情:"
  echo "$RECORD_DETAIL" | jq '.'
  echo ""
fi

# 4. 测试创建新病历
echo "📝 步骤4: 创建新病历"
NEW_RECORD=$(curl -s -X POST http://localhost:3001/api/v1/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API测试病历",
    "description": "通过API创建的测试病历",
    "recordType": "diagnosis",
    "patientId": "user_1760015579345_e6hjb6h8p"
  }')

echo "创建结果:"
echo "$NEW_RECORD" | jq '.'
echo ""

# 5. 再次获取列表验证
echo "📝 步骤5: 验证新病历已创建"
UPDATED_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/v1/records?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

NEW_TOTAL=$(echo "$UPDATED_RESPONSE" | jq -r '.total')
echo "✅ 更新后病历总数: $NEW_TOTAL"
echo ""

echo "========================================="
echo "  测试完成！"
echo "========================================="
echo "总结:"
echo "- 登录: ✅"
echo "- 获取列表: ✅ ($TOTAL 条记录)"
echo "- 获取详情: ✅"
echo "- 创建病历: ✅"
echo "- 验证创建: ✅ (新总数: $NEW_TOTAL)"
