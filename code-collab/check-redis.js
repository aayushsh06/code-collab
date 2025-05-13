import { createClient } from 'redis';

// Redis Client Setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function checkRedis() {
  try {
    console.log('Connecting to Redis...');
    await redisClient.connect();
    console.log('Connected to Redis');

    // List all keys
    const keys = await redisClient.keys('*');
    console.log('All Redis keys:', keys);

    // Check room code keys specifically
    const roomKeys = await redisClient.keys('room:*:code');
    console.log('Room code keys:', roomKeys);

    // Display content of each room
    for (const key of roomKeys) {
      const code = await redisClient.get(key);
      console.log(`\nContent for ${key}:\n${code?.substring(0, 100)}...`);
      console.log(`Length: ${code?.length || 0} characters`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await redisClient.quit();
  }
}

checkRedis(); 