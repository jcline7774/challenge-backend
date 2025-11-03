# Event Management System Challenge

This repo implements an Event Management API built with Node.js and Fastify.  

It provides endpoints to help view users and events, add new events, and handle failures from an external event service.

## Project Overview

## API Endpoints
URL - http://localhost:3000

Exposed endpoints:
- `GET /getUsers` — returns a list of users
- `GET /getEvents` — returns all events
- `GET /getEventsByUserId/:id` — returns events planned for a user id(optimized)
- `POST /addEvent` — Helps to add/schedule a new event (resilient with circuit breaker)

The assigned tasks of this exercise included:
1. Improve performance of `/getEventsByUserId/:id`
2. Improve resilience of `/addEvent` when the external API fails
3. Add production readiness features (lint, test, documentation)

## Performance Improvement

## Problem
The `/getEventsByUserId/:id` endpoint originally iterated through all events every time it was called.  
As the number of events grew, response time increased linearly (O(n)).

## Solution
I added an in-memory index `eventsByUser` (in `utils/dataStore.js`) that caches events by `userId`.

```js
const eventsByUser = new Map();
// on addEvent
if (!eventsByUser.has(event.userId)) eventsByUser.set(event.userId, []);
eventsByUser.get(event.userId).push(event);
```

Now lookups are O(1) and unaffected by tje total event count as response time stays nearly constant even as the total number of events explodes.

Why this way
For a small local app, an in-memory index seemed like the simplest and fastest solution.  
In production, this could become a Redis or database index.



## Resilience Improvement

## Problem
`POST /addEvent` depended on the external API (`http://event.com/addEvent`).  
As the service kept failing, this hurts overall performance and the rest of the app will struggle too.

## Solution
Implementing a custom Circuit Breaker (`utils/circuitBreaker.js`)will help by:
- Tracking request failures in a 30‑second window.
- Opening the circuit after 3 consecutive failures.
- While open, immediately returning a `503 Service Unavailable` with `Retry-After`.
- Using exponential backoff before probing the service again so we're not hammering the system.
- Closing the circuit after a successful probe.

## Benefits
- Prevents flooding an already-failing service.
- Reduces latency for clients during an outage.
- Recovers automatically when the service becomes stable.

## Implementation Files

File / Purpose 

`utils/dataStore.js` - In-memory user/event storage with fast user-based indexing 
`utils/circuitBreaker.js` - Custom circuit breaker to handle external service failures
`__tests__/circuitBreaker.test.js` - Jest test verifying breaker behavior
`services/index.js` - Fastify routes integrating both features 

## Instructions

```bash
npm install
npm start
```

Server defaults to `http://localhost:3000`

Add test data:
```bash
for i in $(seq 1 100); do
  curl -s -X POST http://localhost:3000/addEvent     -H "Content-Type: application/json"     -d '{"name": "test", "userId": "1"}' >/dev/null
done
```

Then check:
```bash
curl http://localhost:3000/getEventsByUserId/1
```
## Example Behavior

- After 3 failures of the external API:
  - Circuit enters OPEN state
  - Returns `503` with `Retry-After`
- After delay expires:
  - One probe request is allowed
  - On success, circuit closes automatically

## Scripts

Add to `package.json`:
```json
"scripts": {
  "start": "node services/index.js",
  "lint": "eslint . --ext .js",
  "test": "jest --runInBand"
}
```

## Notes

- Used Fastify for high performance async handling.
- No external dependencies used for the circuit breaker (implemented manually).
- MSW (Mock Service Worker) simulates `event.com` endpoints for testing.
- Code comments and structure are intentionally straightforward to show reasoning.

## Error Handling and Resilience

All potentially unstable operations are wrapped in `try/catch` blocks to prevent crashes:

- /addEvent endpoint: wraps external API call with `try/catch` to return `502` or `503` instead of crashing.
- CircuitBreaker.call(): internally protected with `try/catch` to safely track and handle async errors.
- App startup (`fastify.listen()`): exits clean if the port is unavailable.
- Optional global handler (`fastify.setErrorHandler()`): provides a safety net for any unexpected errors.

These protections ensure the service remains responsive during network or external service failures.

## Test Example

See `__tests__/circuitBreaker.test.js`.  
Run with `npm test`.


## Summary

Aspect / Before / After 
- `/getEventsByUserId` / Slow (O(n) filtering) / Instant O(1) lookup 
-  `/addEvent` / Plagued by cascading failures / Self‑protecting circuit breaker 
- Overall / Minimal docs, fragile / Documented, resilient, testable 

This approach can make the app stable, understandable, and production‑ready within 2 hours of dedicated work.
