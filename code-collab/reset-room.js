import { createClient } from 'redis';

// Get room ID from command line arguments
const roomId = process.argv[2];
const testCode = process.argv[3] || 'console.log("Test code - room reset");';

if (!roomId) {
  console.error('Please provide a room ID as the first argument');
  process.exit(1);
}

// Redis Client Setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function resetRoom() {
  try {
    console.log(`Resetting room ${roomId}...`);
    await redisClient.connect();
    
    // Set the test code
    await redisClient.set(`room:${roomId}:code`, testCode);
    console.log(`Room ${roomId} code set to test value`);
    
    // Verify
    const savedCode = await redisClient.get(`room:${roomId}:code`);
    console.log(`Verification - code for room ${roomId}:\n${savedCode}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await redisClient.quit();
    console.log('Done');
  }
}

resetRoom(); 