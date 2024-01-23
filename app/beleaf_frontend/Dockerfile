# Step 1: Build the React application
FROM node:14 AS build
WORKDIR /app/beleaf_frontend
COPY package.json yarn.lock ./
RUN yarn install
COPY . ./
RUN yarn build

# Step 2: Serve the app with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/beleaf_frontend/build /usr/share/nginx/html
# Copy the default nginx.conf provided by react-scripts
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
