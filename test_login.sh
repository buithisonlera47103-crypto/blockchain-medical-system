#!/bin/bash
echo "🧪 Testing Login API..."
echo ""
echo "1️⃣ Testing login with testadmin..."
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"Admin123!"}' \
  -s | jq '.'
echo ""
echo "✅ Login test complete!"
