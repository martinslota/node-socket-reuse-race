#!/usr/bin/env node

import { readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import debug from "debug";
import pTimeout from "p-timeout";

const log = debug("client");

const options = {
  pfx: readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "test_cert.pfx")
  ),
  passphrase: "sample",
};

const server = https.createServer(options, (_req, res) => {
  res.writeHead(200);
  res.end();
});

await new Promise((resolve) =>
  server.listen(12345, "127.0.0.1", () => {
    console.log("Server is listening on port 12345");
    resolve();
  })
);

let latestRequestId = 0;
let latestReq = null;

for (let i = 0; i < 1000; i++) {
  await pTimeout(
    new Promise((resolve, reject) => {
      const req = https.request(
        "https://127.0.0.1:12345",
        {
          method: "POST",
          headers: {
            // The issue only seems to occur when both these headers are set.
            "Content-Length": "0",
            Expect: "100-continue",
          },
          rejectUnauthorized: false,
        },
        (res) => {
          log(`Response for request ${req.requestId}`, res.statusCode);
          res.on("data", () => {});
          res.on("end", resolve);
          res.on("error", reject);

          // Log response events.
          for (const event of [
            "close",
            "data",
            "end",
            "error",
            "pause",
            "readable",
            "resume",
          ]) {
            res.on(event, () => {
              log(`Response for request ${req.requestId}`, event);
            });
          }
        }
      );
      req.on("error", reject);

      // Avoiding the setTimeout() or the empty buffer parameter seems to
      // side-step the issue.
      setTimeout(() => req.end(Buffer.from([])), 0);

      req.requestId = ++latestRequestId;
      latestReq = req;

      // Log request events.
      for (const event of [
        "abort",
        "close",
        "connect",
        "continue",
        "drain",
        "error",
        "finish",
        "information",
        "pipe",
        "prefinish",
        "response",
        "socket",
        "timeout",
        "unpipe",
        "upgrade",
      ]) {
        req.on(event, () => {
          log(
            `Request ${req.requestId}`,
            event,
            req === latestReq
              ? "[latest request]"
              : req.socket === latestReq?.socket
              ? "[socket same as the latest request]"
              : "[socket not same as the latest request]"
          );
        });
      }
    }),
    { milliseconds: 5_000 }
  );
  log("Request succeeded");
}

server.close();
