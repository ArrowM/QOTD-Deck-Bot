# ---- Base ----
FROM node:23-alpine AS base

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies

RUN npm ci

# ---- Data ----
FROM dependencies AS data

# Copy all source files
COPY . .

CMD ["npm", "run", "db:migrate"]

# ---- Production ----
FROM data AS production

ENTRYPOINT ["npm", "start"]