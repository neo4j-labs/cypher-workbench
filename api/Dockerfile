FROM node:22.23.4

RUN mkdir -p /app
WORKDIR /app

COPY package.json .
COPY license.lic .
RUN npm install
COPY . .

EXPOSE 4000

CMD ["npm", "start"]