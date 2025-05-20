require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key_that_should_be_big_and_random';

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

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        request.user = {
            id: decoded.id,
            email: decoded.email
        };
    } catch (error) {
        reply.code(401);
        throw new Error('Invalid or expired token');
    }
};


fastify.get('/health', async () => {
    return { status: 'ok' };
});

fastify.put('/users/update', { preHandler: authenticate }, async (request, reply) => {
    const { email } = request.body;
    const userId = request.user.id;

    if (!email) {
        reply.code(400);
        return { error: 'Email is required' };
    }

    try {
        const result = await db.query(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, created_at, updated_at',
            [email, userId]
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

fastify.delete('/users/delete-account', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.id;

    try {
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
        return { message: 'Account deleted successfully' };
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