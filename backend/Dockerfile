# Build stage
FROM golang:1.27-alpine AS build

WORKDIR /src

# Dependencies first so Docker can cache them across source changes.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/bidline-api ./cmd/api

# Runtime stage
FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S -g 10001 bidline \
    && adduser -S -D -H -u 10001 -G bidline bidline

WORKDIR /app
COPY --from=build /out/bidline-api /app/bidline-api

RUN mkdir -p /app/data && chown -R bidline:bidline /app
USER bidline

ENV PORT=8080 \
    DATABASE_PATH=/app/data/bidline.db

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

CMD ["/app/bidline-api"]
