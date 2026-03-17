class ErrorTracker {
  constructor(windowSize = 100) {
    this.requests = [];
    this.windowSize = windowSize; // Keep track of last 100 requests
    this.startTime = Date.now();
  }

  // Add a request result
  addRequest(statusCode) {
    this.requests.push({
      statusCode: statusCode,
      isError: statusCode >= 400,
      timestamp: Date.now(),
    });

    // Keep only last N requests (sliding window)
    if (this.requests.length > this.windowSize) {
      this.requests.shift();
    }
  }

  // Get current error rate (0-100)
  getErrorRate() {
    if (this.requests.length === 0) return 0;

    const errors = this.requests.filter((r) => r.isError).length;
    return ((errors / this.requests.length) * 100).toFixed(2);
  }

  // Get stats
  getStats() {
    const errorRate = this.getErrorRate();
    const totalRequests = this.requests.length;
    const totalErrors = this.requests.filter((r) => r.isError).length;
    const uptime = ((Date.now() - this.startTime) / 1000).toFixed(0); // seconds

    return {
      totalRequests: totalRequests,
      totalErrors: totalErrors,
      errorRate: parseFloat(errorRate),
      errorRatePercent: errorRate + "%",
      uptime: uptime + "s",
      timestamp: new Date().toISOString(),
    };
  }

  // Check if error rate exceeds threshold
  isHighErrorRate(threshold = 20) {
    return parseFloat(this.getErrorRate()) > threshold;
  }

  // Get last N requests
  getRecentRequests(count = 10) {
    return this.requests.slice(-count);
  }

  // Reset tracker
  reset() {
    this.requests = [];
    this.startTime = Date.now();
  }
}

module.exports = ErrorTracker;