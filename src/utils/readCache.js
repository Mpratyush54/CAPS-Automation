const { redisClient } = require("../database/redis");
const startTimer = require("./timer");
const zlib = require("zlib");
const { promisify } = require("util");

const gunzip = promisify(zlib.gunzip);

async function readCache(key) {
  const t_read = startTimer("cache_read");
  const compressed = await redisClient.getBuffer(key); // IMPORTANT
  t_read();

  if (!compressed) {
    startTimer("cache_miss")();
    return null;
  }

  startTimer("cache_hit")();

  const t_decompress = startTimer("cache_decompress");
  const json = await gunzip(compressed);
  t_decompress();

  return JSON.parse(json.toString());
}

module.exports = readCache;
