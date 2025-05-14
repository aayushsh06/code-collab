FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

RUN npm run build


ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["node", "server.js"] 