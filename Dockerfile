# Use Node.js version 22
FROM node:22-alpine

# Create app folder
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all the code
COPY . .

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "src/index.js"]
```

Then:
```
Save it (Ctrl+S)
Close Notepad