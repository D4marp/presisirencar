FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY *.go ./
RUN CGO_ENABLED=0 go build -o /out/api .

FROM alpine:3.20
RUN adduser -D -u 10001 app && mkdir -p /data && chown app /data
USER app
COPY --from=build /out/api /api
ENV APP_ENV=production DATA_DIR=/data PORT=8080 TRUST_PROXY=1
EXPOSE 8080
VOLUME /data
CMD ["/api"]
