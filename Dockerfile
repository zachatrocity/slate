FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server.mjs render.mjs ./
COPY --chown=node:node themes ./themes
COPY --chown=node:node public ./public
RUN mkdir /data && chown node:node /data
USER node
ENV DATA_DIR=/data CHROME_PATH=/usr/bin/chromium NODE_ENV=production
EXPOSE 3000
CMD ["node","server.mjs"]
