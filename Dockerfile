FROM docker.io/n8nio/n8n@sha256:85214df20cd7bc020f8e4b0f60f87ea87f0a754ca7ba3d1ccdfc503ccd6e7f9c

# Switch to root for installation
USER root

# Create custom nodes directory
RUN mkdir -p /home/node/.n8n/custom/node_modules/n8n-nodes-ttsbro

# Copy the package and dist folder
COPY package.json /home/node/.n8n/custom/node_modules/n8n-nodes-ttsbro/
COPY dist/ /home/node/.n8n/custom/node_modules/n8n-nodes-ttsbro/dist/

# Copy Kokoro model files
COPY kokoro-int8-en-v0_19/ /home/node/.n8n/custom/node_modules/n8n-nodes-ttsbro/kokoro-int8-en-v0_19/

# Install dependencies (sherpa-onnx)
WORKDIR /home/node/.n8n/custom/node_modules/n8n-nodes-ttsbro
RUN npm install --omit=dev

# Set permissions
RUN chown -R node:node /home/node/.n8n

# Switch back to node user
USER node
WORKDIR /home/node

# Disable community packages to avoid permission issues
ENV N8N_COMMUNITY_PACKAGES_ENABLED=false

# Expose n8n port
EXPOSE 5678

# Use the n8n entrypoint
ENTRYPOINT ["tini", "--", "/usr/local/bin/n8n"]
CMD ["start"]
