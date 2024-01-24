# Step 1: Build the React application
FROM node:14 AS build
WORKDIR /app/beleaf_frontend

# Accept REACT_APP_API_URL as a build-time argument
ARG REACT_APP_API_URL

# Set the argument as an environment variable
ENV REACT_APP_API_URL $REACT_APP_API_URL

COPY package.json yarn.lock ./
RUN yarn install
COPY . ./
RUN yarn build

# Step 2: Serve the app with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/beleaf_frontend/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
