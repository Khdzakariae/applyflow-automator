#!/bin/bash

# Reset Motivation Letters API Test Script

# Configuration
API_URL="http://localhost:3000/api/ausbildung/reset-letters"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZzQ4enhnaTAwMDB1aW11amx1cHQ4MDgiLCJlbWFpbCI6ImFuYXNzYWhmaWRpLmF1c3NiaWxkdW5nQGdtYWlsLmNvbSIsImlhdCI6MTc1OTA5NzExMiwiZXhwIjoxNzU5NzAxOTEyfQ.K1P1TXidpjSO2GUF8KbBe18TyDQYUYd7PjCV-0k2ho4"

echo "🧹 Motivation Letters Reset Tool"
echo "================================="
echo ""
echo "⚠️  WARNING: This will DELETE ALL motivation letters!"
echo "⚠️  This action cannot be undone!"
echo ""

read -p "🤔 Are you sure you want to continue? (type 'yes'): " confirmation

if [ "$confirmation" = "yes" ]; then
    echo ""
    echo "🔄 Sending reset request..."
    
    curl -X DELETE "$API_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -w "\n\nHTTP Status: %{http_code}\n" \
        | python3 -m json.tool 2>/dev/null || echo "Response received but not valid JSON"
    
    echo ""
    echo "✅ Request completed!"
else
    echo "❌ Operation cancelled."
fi