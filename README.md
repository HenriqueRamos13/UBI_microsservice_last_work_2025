# Task Management Microservices

A simple task management system built using microservices architecture.

## Overview

The system consists of four microservices:

1. **Orchestrator**: Entry point for all API requests (port 3000)
2. **Auth**: Handles authentication and JWT token management (port 3001)
3. **Users**: Manages user data (port 3002)
4. **Tasks**: Manages task data (port 3003)

## Running with Docker Compose

For local development, use Docker Compose:

```bash
docker-compose up -d
```

This will start all microservices and a PostgreSQL database.

## Deploying with Kubernetes (Minikube)

For a production-like environment, use Kubernetes:

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

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
  ```json
  { "email": "user@example.com", "password": "password123" }
  ```

- `POST /auth/login` - Login a user
  ```json
  { "email": "user@example.com", "password": "password123" }
  ```

- `POST /auth/token-verify` - Verify JWT token
  ```json
  { "token": "your-jwt-token" }
  ```

### Users

- `POST /users/create` - Create a user (requires authentication)
  ```json
  { "email": "user@example.com" }
  ```

- `PUT /users/update/:id` - Update a user (requires authentication)
  ```json
  { "email": "newuser@example.com" }
  ```

- `GET /users/get/:id` - Get a user by ID (requires authentication)

### Tasks

- `POST /tasks/create` - Create a task (requires authentication)
  ```json
  { "title": "Task title", "description": "Task description", "userId": "user-uuid" }
  ```

- `PUT /tasks/update/:id` - Update a task (requires authentication)
  ```json
  { "title": "New title", "description": "New description", "done": true }
  ```

- `GET /tasks/get/:id` - Get a task by ID (requires authentication)

- `DELETE /tasks/delete/:id` - Delete a task (requires authentication)

- `GET /tasks/get?userId=:userId` - Get all tasks for a user (requires authentication)

## Environment Variables

Each service uses the following environment variables:

**Orchestrator:**
- `AUTH_SERVICE_URL`: URL of the Auth service
- `USERS_SERVICE_URL`: URL of the Users service
- `TASKS_SERVICE_URL`: URL of the Tasks service

**All Services:**
- `DATABASE_URL`: PostgreSQL connection string

**Auth Service:**
- `JWT_SECRET`: Secret key for JWT token generation 