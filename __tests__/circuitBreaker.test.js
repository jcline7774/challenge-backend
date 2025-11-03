const { CircuitBreaker } = require('../utils/circuitBreaker');

test('circuit opens after 3 failures', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 3, windowMs: 1000, baseDelay: 100 });
  const failFn = () => Promise.reject(new Error('fail'));

  await expect(cb.call(failFn)).rejects.toThrow();
  await expect(cb.call(failFn)).rejects.toThrow();
  await expect(cb.call(failFn)).rejects.toThrow();

  await expect(cb.call(failFn)).rejects.toHaveProperty('code', 'ECIRCUIT');
});
