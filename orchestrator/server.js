require('dotenv').config();
const fastify = require('fastify')({
    logger: true
});
const cors = require('@fastify/cors');
const axios = require('axios');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3002';
const TASKS_SERVICE_URL = process.env.TASKS_SERVICE_URL || 'http://localhost:3003';

fastify.register(cors, {
    origin: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});

(async () => {
    await fastify.register(swagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'Task Management API',
                description: 'Task Management System API Documentation',
                version: '1.0.0'
            },
            servers: [
                {
                    url: '/',
                    description: 'Current server'
                }
            ],
            tags: [
                { name: 'auth', description: 'Authentication endpoints' },
                { name: 'users', description: 'User management endpoints' },
                { name: 'tasks', description: 'Task management endpoints' },
                { name: 'health', description: 'Health check endpoint' }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'apiKey',
                        name: 'Authorization',
                        in: 'header'
                    }
                }
            }
        }
    });


    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false
        },
        staticCSP: true
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


    fastify.get('/health', {
        schema: {
            tags: ['health'],
            summary: 'Health check endpoint',
            description: 'Returns the health status of all services',
            response: {
                200: {
                    description: 'Health status of all services',
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        services: {
                            type: 'object',
                            properties: {
                                auth: { type: 'string' },
                                users: { type: 'string' },
                                tasks: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async () => {
        const services = {
            auth: AUTH_SERVICE_URL,
            users: USERS_SERVICE_URL,
            tasks: TASKS_SERVICE_URL
        };

        const healthStatus = {
            status: 'ok',
            services: {}
        };

        for (const [service, url] of Object.entries(services)) {
            try {
                const response = await axios.get(`${url}/health`);
                healthStatus.services[service] = response.data.status;
            } catch (error) {
                healthStatus.services[service] = 'error';
                healthStatus.status = 'failed';
            }
        }

        return healthStatus;
    });


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

    fastify.put('/users/update', {
        schema: {
            tags: ['users'],
            summary: 'Update current user',
            description: 'Update the authenticated user\'s information',
            security: [{ bearerAuth: [] }],
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
            const response = await axios.put(`${USERS_SERVICE_URL}/users/update`, request.body, {
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

    fastify.delete('/users/delete-account', {
        schema: {
            tags: ['users'],
            summary: 'Delete user account',
            description: 'Delete the authenticated user\'s account',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    description: 'Account deleted successfully',
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
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
            const response = await axios.delete(`${USERS_SERVICE_URL}/users/delete-account`, {
                headers: { authorization: request.headers.authorization }
            });
            return response.data;
        } catch (error) {
            fastify.log.error(error);
            reply.code(error.response?.status || 500);
            return { error: error.response?.data?.error || 'Internal Server Error' };
        }
    });

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
            description: 'Delete a task by its ID. Users can only delete their own tasks.',
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
                    description: 'Task not found or unauthorized',
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
                    type: 'object',
                    properties: {
                        tasks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    title: { type: 'string' },
                                    description: { type: ['string', 'null'] },
                                    done: { type: 'boolean' },
                                    user_id: { type: 'string' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    updated_at: { type: ['string', 'null'], format: 'date-time' }
                                }
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
        },
        preHandler: verifyToken
    }, async (request, reply) => {
        try {
            const response = await axios.get(`${TASKS_SERVICE_URL}/tasks/get`, {
                headers: { authorization: request.headers.authorization }
            });
            return response.data;
        } catch (error) {
            fastify.log.error(error);
            reply.code(error.response?.status || 500);
            return { error: error.response?.data?.error || 'Internal Server Error' };
        }
    });


    await fastify.ready();

    console.log(fastify.swagger());


    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server is up at http://localhost:3000');
    console.log('Docs UI:       http://localhost:3000/docs');
})().catch(err => {
    console.error(err);
    process.exit(1);
});
