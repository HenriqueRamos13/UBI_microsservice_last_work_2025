require('dotenv').config();
const fastify = require('fastify')({
    logger: true
});
const cors = require('@fastify/cors');
const axios = require('axios');

// Import Swagger plugins
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');

// Import Zod for schema validation
const { jsonSchemaTransform } = require('fastify-type-provider-zod');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3002';
const TASKS_SERVICE_URL = process.env.TASKS_SERVICE_URL || 'http://localhost:3003';

// Register CORS
fastify.register(cors, { origin: true });

// Register Swagger
fastify.register(swagger, {
    routePrefix: '/documentation/json',
    swagger: {
        info: {
            title: 'Task Management API',
            description: 'Task Management System API Documentation',
            version: '1.0.0'
        },
        host: 'localhost:3000',
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
            { name: 'auth', description: 'Authentication endpoints' },
            { name: 'users', description: 'User management endpoints' },
            { name: 'tasks', description: 'Task management endpoints' },
            { name: 'health', description: 'Health check endpoint' }
        ],
        securityDefinitions: {
            bearerAuth: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header'
            }
        }
    },
    exposeRoute: true
});

// Register Swagger UI
fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false
    },
    staticCSP: true,
    transformSpecificationClone: true
});

fastify.get('/health', {
    schema: {
        tags: ['health'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the API',
        response: {
            200: {
                description: 'Successful response',
                type: 'object',
                properties: {
                    status: { type: 'string' }
                }
            }
        }
    }
}, async () => {
    return { status: 'ok' };
});

// Auth routes
fastify.post('/auth/register', {
    schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        description: 'Register a new user in the system',
        body: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 }
            }
        },
        response: {
            200: {
                description: 'Successful registration',
                type: 'object',
                properties: {
                    token: { type: 'string' },
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            email: { type: 'string' }
                        }
                    }
                }
            },
            400: {
                description: 'Bad Request',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    }
}, async (request, reply) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, request.body);
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.post('/auth/login', {
    schema: {
        tags: ['auth'],
        summary: 'Login user',
        description: 'Authenticate a user and return a JWT token',
        body: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' }
            }
        },
        response: {
            200: {
                description: 'Successful login',
                type: 'object',
                properties: {
                    token: { type: 'string' },
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            email: { type: 'string' }
                        }
                    }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    }
}, async (request, reply) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/login`, request.body);
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.post('/auth/token-verify', {
    schema: {
        tags: ['auth'],
        summary: 'Verify JWT token',
        description: 'Verify if a JWT token is valid',
        body: {
            type: 'object',
            required: ['token'],
            properties: {
                token: { type: 'string' }
            }
        },
        response: {
            200: {
                description: 'Token verification result',
                type: 'object',
                properties: {
                    valid: { type: 'boolean' },
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            email: { type: 'string' }
                        }
                    }
                }
            },
            401: {
                description: 'Invalid token',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    }
}, async (request, reply) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/token-verify`, request.body);
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

