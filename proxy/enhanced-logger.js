const fs = require("fs");
const path = require("path");

class EnhancedLogger {
  constructor() {
    this.logsDir = "./logs";
    this.initLogsDirectory();
  }

  // Create logs folder if it doesn't exist
  initLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log("✅ Created logs directory");
    }
  }

  // Get today's log filename
  getLogFilename() {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `requests-${today}.json`);
  }

  // Log a request
  logRequest(req, res, duration, target, statusCode) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      target: target,
      statusCode: statusCode,
      duration_ms: duration,
      userAgent: req.get("user-agent") || "unknown",
      ip: req.ip || req.connection.remoteAddress,
      isError: statusCode >= 400,
    };

    const logFile = this.getLogFilename();

    try {
      fs.appendFileSync(
        logFile,
        JSON.stringify(logEntry) + "\n",
        "utf8"
      );
    } catch (err) {
      console.error("❌ Error writing log:", err.message);
    }

    // Also log to console for real-time visibility
    const statusEmoji = statusCode >= 400 ? "❌" : "✅";
    console.log(
      `${statusEmoji} [${statusCode}] ${req.method} ${req.path} → ${target} (${duration}ms)`
    );
  }

  // Get all logs for a specific date
  getLogsForDate(dateString) {
    const logFile = path.join(this.logsDir, `requests-${dateString}.json`);

    if (!fs.existsSync(logFile)) {
      return null;
    }

    try {
      const content = fs.readFileSync(logFile, "utf8");
      const logs = content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));

      return logs;
    } catch (err) {
      console.error("❌ Error reading logs:", err.message);
      return null;
    }
  }

  // Get logs for today
  getTodayLogs() {
    const today = new Date().toISOString().split("T")[0];
    return this.getLogsForDate(today);
  }

  // Calculate error rate from logs
  calculateErrorRate(logs) {
    if (!logs || logs.length === 0) return 0;

    const errors = logs.filter((log) => log.statusCode >= 400).length;
    return ((errors / logs.length) * 100).toFixed(2);
  }
}

module.exports = EnhancedLogger;