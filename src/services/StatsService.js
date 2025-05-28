class StatsService {
  constructor() {
    this.stats = {
      blocked: 0,
      allowed: 0,
      totalRequests: 0,
      startTime: new Date(),
      dailyStats: {},
      topBlockedDomains: {},
      recentBlocked: [],
    };
  }

  incrementBlocked(domain = "unknown") {
    this.stats.blocked++;
    this.stats.totalRequests++;

    // Track daily stats
    const today = new Date().toISOString().split("T")[0];
    if (!this.stats.dailyStats[today]) {
      this.stats.dailyStats[today] = { blocked: 0, allowed: 0 };
    }
    this.stats.dailyStats[today].blocked++;

    // Track top blocked domains
    if (!this.stats.topBlockedDomains[domain]) {
      this.stats.topBlockedDomains[domain] = 0;
    }
    this.stats.topBlockedDomains[domain]++;

    // Track recent blocked (keep last 100)
    this.stats.recentBlocked.unshift({
      domain,
      timestamp: new Date().toISOString(),
    });
    if (this.stats.recentBlocked.length > 100) {
      this.stats.recentBlocked = this.stats.recentBlocked.slice(0, 100);
    }
  }

  incrementAllowed() {
    this.stats.allowed++;
    this.stats.totalRequests++;

    // Track daily stats
    const today = new Date().toISOString().split("T")[0];
    if (!this.stats.dailyStats[today]) {
      this.stats.dailyStats[today] = { blocked: 0, allowed: 0 };
    }
    this.stats.dailyStats[today].allowed++;
  }

  getStats() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const blockRate =
      this.stats.totalRequests > 0
        ? ((this.stats.blocked / this.stats.totalRequests) * 100).toFixed(2)
        : 0;

    return {
      ...this.stats,
      uptime,
      blockRate: `${blockRate}%`,
      requestsPerMinute: this.stats.totalRequests / (uptime / 60000),
      topBlockedDomains: this.getTopBlockedDomains(10),
    };
  }

  getTopBlockedDomains(limit = 10) {
    return Object.entries(this.stats.topBlockedDomains)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count }));
  }

  getDailyStats(days = 7) {
    const result = {};
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      result[dateStr] = this.stats.dailyStats[dateStr] || {
        blocked: 0,
        allowed: 0,
      };
    }

    return result;
  }

  reset() {
    this.stats = {
      blocked: 0,
      allowed: 0,
      totalRequests: 0,
      startTime: new Date(),
      dailyStats: {},
      topBlockedDomains: {},
      recentBlocked: [],
    };
  }
}

// Singleton instance
const statsService = new StatsService();
module.exports = statsService;
