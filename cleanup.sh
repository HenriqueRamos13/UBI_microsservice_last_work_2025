#!/bin/bash

echo "🔄 Stopping Kubernetes services..."
kubectl delete -f k8s-services.yaml 2>/dev/null || true
kubectl delete -f k8s-postgres.yaml 2>/dev/null || true

echo "🛑 Stopping Minikube..."
minikube stop

echo "🧹 Cleaning up Docker resources..."
DOCKER_CONTEXT=$(docker context show)

if [ "$DOCKER_CONTEXT" = "minikube" ]; then
    echo "Switching back to default Docker context..."
    docker context use default
fi

echo "Stopping all Docker containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "✨ Cleanup complete!"
echo "To start the services again, run: ./k8s-setup.sh" 