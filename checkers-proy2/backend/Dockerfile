FROM docker.io/oven/bun:1.2 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 4000
CMD ["bun", "run", "src/index.ts"]
