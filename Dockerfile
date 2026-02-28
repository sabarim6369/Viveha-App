# ----------- Build Stage -----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY Backend/package*.json ./

# Install all deps (including dev for build)
RUN npm ci

# Copy source code
COPY Backend/. .

# Build project
RUN npm run build


# ----------- Production Stage -----------
FROM node:20-alpine

WORKDIR /app

# Copy only production package files
COPY Backend/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy only built output
COPY --from=builder /app/dist ./dist

EXPOSE 10000

CMD ["npm", "run", "start:prod"]