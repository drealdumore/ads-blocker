const express = require("express");
const BlocklistManager = require("../services/BlocklistManager");
const logger = require("../utils/logger");

const router = express.Router();
const blocklistManager = new BlocklistManager();

/**
 * GET /api/blocklist/status
 * Get blocklist status and stats
 */
router.get("/status", (req, res) => {
  try {
    const stats = blocklistManager.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error getting blocklist status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get blocklist status",
    });
  }
});

/**
 * POST /api/blocklist/check
 * Check if a URL would be blocked
 */
router.post("/check", async (req, res) => {
  try {
    const { url, userAgent, referer } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }

    const shouldBlock = await blocklistManager.shouldBlock(url, {
      userAgent,
      referer,
    });

    res.json({
      success: true,
      data: {
        url,
        blocked: shouldBlock,
        reason: shouldBlock ? "Matches blocklist criteria" : "Not blocked",
      },
    });
  } catch (error) {
    logger.error("Error checking URL:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check URL",
    });
  }
});

/**
 * POST /api/blocklist/domain
 * Add domain to blocklist
 */
router.post("/domain", (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "Domain is required",
      });
    }

    blocklistManager.addToBlocklist(domain);

    res.json({
      success: true,
      message: `Domain ${domain} added to blocklist`,
    });
  } catch (error) {
    logger.error("Error adding domain to blocklist:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add domain to blocklist",
    });
  }
});

/**
 * DELETE /api/blocklist/domain
 * Remove domain from blocklist
 */
router.delete("/domain", (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "Domain is required",
      });
    }

    blocklistManager.removeFromBlocklist(domain);

    res.json({
      success: true,
      message: `Domain ${domain} removed from blocklist`,
    });
  } catch (error) {
    logger.error("Error removing domain from blocklist:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove domain from blocklist",
    });
  }
});

/**
 * POST /api/blocklist/whitelist
 * Add domain to whitelist
 */
router.post("/whitelist", (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: "Domain is required",
      });
    }

    blocklistManager.addToWhitelist(domain);

    res.json({
      success: true,
      message: `Domain ${domain} added to whitelist`,
    });
  } catch (error) {
    logger.error("Error adding domain to whitelist:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add domain to whitelist",
    });
  }
});

/**
 * POST /api/blocklist/update
 * Force update of remote blocklists
 */
router.post("/update", async (req, res) => {
  try {
    await blocklistManager.updateRemoteBlocklists();

    res.json({
      success: true,
      message: "Blocklists updated successfully",
    });
  } catch (error) {
    logger.error("Error updating blocklists:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update blocklists",
    });
  }
});

module.exports = router;
