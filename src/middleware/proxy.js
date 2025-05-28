const { createProxyMiddleware } = require("http-proxy-middleware");
const logger = require("../utils/logger");

/**
 * Proxy middleware to forward requests to target URLs
 */
const proxyMiddleware = (req, res, next) => {
  const targetUrl = req.query.url || req.headers["x-target-url"];

  if (!targetUrl) {
    return res.status(400).json({
      error: "Bad Request",
      message:
        "Target URL required. Use ?url=<target> query parameter or X-Target-URL header",
    });
  }

  try {
    const url = new URL(targetUrl);

    // Create dynamic proxy for the target
    const proxy = createProxyMiddleware({
      target: `${url.protocol}//${url.host}`,
      changeOrigin: true,
      pathRewrite: {
        "^/.*": url.pathname + url.search,
      },
      onError: (err, req, res) => {
        logger.error("Proxy error:", err);
        if (!res.headersSent) {
          res.status(502).json({
            error: "Proxy Error",
            message: "Failed to proxy request to target URL",
          });
        }
      },
      onProxyReq: (proxyReq, req, res) => {
        logger.debug(`Proxying request to: ${targetUrl}`);

        // Remove proxy-specific headers
        proxyReq.removeHeader("x-target-url");

        // Add original IP
        const originalIp = req.ip || req.connection.remoteAddress;
        proxyReq.setHeader("X-Forwarded-For", originalIp);
        proxyReq.setHeader("X-Forwarded-Proto", req.protocol);
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add CORS headers
        proxyRes.headers["Access-Control-Allow-Origin"] = "*";
        proxyRes.headers["Access-Control-Allow-Methods"] =
          "GET, POST, PUT, DELETE, OPTIONS";
        proxyRes.headers["Access-Control-Allow-Headers"] =
          "Content-Type, Authorization, X-Target-URL";

        // Remove sensitive headers
        delete proxyRes.headers["set-cookie"];
        delete proxyRes.headers["x-powered-by"];
      },
    });

    return proxy(req, res, next);
  } catch (error) {
    logger.error("Invalid target URL:", error);
    return res.status(400).json({
      error: "Invalid URL",
      message: "The provided target URL is invalid",
    });
  }
};

module.exports = proxyMiddleware;
