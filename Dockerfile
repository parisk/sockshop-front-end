FROM mhart/alpine-node:6.3
ENV NODE_ENV "production"
ENV PORT 8079

# Prepare app directory
WORKDIR /usr/src/app
RUN npm install -g nodemon
COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

# Start the app
CMD ["npm", "start"]
