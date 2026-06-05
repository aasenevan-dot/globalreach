FROM node:20-slim
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built app
COPY dist/ ./dist/
COPY data.db ./data.db

# Environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000
CMD ["node", "dist/index.cjs"]
