const express = require("express");
const stats = require("../services/StatsService");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * GET /api/stats
 * Get overall statistics
 */
router.get("/", (req, res) => {
  try {
    const statsData = stats.getStats();
    res.json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    logger.error("Error getting stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get statistics",
    });
  }
});

/**
 * GET /api/stats/daily
 * Get daily statistics for the last N days
 */
router.get("/daily", (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const dailyStats = stats.getDailyStats(days);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        stats: dailyStats,
      },
    });
  } catch (error) {
    logger.error("Error getting daily stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get daily statistics",
    });
  }
});

/**
 * GET /api/stats/top-blocked
 * Get top blocked domains
 */
router.get("/top-blocked", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topBlocked = stats.getTopBlockedDomains(limit);

    res.json({
      success: true,
      data: topBlocked,
    });
  } catch (error) {
    logger.error("Error getting top blocked domains:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get top blocked domains",
    });
  }
});

/**
 * GET /api/stats/recent
 * Get recent blocked requests
 */
router.get("/recent", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const recentBlocked = stats.getStats().recentBlocked.slice(0, limit);

    res.json({
      success: true,
      data: recentBlocked,
    });
  } catch (error) {
    logger.error("Error getting recent blocked requests:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get recent blocked requests",
    });
  }
});

/**
 * POST /api/stats/reset
 * Reset all statistics
 */
router.post("/reset", (req, res) => {
  try {
    stats.reset();

    res.json({
      success: true,
      message: "Statistics reset successfully",
    });
  } catch (error) {
    logger.error("Error resetting stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset statistics",
    });
  }
});

module.exports = router;
