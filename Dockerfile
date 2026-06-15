FROM node:22-alpine

WORKDIR /app

# Install openssl for Prisma query engine
RUN apk add --no-cache openssl

# Install dependencies first
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build the React frontend
RUN npm run build

# Start the Express server which serves the built React app + API
EXPOSE 80
CMD ["npm", "start"]
