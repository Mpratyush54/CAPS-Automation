const { redisClient } = require("../database/redis");
const startTimer = require("./timer");
const zlib = require("zlib");
const { promisify } = require("util");

const gzip = promisify(zlib.gzip);

async function writeCache(key, ttlSeconds, value) {
  try {
    const json = JSON.stringify(value);

    const t_compress = startTimer("cache_compress");
    const compressed = await gzip(json);
    t_compress();

    const t_write = startTimer("cache_write");

    if (ttlSeconds > 0) {
      await redisClient.setEx(key, ttlSeconds, compressed);
    } else {
      await redisClient.set(key, compressed);
    }

    t_write();
  } catch (err) {
    console.error("❌ Cache write failed:", err.message);
  }
}

module.exports = writeCache;
