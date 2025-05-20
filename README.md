# Task Management Microservices

A simple task management system built using microservices architecture.

## Overview

The system consists of four microservices:

1. **Orchestrator**: Entry point for all API requests (port 3000)
2. **Auth**: Handles authentication and JWT token management (port 3001)
3. **Users**: Manages user data (port 3002)
4. **Tasks**: Manages task data (port 3003)

## Before all, install dependencies on each service

```bash
# Make script executable
chmod +x install-all.sh

# Run to install nodejs dependencies
./install-all.sh
```

## Running with Docker Compose

For local development, use Docker Compose:

```bash
docker-compose up -d
```

This will start all microservices and a PostgreSQL database.

## Deploying with Kubernetes (Minikube)

```bash
# Make script executable
chmod +x k8s-setup.sh

# Run setup script
./k8s-setup.sh
```

This will:
1. Start Minikube
2. Build Docker images directly in Minikube
3. Deploy all services to Kubernetes
4. Provide a URL to access the orchestrator service

## Swagger

Access the URL provided by Kubernets with /docs at the end. <URL>/docs

## Environment Variables

Each service uses the following environment variables:

**Orchestrator:**
- `AUTH_SERVICE_URL`: URL of the Auth service
- `USERS_SERVICE_URL`: URL of the Users service
- `TASKS_SERVICE_URL`: URL of the Tasks service

**All Services:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation 