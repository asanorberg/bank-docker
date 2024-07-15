FROM node:alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install
EXPOSE 4000
CMD ["node", "server.js"]
