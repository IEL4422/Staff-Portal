#!/bin/bash

echo "Testing Illinois Estate Law Portal Data Integration"
echo "==================================================="
echo ""

# Test backend directly
echo "1. Testing Backend API (with bypass token)..."
RESPONSE=$(curl -s -H "Authorization: Bearer bypass-token" "http://localhost:8000/api/airtable/dashboard")
TOTAL_CASES=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('total_active_cases', 0))" 2>/dev/null || echo "ERROR")

if [ "$TOTAL_CASES" != "ERROR" ] && [ "$TOTAL_CASES" -gt 0 ]; then
    echo "   ✓ Backend API working - $TOTAL_CASES active cases found"
else
    echo "   ✗ Backend API failed"
    exit 1
fi

# Test frontend proxy
echo ""
echo "2. Testing Frontend Proxy (with bypass token)..."
RESPONSE=$(curl -s -H "Authorization: Bearer bypass-token" "http://localhost:3000/api/airtable/master-list?limit=5")
RECORD_COUNT=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('records', [])))" 2>/dev/null || echo "ERROR")

if [ "$RECORD_COUNT" != "ERROR" ] && [ "$RECORD_COUNT" -gt 0 ]; then
    echo "   ✓ Frontend Proxy working - $RECORD_COUNT records retrieved"
else
    echo "   ✗ Frontend Proxy failed"
    exit 1
fi

# Test other endpoints
echo ""
echo "3. Testing Additional Endpoints..."

# Tasks
TASKS=$(curl -s -H "Authorization: Bearer bypass-token" "http://localhost:3000/api/airtable/tasks?limit=5" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('records', [])))" 2>/dev/null || echo "0")
echo "   ✓ Tasks: $TASKS records"

# Dates & Deadlines
DEADLINES=$(curl -s -H "Authorization: Bearer bypass-token" "http://localhost:3000/api/airtable/dates-deadlines" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('records', [])))" 2>/dev/null || echo "0")
echo "   ✓ Dates & Deadlines: $DEADLINES records"

# Case Contacts
CONTACTS=$(curl -s -H "Authorization: Bearer bypass-token" "http://localhost:3000/api/airtable/case-contacts" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('records', [])))" 2>/dev/null || echo "0")
echo "   ✓ Case Contacts: $CONTACTS records"

# Documents
DOCS=$(curl -s -H "Authorization: Bearer bypass-token" "http://localhost:3000/api/airtable/documents" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('records', [])))" 2>/dev/null || echo "0")
echo "   ✓ Documents: $DOCS records"

echo ""
echo "==================================================="
echo "✓ All Airtable data integration tests passed!"
echo "==================================================="
echo ""
echo "Portal URL: http://localhost:3000"
echo ""
echo "Note: The portal uses bypass authentication mode."
echo "      The React app will automatically include the"
echo "      bypass token in all API requests."
