require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const axios = require('axios');

// use the same swagger exports and transform from your Zod setup
const { fastifySwagger } = require('@fastify/swagger');
const { fastifySwaggerUi } = require('@fastify/swagger-ui');
const { jsonSchemaTransform } = require('fastify-type-provider-zod');
const { z } = require('zod');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3002';
const TASKS_SERVICE_URL = process.env.TASKS_SERVICE_URL || 'http://localhost:3003';


fastify.register(cors, { origin: true });

// 2) SWAGGER (before any routes!)
fastify.register(fastifySwagger, {
    routePrefix: '/docs',               // <-- here
    openapi: {
        info: {
            title: 'Task Management API',
            description: 'Task Management System API Documentation',
            version: '1.0.0',
        },
    },
    transform: jsonSchemaTransform,
    exposeRoute: true,
});

fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',               // <-- same prefix
    // swagger: { url: '/docs/json' }   // optional override if you want
});

// your existing routes…
fastify.get('/health', {
    schema: {
        tags: ['health'],
        summary: 'Health check endpoint',
        response: {
            200: z.object({
                status: z.string()
            })
        }
    }
}, async () => ({ status: 'ok' }));

fastify.post('/auth/register', {
    schema: {
        tags: ['auth'],
        summary: 'Register a new user',
        body: z.object({
            email: z.string().email(),
            password: z.string().min(6)
        }),
        response: {
            200: z.object({
                token: z.string(),
                user: z.object({
                    id: z.string(),
                    email: z.string()
                })
            }),
            400: z.object({
                error: z.string()
            })
        },
        security: [] // open endpoint
    }
}, async (request, reply) => {
    try {
        const { data } = await axios.post(
            `${AUTH_SERVICE_URL}/auth/register`,
            request.body
        );
        return data;
    } catch (err) {
        fastify.log.error(err);
        reply.code(err.response?.status || 500);
        return { error: err.response?.data?.error || 'Internal Server Error' };
    }
});

// …and so on for your other auth/users/tasks routes

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        fastify.log.info('Server listening on http://localhost:3000');
        fastify.log.info('Swagger UI:        http://localhost:3000/docs');
        fastify.log.info('Raw JSON schema:   http://localhost:3000/documentation/json');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
