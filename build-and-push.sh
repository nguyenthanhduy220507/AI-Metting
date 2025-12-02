#!/bin/bash

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Set defaults if not provided
DOCKER_USERNAME=${DOCKER_USERNAME:-nguyenthanhduy220507}
VERSION=${VERSION:-latest}

echo "🐳 Building Docker images..."
echo "Docker Hub Username: $DOCKER_USERNAME"
echo "Version: $VERSION"
echo ""

# Build backend
echo "📦 Building backend..."
docker build -t $DOCKER_USERNAME/ai-meeting-backend:$VERSION ./backend
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi
echo "✅ Backend build complete"
echo ""

# Build frontend dashboard
echo "📦 Building frontend dashboard..."
docker build -t $DOCKER_USERNAME/ai-meeting-frontend:$VERSION ./fe-dashboard
if [ $? -ne 0 ]; then
    echo "❌ Frontend dashboard build failed"
    exit 1
fi
echo "✅ Frontend dashboard build complete"
echo ""

# Build Python service
echo "📦 Building Python service..."
docker build -t $DOCKER_USERNAME/ai-meeting-python:$VERSION ./python-service-metting
if [ $? -ne 0 ]; then
    echo "❌ Python service build failed"
    exit 1
fi
echo "✅ Python service build complete"
echo ""

echo "🚀 Pushing images to Docker Hub..."
echo ""

# Push images
echo "⬆️  Pushing backend..."
docker push $DOCKER_USERNAME/ai-meeting-backend:$VERSION
echo "✅ Backend pushed"
echo ""

echo "⬆️  Pushing frontend..."
docker push $DOCKER_USERNAME/ai-meeting-frontend:$VERSION
echo "✅ Frontend pushed"
echo ""

echo "⬆️  Pushing Python service..."
docker push $DOCKER_USERNAME/ai-meeting-python:$VERSION
echo "✅ Python service pushed"
echo ""

echo "✨ Done! Images pushed to Docker Hub:"
echo "  - $DOCKER_USERNAME/ai-meeting-backend:$VERSION"
echo "  - $DOCKER_USERNAME/ai-meeting-frontend:$VERSION"
echo "  - $DOCKER_USERNAME/ai-meeting-python:$VERSION"
echo ""
echo "📝 Share these images with your users!"

