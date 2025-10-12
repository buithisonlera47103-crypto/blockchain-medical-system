#!/bin/bash

# 获取token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Admin123!"}' | jq -r '.token')

echo "Token获取成功: ${TOKEN:0:50}..."
echo ""

# 测试1: 获取病历列表
echo "=== 测试1: 获取病历列表 (前5条) ==="
curl -s -X GET "http://localhost:3001/api/v1/records?page=1&pageSize=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== 测试2: 获取第一条病历的ID ==="
RECORD_ID=$(curl -s -X GET "http://localhost:3001/api/v1/records?page=1&pageSize=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq -r '.records[0].record_id')

echo "第一条病历ID: $RECORD_ID"

if [ "$RECORD_ID" != "null" ] && [ -n "$RECORD_ID" ]; then
  echo ""
  echo "=== 测试3: 获取单个病历详情 ==="
  curl -s -X GET "http://localhost:3001/api/v1/records/$RECORD_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq '.'
fi
