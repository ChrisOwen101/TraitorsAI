#!/bin/bash

# Kill processes on frontend port (5173)
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Kill processes on backend port (3000)
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "Ports 3000 and 5173 have been cleared"
