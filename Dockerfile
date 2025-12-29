# Stage 1: Build the React application
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Node.js
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Install serve package globally
RUN npm install -g serve

# Copy built assets from build stage
COPY --from=build /app/build ./build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]
