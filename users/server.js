require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const db = require('./db');

fastify.register(cors, { origin: true });

const authenticate = async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
        reply.code(401);
        throw new Error('Authorization header missing');
    }

    if (!authHeader.startsWith('Bearer ')) {
        reply.code(401);
        throw new Error('Invalid token format');
    }
};


fastify.get('/health', async () => {
    return { status: 'ok' };
});


fastify.post('/users/create', { preHandler: authenticate }, async (request, reply) => {
    const { email } = request.body;

    if (!email) {
        reply.code(400);
        return { error: 'Email is required' };
    }

    try {

        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            reply.code(409);
            return { error: 'User already exists' };
        }


        const result = await db.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, 'MANAGED_BY_AUTH_SERVICE']
        );

        const user = result.rows[0];

        return { user };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


fastify.put('/users/update/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const { email } = request.body;

    if (!email) {
        reply.code(400);
        return { error: 'Email is required' };
    }

    try {

        const result = await db.query(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, created_at, updated_at',
            [email, id]
        );

        if (result.rows.length === 0) {
            reply.code(404);
            return { error: 'User not found' };
        }

        const user = result.rows[0];

        return { user };
    } catch (error) {
        fastify.log.error(error);

        if (error.code === '23505') {
            reply.code(409);
            return { error: 'Email already exists' };
        }

        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


fastify.get('/users/get/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;

    try {
        const result = await db.query(
            'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            reply.code(404);
            return { error: 'User not found' };
        }

        const user = result.rows[0];

        return { user };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


const start = async () => {
    try {
        await fastify.listen({ port: 3002, host: '0.0.0.0' });
        console.log(`Users service running on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start(); 