# stage 1 - build environment
FROM node:18.12.1 as react-build
RUN mkdir -p /app
WORKDIR /app
COPY . ./
RUN npm install
RUN npm run build

# stage 2 - production environment
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=react-build /app/build /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]