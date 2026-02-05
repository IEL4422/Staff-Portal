#!/bin/bash

echo "🚀 Starting Illinois Estate Law Frontend..."
echo ""

# Check if Node is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found"
    exit 1
fi

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start the frontend server
echo ""
echo "✅ Frontend dependencies ready"
echo "🌐 Starting frontend server on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

npm start
