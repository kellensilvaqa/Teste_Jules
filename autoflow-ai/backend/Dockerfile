# Use an appropriate Node.js base image
FROM node:18-alpine

# Set a working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
# We need to install all dependencies including devDependencies for prisma generate
RUN npm install

# Copy prisma schema from the root directory
COPY ../prisma/schema.prisma ./prisma/

# Copy the .env file from the root directory.
# Note: For production, it's better to use environment variables from Docker Compose
COPY ../.env ./.env

# Generate Prisma Client
# This requires prisma to be a dependency in backend/package.json
RUN npx prisma generate

# Copy the rest of the backend source code
COPY . .

# Expose the port the backend server listens on
EXPOSE 3001

# Define the command to run the application
CMD ["npm", "start"]
