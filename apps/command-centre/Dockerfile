# Build from the repo root, because the catalog reads engine/ and services/:
#   docker build -f apps/command-centre/Dockerfile -t pith-command-centre .
FROM node:22-slim AS build
WORKDIR /repo
COPY engine/contracts/enums.json engine/contracts/enums.json
COPY services services
COPY apps/command-centre/package.json apps/command-centre/package-lock.json apps/command-centre/
RUN cd apps/command-centre && npm ci
COPY apps/command-centre apps/command-centre
RUN cd apps/command-centre && npm run build && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production PORT=8080 PITH_DIST_DIR=/app/dist
WORKDIR /app
COPY --from=build /repo/apps/command-centre/node_modules node_modules
COPY --from=build /repo/apps/command-centre/dist dist
COPY --from=build /repo/apps/command-centre/dist-server dist-server
COPY --from=build /repo/apps/command-centre/package.json package.json
USER node
EXPOSE 8080
CMD ["node", "dist-server/server/main.js"]
