# Redis Setup for Code Collab

This document explains how Redis has been integrated with Code Collab for persistent code storage.

## Overview

Redis is used to store the code for each room, allowing users to see the same code when they join a room or refresh the page.

## Running Locally

### Prerequisites

- Node.js
- Redis server

### Installation

1. Install Redis on your machine:
   - **macOS**: `brew install redis`
   - **Linux**: `sudo apt-get install redis-server`
   - **Windows**: Download from https://github.com/tporadowski/redis/releases

2. Start Redis server:
   - **macOS/Linux**: `redis-server`
   - **Windows**: Start the Redis server using the installed executable

3. Install project dependencies:
   ```
   npm install
   ```

4. Start the application:
   ```
   npm run server:dev  # Start the backend server
   npm run dev         # Start the frontend
   ```

## Using Docker

The project includes Docker configuration for easy setup:

```
docker-compose up
```

This will start both the application and Redis server.

## How It Works

1. When a user joins a room, the server checks Redis for any saved code for that room
2. If code exists, it's sent to the user
3. Any code changes are saved to Redis in real-time
4. When a new user joins or a user refreshes, they receive the latest code from Redis

### Handling Page Refreshes

The application handles page refreshes in multiple ways:
- When a page is refreshed or becomes visible again, it explicitly requests the latest code from the server
- Before a page unloads, the current code is saved to Redis
- The server differentiates between code saving events and code requests based on whether a code payload is provided
- Multiple event listeners detect window focus, visibility changes, and reconnections to ensure code persistence
- Editor sends the complete code state after each change, not just the change itself

### Fixes for Default Code Issues

To fix the issue where default code ("// Write your code here") overwrites existing code:

1. The server now checks for default/empty code and avoids overwriting real code with default content
2. When the editor mounts, it immediately sends its content to the server 
3. Additional debug logs help identify when code is being sent and received
4. A delay has been added after joining a room before requesting code to ensure proper sequence

## Data Structure

Redis uses the following key format:
- `room:{roomId}:code` - Stores the code for a specific room

## Debugging Redis

A debugging utility is included to help check Redis content:

```
npm run check-redis
```

This will:
- List all keys in the Redis database
- Show specific room:code keys
- Display the content of each room's code

The server also includes additional logging to track Redis operations and connectivity.

## Troubleshooting

If you encounter issues:

1. Check Redis connection: `redis-cli ping` should return `PONG`
2. Ensure Redis server is running
3. Check server logs for connection errors
4. Look for console messages about code fetch/save events to verify persistence is working
5. Run the check-redis utility to verify data is being stored correctly 