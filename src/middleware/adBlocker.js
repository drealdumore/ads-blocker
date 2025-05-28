const BlocklistManager = require("../services/BlocklistManager");
const logger = require("../utils/logger");
const stats = require("../services/StatsService");

const blocklistManager = new BlocklistManager();

/**
 * Main ads blocking middleware
 * Checks incoming requests against blocklists and filters out ads
 */
const adBlocker = async (req, res, next) => {
  try {
    const { url, headers } = req;
    const userAgent = headers["user-agent"] || "";
    const referer = headers.referer || "";
    const targetUrl = req.query.url || req.headers["x-target-url"];

    // Skip API routes and health checks
    if (url.startsWith("/api/") || url === "/health") {
      return next();
    }

    // If no target URL provided, this might be a direct API call
    if (!targetUrl && !url.includes("://")) {
      return next();
    }

    const urlToCheck = targetUrl || url;

    // Check if the request should be blocked
    const shouldBlock = await blocklistManager.shouldBlock(urlToCheck, {
      userAgent,
      referer,
      headers,
    });

    if (shouldBlock) {
      logger.info(`Blocked ad request: ${urlToCheck}`);
      stats.incrementBlocked();

      // Return blocked response
      return res.status(204).json({
        blocked: true,
        reason: "Ad content blocked",
        url: urlToCheck,
      });
    }

    // Log allowed request
    stats.incrementAllowed();
    logger.debug(`Allowed request: ${urlToCheck}`);

    next();
  } catch (error) {
    logger.error("Error in ad blocker middleware:", error);
    // On error, allow the request to proceed
    next();
  }
};

module.exports = adBlocker;
