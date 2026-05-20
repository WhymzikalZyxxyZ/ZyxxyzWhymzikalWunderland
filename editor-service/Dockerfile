FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o editor .

FROM scratch
COPY --from=builder /app/editor /editor
EXPOSE 8080
ENTRYPOINT ["/editor"]
