#!/bin/bash

echo "🔍 Invoice Builder - Service Status"
echo "===================================="
echo ""

# Check MongoDB
echo "📦 MongoDB:"
if docker ps | grep -q invoice-mongodb; then
    echo "   ✅ Running on port 27017"
else
    echo "   ❌ Not running"
fi
echo ""

# Check Backend
echo "🔧 Backend API:"
if lsof -i :3001 | grep -q LISTEN; then
    echo "   ✅ Running on http://localhost:3001"
    curl -s http://localhost:3001/api > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ API responding"
    else
        echo "   ⏳ API still initializing..."
    fi
else
    echo "   ⏳ Starting up..."
fi
echo ""

# Check Frontend
echo "🌐 Frontend:"
if lsof -i :3000 | grep -q LISTEN; then
    echo "   ✅ Running on http://localhost:3000"
else
    echo "   ⏳ Starting up..."
fi
echo ""

# Check processes
echo "📊 Running Processes:"
ps aux | grep -E "nest start|next dev" | grep -v grep | awk '{print "   - "$11,$12,$13}'
echo ""

echo "===================================="
echo "📝 To view logs:"
echo "   Backend:  tail -f backend/logs/* (if logging enabled)"
echo "   Frontend: Check terminal output"
echo ""
echo "🌍 Open: http://localhost:3000"
echo "===================================="









