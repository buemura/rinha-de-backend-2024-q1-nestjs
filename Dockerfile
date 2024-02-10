
FROM node:21-alpine AS base

WORKDIR /usr/src/app

COPY package*.json ./
COPY .env ./

RUN npm install
COPY . .
RUN npm run build

EXPOSE 8080
CMD ["npm", "run", "start:prod"]
