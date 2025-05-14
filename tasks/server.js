require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const db = require('./db');
const jwt = require('jsonwebtoken');


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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user info to request
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


fastify.post('/tasks/create', { preHandler: authenticate }, async (request, reply) => {
    const { title, description, userId } = request.body;

    if (!title) {
        reply.code(400);
        return { error: 'Title is required' };
    }

    if (!userId) {
        reply.code(400);
        return { error: 'User ID is required' };
    }

    try {

        const result = await db.query(
            'INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING *',
            [title, description || null, userId]
        );

        const task = result.rows[0];

        return { task };
    } catch (error) {
        fastify.log.error(error);

        if (error.code === '23503') {
            reply.code(400);
            return { error: 'Referenced user does not exist' };
        }

        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


fastify.put('/tasks/update/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const { title, description, done } = request.body;

    try {

        const taskResult = await db.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );

        if (taskResult.rows.length === 0) {
            reply.code(404);
            return { error: 'Task not found' };
        }


        const updates = [];
        const values = [];
        let paramCount = 1;

        if (title !== undefined) {
            updates.push(`title = $${paramCount}`);
            values.push(title);
            paramCount++;
        }

        if (description !== undefined) {
            updates.push(`description = $${paramCount}`);
            values.push(description);
            paramCount++;
        }

        if (done !== undefined) {
            updates.push(`done = $${paramCount}`);
            values.push(done);
            paramCount++;
        }

        updates.push(`updated_at = NOW()`);


        values.push(id);


        const result = await db.query(
            `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        const task = result.rows[0];

        return { task };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


fastify.get('/tasks/get/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;

    try {
        const result = await db.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            reply.code(404);
            return { error: 'Task not found' };
        }

        const task = result.rows[0];

        return { task };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


fastify.delete('/tasks/delete/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;

    try {

        const taskResult = await db.query(
            'SELECT * FROM tasks WHERE id = $1',
            [id]
        );

        if (taskResult.rows.length === 0) {
            reply.code(404);
            return { error: 'Task not found' };
        }


        await db.query(
            'DELETE FROM tasks WHERE id = $1',
            [id]
        );

        return { success: true };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


fastify.get('/tasks/get', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.query;

    console.log("AHAHAHHA", userId);

    if (!userId) {
        reply.code(400);
        return { error: 'User ID is required' };
    }

    try {
        const result = await db.query(
            'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        return { tasks: result.rows };
    } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        return { error: 'Internal Server Error' };
    }
});


const start = async () => {
    try {
        await fastify.listen({ port: 3003, host: '0.0.0.0' });
        console.log(`Tasks service running on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start(); 