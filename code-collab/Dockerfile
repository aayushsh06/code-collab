FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build the React app
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

# Run the server which also serves the built static files
CMD ["node", "server.js"] 