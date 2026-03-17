const express = require("express");
const httpProxy = require("http-proxy");
const fs = require("fs");
const cors = require("cors");

const EnhancedLogger = require("./enhanced-logger");
const ErrorTracker = require("./error-tracker");
const AutoRollback = require("./auto-rollback");

const app = express();
const proxy = httpProxy.createProxyServer({});
const logger = new EnhancedLogger();
const errorTracker = new ErrorTracker(100);
const autoRollback = new AutoRollback(20);

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

const getConfig = () => {
  try {
    const data = fs.readFileSync("./config.json", "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("[ERROR] Error reading config:", err.message);
    return {
      mode: "stable",
      stable_url: "http://127.0.0.1:5001",
      test_url: "http://127.0.0.1:5002",
      canary_percent: 10,
    };
  }
};

app.get("/api/stats", (req, res) => {
  const stats = errorTracker.getStats();
  res.json(stats);
});

app.get("/api/logs", (req, res) => {
  const logs = logger.getTodayLogs();
  res.json({
    date: new Date().toISOString().split("T")[0],
    logs: logs,
    logCount: logs ? logs.length : 0,
  });
});

app.get("/api/config", (req, res) => {
  const config = getConfig();
  res.json(config);
});

app.post("/api/config", (req, res) => {
  const { mode } = req.body;

  if (!["stable", "test", "canary"].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }

  try {
    const config = getConfig();
    config.mode = mode;
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2), "utf8");

    console.log("[INFO] Config updated: mode changed to", mode);

    res.json({ success: true, newMode: mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/rollback-history", (req, res) => {
  const stats = autoRollback.getStats();
  res.json(stats);
});

app.post("/api/rollback", (req, res) => {
  const result = autoRollback.manualRollback();
  res.json(result);
});

app.get("/api/health", (req, res) => {
  const stats = errorTracker.getStats();
  const config = getConfig();

  res.json({
    status: "ok",
    mode: config.mode,
    errorRate: parseFloat(stats.errorRatePercent),
    uptime: stats.uptime,
    totalRequests: stats.totalRequests,
  });
});

app.post("/api/reset-stats", (req, res) => {
  errorTracker.reset();
  res.json({ success: true, message: "Stats reset" });
});

app.use((req, res) => {
  const config = getConfig();
  let target = null;

  if (config.mode === "stable") {
    target = config.stable_url;
  } else if (config.mode === "test") {
    target = config.test_url;
  } else if (config.mode === "canary") {
    const random = Math.random() * 100;
    if (random < config.canary_percent) {
      target = config.test_url;
    } else {
      target = config.stable_url;
    }
  } else {
    console.error("[ERROR] Invalid mode:", config.mode);
    target = config.stable_url;
  }

  if (!target) {
    return res.status(500).json({ error: "No target configured" });
  }

  res.on("finish", () => {
    const duration = Date.now() - req.startTime;
    
    logger.logRequest(req, res, duration, target, res.statusCode);
    errorTracker.addRequest(res.statusCode);

    const stats = errorTracker.getStats();
    autoRollback.checkAndRollback(stats.errorRatePercent);
  });

  proxy.web(req, res, { target }, (err) => {
    if (err) {
      console.error("[ERROR] Proxy error:", err.message);
      res.status(502).json({ error: "Proxy error" });
    }
  });
});

proxy.on("error", (err, req, res) => {
  console.error("[ERROR] Proxy connection error:", err.message);
  if (!res.headersSent) {
    res.status(502).json({ error: "Bad Gateway" });
  }
});

app.listen(4000, () => {
  console.log("[INFO] Proxy running on port 4000");
  console.log("[INFO] Config file: ./config.json");
  console.log("[INFO] Logs directory: ./logs/");
  console.log("[INFO] Auto-rollback threshold: 20% error rate");
  console.log("\n[ENDPOINTS]");
  console.log("GET  /api/stats");
  console.log("GET  /api/logs");
  console.log("GET  /api/config");
  console.log("POST /api/config");
  console.log("GET  /api/health");
  console.log("GET  /api/rollback-history");
  console.log("POST /api/rollback");
  console.log("POST /api/reset-stats");
});