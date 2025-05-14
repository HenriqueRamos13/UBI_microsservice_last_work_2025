require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

function verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key_that_should_be_big_and_random';
const JWT_EXPIRY = '1d';

fastify.register(cors, { origin: true });

fastify.get('/health', async () => {
    return { status: 'ok' };
});

fastify.post('/auth/register', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
        reply.code(400);
        return { error: 'Email and password are required' };
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


        const { hash, salt } = hashPassword(password);


        const result = await db.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, `${hash}:${salt}`]
        );

        const user = result.rows[0];


        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        return { user, token };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});

fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
        reply.code(400);
        return { error: 'Email and password are required' };
    }

    try {

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            reply.code(401);
            return { error: 'Invalid credentials' };
        }

        const user = result.rows[0];


        const [storedHash, salt] = user.password.split(':');
        const validPassword = verifyPassword(password, storedHash, salt);

        if (!validPassword) {
            reply.code(401);
            return { error: 'Invalid credentials' };
        }


        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );


        delete user.password;

        return { user, token };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});

fastify.post('/auth/token-verify', async (request, reply) => {
    const { token } = request.body;

    if (!token) {
        reply.code(400);
        return { error: 'Token is required' };
    }

    try {

        const decoded = jwt.verify(token, JWT_SECRET);


        const result = await db.query(
            'SELECT id, email, created_at FROM users WHERE id = $1',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            reply.code(401);
            return { error: 'Invalid token' };
        }

        const user = result.rows[0];

        return { user };
    } catch (error) {
        fastify.log.error(error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            reply.code(401);
            return { error: 'Invalid or expired token' };
        }

        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`Auth service running on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start(); 