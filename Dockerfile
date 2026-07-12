# Alper Chores — production image.
# Builds the React client and runs the Express API (via tsx) that serves both
# the compiled frontend and the /api routes.

FROM node:20-slim AS build
WORKDIR /app

# OpenSSL is required by Prisma's query engine.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies (postinstall runs `prisma generate`, so copy schema first).
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Copy the rest of the source and build the client + generate Prisma client.
COPY . .
RUN npm run build:client && npx prisma generate

# --- Runtime image ---
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy everything needed to run (node_modules includes tsx + generated Prisma client).
COPY --from=build /app ./

EXPOSE 3000
# The server binds 0.0.0.0 and uses the Railway-provided PORT.
CMD ["npm", "run", "start"]
