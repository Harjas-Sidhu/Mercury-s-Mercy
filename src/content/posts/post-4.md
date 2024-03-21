---
layout: ../../layouts/MarkdownPostLayout.astro
isDraft: false
title: 'My First Blog Post'
publishDate: 2023-07-01
description: 'A Blog for implementation of WebSockets'
author: 'Astro Learner'
image:
    url: 'https://docs.astro.build/assets/arc.webp'
    alt: 'The full Astro logo.'
tags: ["blogging", "learning in public", "WebSockets", "NodeJs"]
authorContact: 'harjassidhu1@gmail.com'
---
# Implementing a WebSocket Server Using Node.js

In this article, we’ll see how to implement a WebSocket server using Node.js.

Before we jump right in — if you are not familiar with WebSockets as a transport protocol, here’s a brilliant [article](#) that you should read. You can take your learning a bit further with another great [article](#) about long polling.

I’ll be using Node.js for this (version 10.7 is installed on my machine at the time of this article).

Your server may be running Go, .NET, Java, or something else. The implementation in each of those environments will vary depending upon the HTTP server libraries available.

The actual concepts will be fairly consistent though. They all follow the same standard specifications for interpreting and constructing HTTP requests and responses, and for parsing and generating data that uses the WebSocket framing protocol.

For now, though, I’ll assume you have at least some familiarity with Node.js.

Note: If you’ve never touched Node.js in your life, you should check out a few Node.js tutorials to get a simple Node.js server running on your machine. You should also see how to use NPM to install packages, as I’ll be assuming at least a little familiarity with these as we continue.

There are a lot of things to consider when building a WebSocket server, and the intent here is just to demonstrate a starting point.

Topics such as scalability, performance, connection recovery, robust handling of different edge cases, handling of large messages (e.g. 10kb+) are beyond the scope of this tutorial.

On the client-side of things, you don’t really need to do anything special other than use the WebSocket class that is built into modern browsers by default. A possible exception might be if you’re implementing something custom outside of a browser environment — such as some kind of custom mobile hardware.

But on the server, unless you’re using a WebSocket server library you’ve installed, you’ll need to handle the HTTP connection WebSocket upgrade handshake yourself.

You’ll then need to read the raw binary data received via your HTTP socket connection and translate it according to the WebSocket framing protocol specification. This is outlined in Section 5 of RFC 6455.

Finally, the server will need to construct its own messages according to the same specification, and dispatch them back to the client via the open socket connection.

## Set up your project environment

In a new folder, make sure you’ve got a `package.json` file ready, then `npm install node-static`. This will help us fast-track serving up your client-side files.

Create the following files:

1. `server.js`:

    ```javascript
    // Code for server.js goes here
    ```

2. `client.js`:

    ```javascript
    // Code for client.js goes here
    ```

3. `index.html`:

    ```html
    <!-- Basic HTML skeleton for the front-end goes here -->
    ```

Then, from your terminal/console, run:

```
node server.js
```

You should see:

```
Server running at http://localhost:3210
```

Open up your browser and load up the `index.html` file. From the browser’s developer tools you should see the console output of your `client.js` script as follows:

```
WebSocket client script will run here.
```

## Getting the ball rolling with HTTP

One of the early considerations when defining the WebSocket standard was to ensure that it “play nicely” with the web.

This meant recognizing that the web is generally addressed using URLs, not IP addresses and port numbers. A WebSocket connection should be able to take place with the same initial HTTP-based handshake used for any other type of web request.

Here’s what happens in a simple HTTP GET request:

Say there’s an HTML page hosted at `http://www.example.com/index.html`.

Without getting too deep into the HTTP protocol itself, it is enough to know that a request must start with what is referred to as Request-Line.

This is followed by a sequence of key-value pair header lines. Each one tells the server something about what to expect in the subsequent request payload that will follow the header data, and what it can expect from the client regarding the kinds of responses it will be able to understand.

The very first token in the request is the HTTP method. This tells the server the type of operation that the client is attempting with respect to the referenced URL. The GET method is used when the client is simply requesting that the server deliver a copy of the resource that is referenced by the specified URL.

A barebones example of a request header, formatted according to the HTTP RFC, looks like this:

```
GET /index.html HTTP/1.1
Host: www.example.com
```

Having received the request header, the server then formats a response header starting with a Status-Line. This is followed by a set of key-value header pairs that provide the client with reciprocal information from the server, with respect to the request that the server is responding to.

The Status-Line tells the client the HTTP status code (usually 200 if there were no problems). It also provides a brief “reason” text description explaining the status code.

Key-value header pairs appear next, followed by the actual data that was requested (unless the status code indicating that the request was unable to be fulfilled for some reason).

```
HTTP/1.1 200 OK
Date: Wed, 1 Aug 2018 16:03:29 GMT
Content-Length: 291
Content-Type: text/html
(additional headers…)
(response payload continues here…)
```

So what’s this got to do with WebSockets, you might ask?

When making an HTTP request and receiving a response, the actual two-way network communication involved takes place over an active TCP/IP socket.

The web URL that was requested in the browser is mapped via the global DNS system to an IP address, and the default port for HTTP requests is 80.

This means that even though a web URL was entered into the browser, the actual communication occurs via TCP/IP, using an IP address and port combination that looks something like `123.11.85.9:80`.

WebSockets are built on top of the TCP stack as well. This means all we need is a way for the client and the server to agree to hold the socket connection open and repurpose it for ongoing communication.

If they do this, then there is no technical reason why they can’t continue to use the socket to transmit any kind of arbitrary data. The only requirement is that they have both agreed on how the binary data being sent and received should be interpreted.

To begin the process of repurposing the HTTP TCP socket for WebSocket communication, the client can include a standard request header that was invented specifically for this kind of use case:

```
GET /index.html HTTP/1.1
Host: www.example.com
Connection: Upgrade
Upgrade: websocket
```

The `Connection` header tells the server that the client would like to negotiate a change in the way the socket is being used. The accompanying value `Upgrade` indicates that the transport protocol currently in use via TCP should change.

Now that the server knows that the client wants to upgrade the protocol currently in use over the active TCP socket, the server knows to look for the corresponding `Upgrade` header. This will tell it which transport protocol the client wants to use for the remaining lifetime of the connection.

As soon as the server sees `websocket` the value of