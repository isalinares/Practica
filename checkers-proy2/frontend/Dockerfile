FROM oven/bun:1.2 AS dev
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

FROM oven/bun:1.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.2 AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
RUN bun install --production
EXPOSE 5173
CMD ["bun", "run", "preview", "--host", "0.0.0.0"]
