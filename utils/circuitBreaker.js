const STATE = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

class CircuitBreaker {
  constructor({ failureThreshold = 3, windowMs = 30000, baseDelay = 2000, maxDelay = 60000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.windowMs = windowMs;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;

    this.state = STATE.CLOSED;
    this.failures = [];
    this.nextTry = Date.now();
    this.currentDelay = baseDelay;
  }

  _purgeOldFailures() {
    const cutoff = Date.now() - this.windowMs;
    this.failures = this.failures.filter(f => f > cutoff);
  }

  _recordFailure() {
    this.failures.push(Date.now());
    this._purgeOldFailures();
    if (this.failures.length >= this.failureThreshold) {
      this._open();
    }
  }

  _recordSuccess() {
    this.failures = [];
    this._close();
  }

  _open() {
    if (this.state === STATE.OPEN) return;
    this.state = STATE.OPEN;
    this.nextTry = Date.now() + this.currentDelay;
    this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
  }

  _close() {
    this.state = STATE.CLOSED;
    this.currentDelay = this.baseDelay;
  }

  async call(fn) {
    const now = Date.now();
    if (this.state === STATE.OPEN && now < this.nextTry) {
      const retryAfter = Math.ceil((this.nextTry - now) / 1000);
      const err = new Error('Circuit open');
      err.code = 'ECIRCUIT';
      err.retryAfter = retryAfter;
      throw err;
    }
    if (this.state === STATE.OPEN && now >= this.nextTry) this.state = STATE.HALF_OPEN;

    try {
      const res = await fn();
      this._recordSuccess();
      return res;
    } catch (err) {
      this._recordFailure();
      throw err;
    }
  }
}

module.exports = { CircuitBreaker };
