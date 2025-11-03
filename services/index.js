/*
 Event Management System - Fastify Server
 
 Provides endpoints to view and add events, optimized for performance and resilience.
  - Uses an in-memory index for fast event lookups
  - Includes a circuit breaker for the external addEvent API
 */

const Fastify = require('fastify');
const { getUsers, getEvents, getEventsByUserId, addEvent } = require('../utils/dataStore');
const { CircuitBreaker } = require('../utils/circuitBreaker');

const fastify = Fastify();
const breaker = new CircuitBreaker();

//Routes

// Returns all users
fastify.get('/getUsers', async (req, reply) => {
  reply.send(getUsers());
});

// Returns all events
fastify.get('/getEvents', async (req, reply) => {
  reply.send(getEvents());
});

// Returns all events for a given user (optimized)
fastify.get('/getEventsByUserId/:id', async (req, reply) => {
  const { id } = req.params;
  const events = getEventsByUserId(id);
  reply.send(events);
});

// Adds a new event with circuit breaker protection for external API
fastify.post('/addEvent', async (req, reply) => {
  const { name, userId } = req.body || {};
  if (!name || !userId) {
    return reply.code(400).send({ error: 'Invalid payload' });
  }

  try {
    // Attempt external service call within circuit breaker
    await breaker.call(async () => {
      const res = await fetch('http://event.com/addEvent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, userId })
      });
      if (!res.ok) throw new Error('External service error');
    });

    // On success - store event locally
    const event = addEvent({ name, userId });
    reply.code(201).send({ success: true, event });

  } catch (err) {
    // Circuit breaker triggered - catchs network or circuit-breaker errors to prevent crashes
    if (err.code === 'ECIRCUIT') {
      reply.header('Retry-After', err.retryAfter);
      return reply.code(503).send({
        error: 'External service unavailable',
        retryAfter: err.retryAfter
      });
    }

    // Other failures
    reply.code(502).send({ error: 'Failed to reach external service' });
  }
});

// Server start
fastify.listen({ port: 3000, host: '0.0.0.0' }, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('✅ Server running at http://localhost:3000');
});