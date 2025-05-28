const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const logger = require("../utils/logger");

class BlocklistManager {
  constructor() {
    this.blockedDomains = new Set();
    this.blockedPatterns = [];
    this.whitelist = new Set();
    this.lastUpdate = null;
    this.initialized = false;

    // Initialize blocklists
    this.init();
  }

  async init() {
    try {
      await this.loadLocalBlocklists();
      await this.updateRemoteBlocklists();
      this.initialized = true;
      logger.info("BlocklistManager initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize BlocklistManager:", error);
    }
  }

  /**
   * Load blocklists from local files
   */
  async loadLocalBlocklists() {
    try {
      const blocklistPath = path.join(__dirname, "../data/blocklists");

      // Create directory if it doesn't exist
      try {
        await fs.mkdir(blocklistPath, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      // Load domains blocklist
      try {
        const domainsData = await fs.readFile(
          path.join(blocklistPath, "domains.txt"),
          "utf8"
        );
        const domains = domainsData
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"));
        domains.forEach((domain) => this.blockedDomains.add(domain.trim()));
        logger.info(`Loaded ${domains.length} blocked domains`);
      } catch (err) {
        logger.warn("No local domains blocklist found, creating default");
        await this.createDefaultBlocklists();
      }

      // Load patterns blocklist
      try {
        const patternsData = await fs.readFile(
          path.join(blocklistPath, "patterns.txt"),
          "utf8"
        );
        this.blockedPatterns = patternsData
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
          .map((pattern) => new RegExp(pattern.trim(), "i"));
        logger.info(`Loaded ${this.blockedPatterns.length} blocked patterns`);
      } catch (err) {
        logger.warn("No local patterns blocklist found");
      }

      // Load whitelist
      try {
        const whitelistData = await fs.readFile(
          path.join(blocklistPath, "whitelist.txt"),
          "utf8"
        );
        const whitelist = whitelistData
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"));
        whitelist.forEach((domain) => this.whitelist.add(domain.trim()));
        logger.info(`Loaded ${whitelist.length} whitelisted domains`);
      } catch (err) {
        logger.warn("No whitelist found");
      }
    } catch (error) {
      logger.error("Error loading local blocklists:", error);
    }
  }

  /**
   * Create default blocklists with common ad domains
   */
  async createDefaultBlocklists() {
    const defaultDomains = [
      "doubleclick.net",
      "googlesyndication.com",
      "googleadservices.com",
      "facebook.com/tr",
      "google-analytics.com",
      "googletagmanager.com",
      "ads.twitter.com",
      "amazon-adsystem.com",
      "adsystem.com",
      "adsense.com",
      "adnxs.com",
      "adsystem.com",
      "outbrain.com",
      "taboola.com",
      "scorecardresearch.com",
      "quantserve.com",
      "chartbeat.com",
    ];

    const defaultPatterns = [
      "/ads/",
      "/advertising/",
      "/banner/",
      "/popup/",
      "/tracking/",
      "googleads",
      "facebook.*ads",
      "amazon.*ads",
      "twitter.*ads",
    ];

    const blocklistPath = path.join(__dirname, "../data/blocklists");

    await fs.writeFile(
      path.join(blocklistPath, "domains.txt"),
      defaultDomains.join("\n")
    );

    await fs.writeFile(
      path.join(blocklistPath, "patterns.txt"),
      defaultPatterns.join("\n")
    );

    // Load the created defaults
    defaultDomains.forEach((domain) => this.blockedDomains.add(domain));
    this.blockedPatterns = defaultPatterns.map(
      (pattern) => new RegExp(pattern, "i")
    );

    logger.info("Created default blocklists");
  }

  /**
   * Update blocklists from remote sources
   */
  async updateRemoteBlocklists() {
    try {
      // EasyList is a popular ad blocking list
      const easyListUrl = "https://easylist.to/easylist/easylist.txt";

      logger.info("Updating remote blocklists...");
      const response = await axios.get(easyListUrl, { timeout: 30000 });

      const lines = response.data.split("\n");
      let addedDomains = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith("!") || trimmed.startsWith("[")) {
          continue;
        }

        // Extract domain-based rules
        if (trimmed.startsWith("||") && trimmed.includes("^")) {
          const domain = trimmed
            .replace("||", "")
            .replace("^", "")
            .split("/")[0];
          if (domain && domain.includes(".")) {
            this.blockedDomains.add(domain);
            addedDomains++;
          }
        }
      }

      this.lastUpdate = new Date();
      logger.info(
        `Updated blocklists: added ${addedDomains} domains from EasyList`
      );
    } catch (error) {
      logger.warn("Failed to update remote blocklists:", error.message);
    }
  }

  /**
   * Check if a URL should be blocked
   */
  async shouldBlock(url, context = {}) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const urlObj = new URL(url.startsWith("http") ? url : `http://${url}`);
      const domain = urlObj.hostname;
      const fullUrl = urlObj.href;

      // Check whitelist first
      if (this.isWhitelisted(domain)) {
        return false;
      }

      // Check domain blocklist
      if (this.isDomainBlocked(domain)) {
        return true;
      }

      // Check pattern blocklist
      if (this.matchesBlockedPattern(fullUrl)) {
        return true;
      }

      // Check user agent for bot/crawler patterns
      const userAgent = context.userAgent || "";
      if (this.isSuspiciousUserAgent(userAgent)) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Error checking if URL should be blocked:", error);
      return false; // Default to allowing on error
    }
  }

  /**
   * Check if domain is whitelisted
   */
  isWhitelisted(domain) {
    return (
      this.whitelist.has(domain) ||
      Array.from(this.whitelist).some(
        (whiteDomain) =>
          domain.endsWith(whiteDomain) || whiteDomain.endsWith(domain)
      )
    );
  }

  /**
   * Check if domain is blocked
   */
  isDomainBlocked(domain) {
    return (
      this.blockedDomains.has(domain) ||
      Array.from(this.blockedDomains).some(
        (blockedDomain) =>
          domain.includes(blockedDomain) || blockedDomain.includes(domain)
      )
    );
  }

  /**
   * Check if URL matches blocked patterns
   */
  matchesBlockedPattern(url) {
    return this.blockedPatterns.some((pattern) => pattern.test(url));
  }

  /**
   * Check for suspicious user agents
   */
  isSuspiciousUserAgent(userAgent) {
    const suspiciousPatterns = [/bot/i, /crawler/i, /scraper/i, /spider/i];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Add domain to blocklist
   */
  addToBlocklist(domain) {
    this.blockedDomains.add(domain);
    logger.info(`Added ${domain} to blocklist`);
  }

  /**
   * Remove domain from blocklist
   */
  removeFromBlocklist(domain) {
    this.blockedDomains.delete(domain);
    logger.info(`Removed ${domain} from blocklist`);
  }

  /**
   * Add domain to whitelist
   */
  addToWhitelist(domain) {
    this.whitelist.add(domain);
    logger.info(`Added ${domain} to whitelist`);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      blockedDomains: this.blockedDomains.size,
      blockedPatterns: this.blockedPatterns.length,
      whitelistedDomains: this.whitelist.size,
      lastUpdate: this.lastUpdate,
      initialized: this.initialized,
    };
  }
}

module.exports = BlocklistManager;
