#!/bin/bash

echo "Starting Illinois Estate Law Staff Portal..."
echo "==========================================="

# Start backend
echo "Starting backend server on port 8000..."
cd /tmp/cc-agent/63370590/project/backend
nohup python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 2

# Start frontend proxy server
echo "Starting frontend server on port 3000..."
cd /tmp/cc-agent/63370590/project
nohup node serve-with-proxy.js > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

sleep 2

echo ""
echo "==========================================="
echo "Application is running!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "==========================================="
echo ""
echo "Default login credentials:"
echo "  Email: contact@illinoisestatelaw.com"
echo "  Password: admin123"
echo ""
echo "To stop the servers:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Log files:"
echo "  Backend:  /tmp/backend.log"
echo "  Frontend: /tmp/frontend.log"
