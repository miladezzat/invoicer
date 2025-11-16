#!/bin/bash

# Invoicer - Local Web Server Launcher
# This script starts a simple web server for the invoice app

echo "🚀 Starting Invoicer Web Server..."
echo ""
echo "📁 Serving from: $(pwd)"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✓ Using Python 3"
    echo ""
    echo "🌐 Opening Invoicer at: http://localhost:8000"
    echo ""
    echo "📝 Instructions:"
    echo "   1. Your browser will open automatically"
    echo "   2. Click 'Connect Gmail' to authorize"
    echo "   3. Start creating invoices!"
    echo ""
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    
    # Open browser after 2 seconds
    sleep 2
    open http://localhost:8000/index.html 2>/dev/null || xdg-open http://localhost:8000/index.html 2>/dev/null &
    
    # Start server
    python3 -m http.server 8000

# Check if Python 2 is available
elif command -v python &> /dev/null; then
    echo "✓ Using Python 2"
    echo ""
    echo "🌐 Opening Invoicer at: http://localhost:8000"
    echo ""
    echo "📝 Instructions:"
    echo "   1. Your browser will open automatically"
    echo "   2. Click 'Connect Gmail' to authorize"
    echo "   3. Start creating invoices!"
    echo ""
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    
    # Open browser after 2 seconds
    sleep 2
    open http://localhost:8000/index.html 2>/dev/null || xdg-open http://localhost:8000/index.html 2>/dev/null &
    
    # Start server
    python -m SimpleHTTPServer 8000

else
    echo "❌ Python not found!"
    echo ""
    echo "Please install Python or use one of these alternatives:"
    echo ""
    echo "Node.js (if installed):"
    echo "  npx http-server -p 8000"
    echo ""
    echo "PHP (if installed):"
    echo "  php -S localhost:8000"
    echo ""
    echo "Or just double-click index.html and use Simple Mode!"
    exit 1
fi

