FROM apify/actor-node:24

COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" && node --version \
    && echo "NPM version:" && npm --version \
    && rm -r ~/.npm

COPY . ./

# Keep the JavaScript heap at about 60% of the run memory so garbage collection starts before the container limit.
CMD sh -c 'exec node --max-old-space-size=$(( ${ACTOR_MEMORY_MBYTES:-512} * 6 / 10 )) src/main.js'
