#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}  Invoice Builder - Startup${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Step 1: Start MongoDB
echo -e "${YELLOW}Step 1: Starting MongoDB in Docker...${NC}"
docker-compose -f docker-compose.dev.yml up -d
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ MongoDB started successfully${NC}"
else
    echo -e "${RED}✗ Failed to start MongoDB${NC}"
    exit 1
fi
echo ""

# Wait for MongoDB to be ready
echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
sleep 3
echo -e "${GREEN}✓ MongoDB ready${NC}"
echo ""

# Step 2: Backend setup
echo -e "${YELLOW}Step 2: Setting up Backend...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
echo -e "${GREEN}✓ Backend ready${NC}"
echo ""

# Step 3: Frontend setup
echo -e "${YELLOW}Step 3: Setting up Frontend...${NC}"
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
echo -e "${GREEN}✓ Frontend ready${NC}"
echo ""

# Step 4: Instructions
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""
echo -e "Now run the following commands in ${YELLOW}separate terminals${NC}:"
echo ""
echo -e "${BLUE}Terminal 1 (Backend):${NC}"
echo -e "  cd backend && npm run start:dev"
echo ""
echo -e "${BLUE}Terminal 2 (Frontend):${NC}"
echo -e "  cd frontend && npm run dev"
echo ""
echo -e "Then open: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}To stop MongoDB:${NC}"
echo -e "  docker-compose -f docker-compose.dev.yml down"
echo ""

