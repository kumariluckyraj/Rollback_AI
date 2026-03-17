const fs = require("fs");

class AutoRollback {
  constructor(errorThreshold = 20) {
    this.errorThreshold = errorThreshold; // 20% = trigger rollback
    this.rollbackHistory = [];
  }

  // Check if error rate is too high and perform rollback if needed
  checkAndRollback(currentErrorRatePercent) {
    const errorRate = parseFloat(currentErrorRatePercent);

    if (errorRate > this.errorThreshold) {
      console.log(`\n🚨 ERROR RATE ${errorRate}% > THRESHOLD ${this.errorThreshold}%`);
      console.log("📉 INITIATING AUTO-ROLLBACK TO STABLE...\n");

      try {
        // Read current config
        const configData = fs.readFileSync("./config.json", "utf8");
        const config = JSON.parse(configData);

        const previousMode = config.mode;

        // Only rollback if not already in stable mode
        if (previousMode !== "stable") {
          // Change to stable mode
          config.mode = "stable";

          // Write back to file
          fs.writeFileSync("./config.json", JSON.stringify(config, null, 2), "utf8");

          // Record this rollback
          const rollbackEvent = {
            timestamp: new Date().toISOString(),
            previousMode: previousMode,
            newMode: "stable",
            errorRate: errorRate,
            threshold: this.errorThreshold,
          };

          this.rollbackHistory.push(rollbackEvent);

          console.log(` ROLLBACK SUCCESSFUL`);
          console.log(`   Previous mode: ${previousMode}`);
          console.log(`   New mode: stable`);
          console.log(`   Error rate was: ${errorRate}%\n`);

          return {
            success: true,
            rolled: true,
            previousMode: previousMode,
            newMode: "stable",
            errorRate: errorRate,
            timestamp: rollbackEvent.timestamp,
          };
        } else {
          // Already in stable, no rollback needed
          return {
            success: true,
            rolled: false,
            message: "Already in stable mode, no rollback needed",
            errorRate: errorRate,
          };
        }
      } catch (err) {
        console.error("❌ ROLLBACK FAILED:", err.message);
        return {
          success: false,
          error: err.message,
        };
      }
    }

    // No rollback needed
    return {
      success: true,
      rolled: false,
      errorRate: errorRate,
      timestamp: new Date().toISOString(),
    };
  }

  // Get rollback history
  getRollbackHistory() {
    return this.rollbackHistory;
  }

  // Get stats
  getStats() {
    return {
      threshold: this.errorThreshold,
      rollbackCount: this.rollbackHistory.length,
      lastRollback: this.rollbackHistory.length > 0 ? this.rollbackHistory[this.rollbackHistory.length - 1] : null,
      history: this.rollbackHistory,
    };
  }

  // Manual rollback
  manualRollback() {
    try {
      const configData = fs.readFileSync("./config.json", "utf8");
      const config = JSON.parse(configData);

      const previousMode = config.mode;
      config.mode = "stable";

      fs.writeFileSync("./config.json", JSON.stringify(config, null, 2), "utf8");

      console.log(`🔧 MANUAL ROLLBACK: ${previousMode} → stable`);

      return {
        success: true,
        previousMode: previousMode,
        newMode: "stable",
      };
    } catch (err) {
      console.error("❌ Manual rollback failed:", err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = AutoRollback;
