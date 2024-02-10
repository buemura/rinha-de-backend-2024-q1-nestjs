
FROM node:21-alpine AS base

WORKDIR /usr/src/app

COPY package*.json ./
COPY .env ./

RUN npm ci --only=production
COPY dist ./dist

EXPOSE 8080
CMD ["npm", "run", "start:prod"]
