FROM node:20-alpine

# Install build dependencies if needed for canvas or sqlite
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy root package files
COPY package*.json ./
RUN npm install --omit=dev

# Copy frontend package files and build
COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend install
COPY frontend/ ./frontend/
RUN npm --prefix frontend run build

# Copy remaining project files
COPY backend/ ./backend/
COPY database/ ./database/
COPY public/ ./public/
COPY sessions/ ./sessions/
COPY app.js server.js ./

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]
