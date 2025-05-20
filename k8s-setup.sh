#!/bin/bash
minikube start --driver=docker

eval $(minikube docker-env)

echo "Building Docker images in Minikube..."
docker build -t auth:latest ./auth
docker build -t users:latest ./users
docker build -t tasks:latest ./tasks
docker build -t orchestrator:latest ./orchestrator

echo "Applying Kubernetes manifests..."
kubectl apply -f k8s-postgres.yaml
kubectl apply -f k8s-services.yaml

echo "Waiting for services to start..."
kubectl wait --for=condition=available deployment/postgres --timeout=120s
kubectl wait --for=condition=available deployment/auth --timeout=120s
kubectl wait --for=condition=available deployment/users --timeout=120s
kubectl wait --for=condition=available deployment/tasks --timeout=120s
kubectl wait --for=condition=available deployment/orchestrator --timeout=120s

echo "Services deployed. Access the orchestrator service at:"
minikube service orchestrator --url 

echo "Get the URL and open on <URL>/docs"