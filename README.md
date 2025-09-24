# Reproduce for a race condition in the Node.js `https` module

This reproduce is a result of digging further into the issue reported in
https://github.com/aws/aws-sdk-js-v3/issues/6426. It is somewhat similar to
https://github.com/martinslota/aws-sdk-lib-storage-race but it does not use any
AWS-specific libraries and instead uses the built-in Node.js `https` module
directly.

Overall, it shows that HTTPS client requests tend to hang when all of the
following occurs at the same time:

1. The client specifies the `Expect: 100-continue` header to the server.
1. The client specifies that the payload is empty using the `Content-Length: 0`
   header to the server.
1. The client delays calling `req.end()` a little bit after creating the request.
1. The client calls `req.end()` with an empty buffer as the first argument.

These conditions are not merely theoretical: The requests sent by the AWS SDK
(e.g. `PutObject` requests to S3) are sometimes exactly like that.

The code in [index.js](./index.js) starts a simple HTTPS server and then hammers
it, one request at a time, with requests that satisfy the above conditions.

## Steps to reproduce the race condition

1. Clone this repository
1. Switch to Node.js version 22.10.0 using `fnm use`
1. Install dependencies using `npm ci`
1. Run `npm start`

After some time, the script tends to lock up and fail while waiting for a response,
producing [this kind of output](./example_output.txt).
