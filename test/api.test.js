const axios = require("axios");

const BASE_URL = "http://localhost:3000";

// Simple test runner
async function runTests() {
  console.log("🧪 Running Ads Blocker API Tests...\n");

  try {
    // Test 1: Health Check
    console.log("1. Testing health check...");
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Health check passed:", healthResponse.data.status);

    // Test 2: Blocklist Status
    console.log("\n2. Testing blocklist status...");
    const statusResponse = await axios.get(`${BASE_URL}/api/blocklist/status`);
    console.log("✅ Blocklist status:", statusResponse.data.data);

    // Test 3: URL Check - Should block ad domain
    console.log("\n3. Testing ad domain blocking...");
    const blockCheckResponse = await axios.post(
      `${BASE_URL}/api/blocklist/check`,
      {
        url: "https://doubleclick.net/ad.js",
      }
    );
    console.log("✅ Ad domain check:", blockCheckResponse.data.data);

    // Test 4: URL Check - Should allow normal domain
    console.log("\n4. Testing normal domain allowance...");
    const allowCheckResponse = await axios.post(
      `${BASE_URL}/api/blocklist/check`,
      {
        url: "https://www.google.com",
      }
    );
    console.log("✅ Normal domain check:", allowCheckResponse.data.data);

    // Test 5: Statistics
    console.log("\n5. Testing statistics...");
    const statsResponse = await axios.get(`${BASE_URL}/api/stats`);
    console.log("✅ Statistics:", {
      blocked: statsResponse.data.data.blocked,
      allowed: statsResponse.data.data.allowed,
      totalRequests: statsResponse.data.data.totalRequests,
    });

    // Test 6: Add custom domain to blocklist
    console.log("\n6. Testing custom domain blocking...");
    await axios.post(`${BASE_URL}/api/blocklist/domain`, {
      domain: "evil-ads.com",
    });

    const customBlockResponse = await axios.post(
      `${BASE_URL}/api/blocklist/check`,
      {
        url: "https://evil-ads.com/banner.js",
      }
    );
    console.log("✅ Custom domain blocking:", customBlockResponse.data.data);

    console.log("\n🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    process.exit(1);
  }
}

// Check if server is running
async function waitForServer(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(`${BASE_URL}/health`);
      return true;
    } catch (error) {
      console.log(`Waiting for server... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error("Server did not start within expected time");
}

// Main execution
async function main() {
  try {
    console.log("⏳ Waiting for server to start...");
    await waitForServer();
    await runTests();
  } catch (error) {
    console.error("❌ Tests failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTests, waitForServer };