const verifyToken = async (request, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
        reply.code(401);
        throw new Error('No token provided');
    }

    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/token-verify`, { token });
        request.user = response.data.user;
    } catch (error) {
        reply.code(401);
        throw new Error('Invalid token');
    }
};

// User routes
fastify.post('/users/create', {
    schema: {
        tags: ['users'],
        summary: 'Create a new user',
        description: 'Create a new user in the system',
        security: [
            { bearerAuth: [] }
        ],
        body: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 }
            }
        },
        response: {
            200: {
                description: 'User created successfully',
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    email: { type: 'string' }
                }
            },
            400: {
                description: 'Bad Request',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const response = await axios.post(`${USERS_SERVICE_URL}/users/create`, request.body, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.put('/users/update/:id', {
    schema: {
        tags: ['users'],
        summary: 'Update a user',
        description: 'Update an existing user',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string' }
            }
        },
        body: {
            type: 'object',
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 }
            }
        },
        response: {
            200: {
                description: 'User updated successfully',
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    email: { type: 'string' }
                }
            },
            400: {
                description: 'Bad Request',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            404: {
                description: 'User not found',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const { id } = request.params;
        const response = await axios.put(`${USERS_SERVICE_URL}/users/update/${id}`, request.body, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.get('/users/get/:id', {
    schema: {
        tags: ['users'],
        summary: 'Get user by ID',
        description: 'Get a user by their ID',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string' }
            }
        },
        response: {
            200: {
                description: 'User found',
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    email: { type: 'string' }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            404: {
                description: 'User not found',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const { id } = request.params;
        const response = await axios.get(`${USERS_SERVICE_URL}/users/get/${id}`, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

// Task routes
fastify.post('/tasks/create', {
    schema: {
        tags: ['tasks'],
        summary: 'Create a new task',
        description: 'Create a new task for the authenticated user',
        security: [{ bearerAuth: [] }],
        body: {
            type: 'object',
            required: ['title'],
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                done: { type: 'boolean', default: false }
            }
        },
        response: {
            200: {
                description: 'Task created successfully',
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    done: { type: 'boolean' },
                    userId: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            400: {
                description: 'Bad Request',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const response = await axios.post(`${TASKS_SERVICE_URL}/tasks/create`, {
            ...request.body,
            userId: request.user.id
        }, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.put('/tasks/update/:id', {
    schema: {
        tags: ['tasks'],
        summary: 'Update a task',
        description: 'Update an existing task',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string' }
            }
        },
        body: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                done: { type: 'boolean' }
            }
        },
        response: {
            200: {
                description: 'Task updated successfully',
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    done: { type: 'boolean' },
                    userId: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            400: {
                description: 'Bad Request',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            404: {
                description: 'Task not found',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const { id } = request.params;
        const response = await axios.put(`${TASKS_SERVICE_URL}/tasks/update/${id}`, request.body, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.get('/tasks/get/:id', {
    schema: {
        tags: ['tasks'],
        summary: 'Get task by ID',
        description: 'Get a task by its ID',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string' }
            }
        },
        response: {
            200: {
                description: 'Task found',
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    done: { type: 'boolean' },
                    userId: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            404: {
                description: 'Task not found',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const { id } = request.params;
        const response = await axios.get(`${TASKS_SERVICE_URL}/tasks/get/${id}`, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.delete('/tasks/delete/:id', {
    schema: {
        tags: ['tasks'],
        summary: 'Delete task by ID',
        description: 'Delete a task by its ID',
        security: [{ bearerAuth: [] }],
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'string' }
            }
        },
        response: {
            200: {
                description: 'Task deleted successfully',
                type: 'object',
                properties: {
                    success: { type: 'boolean' }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            },
            404: {
                description: 'Task not found',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const { id } = request.params;
        const response = await axios.delete(`${TASKS_SERVICE_URL}/tasks/delete/${id}`, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

fastify.get('/tasks/get', {
    schema: {
        tags: ['tasks'],
        summary: 'Get all tasks',
        description: 'Get all tasks for the authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
            200: {
                description: 'List of tasks',
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        done: { type: 'boolean' },
                        userId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            },
            401: {
                description: 'Unauthorized',
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    },
    preHandler: verifyToken
}, async (request, reply) => {
    try {
        const response = await axios.get(`${TASKS_SERVICE_URL}/tasks/get?userId=${request.user.id}`, {
            headers: { authorization: request.headers.authorization }
        });
        return response.data;
    } catch (error) {
        fastify.log.error(error);
        reply.code(error.response?.status || 500);
        return { error: error.response?.data?.error || 'Internal Server Error' };
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`Orchestrator service running on ${fastify.server.address().port}`);
        console.log(`Swagger UI available at http://localhost:3000/documentation`);
        console.log(`Raw spec available at http://localhost:3000/documentation/json`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start(); 