#!/bin/bash
# Run this script from the rateit-local folder on your server
set -e
echo "🔨 Building and restarting RateIt..."
docker compose down
docker compose up -d --build
echo "✅ Done! RateIt is running at http://$(hostname -I | awk '{print $1}'):3000"
