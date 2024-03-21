---
layout: ../../layouts/MarkdownPostLayout.astro
isDraft: false
title: 'My Fourth Blog Post'
publishDate: 2023-07-01
description: 'This is a blog on implementation of WebSockets in NodeJS.'
author: 'Astro Learner'
image:
    url: 'https://docs.astro.build/assets/arc.webp'
    alt: 'The full Astro logo.'
tags: ["NodeJs", "WebSockets", "blogging", "learning in public"]
authorContact: 'harjassidhu1@gmail.com'
---
# Implementing WebSockets in NodeJS

In this article, we’ll see how to implement a WebSocket server using Node.js.

Before we jump right in — if you are not familiar with WebSockets as a transport protocol, here’s a brilliant article that you should read. You can take your learning a bit further with another great article about long polling.

I’ll be using Node.js for this (version 10.7 is installed on my machine at the time of this article).

Your server may be running Go, .NET, Java, or something else. The implementation in each of those environments will vary depending upon the HTTP server libraries available.

The actual concepts will be fairly consistent though. They all follow the same standard specifications for interpreting and constructing HTTP requests and responses, and for parsing and generating data that uses the WebSocket framing protocol.

For now, though, I’ll assume you have at least some familiarity with Node.js.

```Note: If you’ve never touched Node.js in your life, you should check out a few Node.js tutorials to get a simple Node.js server running on your machine. You should also see how to use NPM to install packages, as I’ll be assuming at least a little familiarity with these as we continue.```

There are a lot of things to consider when building a WebSocket server, and the intent here is just to demonstrate a starting point.

Topics such as scalability, performance, connection recovery, robust handling of different edge cases, handling of large messages (e.g. 10kb+) are beyond the scope of this tutorial.

On the client-side of things, you don’t really need to do anything special other than use the WebSocket class that is built into modern browsers by default. A possible exception might be if you’re implementing something custom outside of a browser environment — such as some kind of custom mobile hardware.

But on the server, unless you’re using a WebSocket server library you’ve installed, you’ll need to handle the HTTP connection WebSocket upgrade handshake yourself.

You’ll then need to read the raw binary data received via your HTTP socket connection and translate it according to the WebSocket framing protocol specification. This is outlined in Section 5 of RFC 6455.

Finally, the server will need to construct its own messages according to the same specification, and dispatch them back to the client via the open socket connection.

Set up your project environment
In a new folder, make sure you’ve got a package.json file ready, then npm install node-static. This will help us fast-track serving up your client-side files.

## Create the following files:

1. **server.js**:

The node-static library is a convenience that takes care of the fiddly process of responding to requests for the static HTML and JavaScript files that will run on the client-side in the browser.

2. **client.js**:

The above is just a stub so you know your client script has actually loaded correctly. We’ll fill it out as we continue with the implementation further below.

3. **index.html**:

The above is a basic HTML skeleton for the front-end.

Then, from your terminal/console, run:

node server.js
You should see:

```Server running at http://localhost:3210```

Open up your browser and load up the index.html file. From the browser’s developer tools you should see the console output of your client.js script as follows:

```WebSocket client script will run here.```

Getting the ball rolling with HTTP
One of the early considerations when defining the WebSocket standard was to ensure that it “play nicely” with the web.

This meant recognizing that the web is generally addressed using URLs, not IP addresses and port numbers. A WebSocket connection should be able to take place with the same initial HTTP-based handshake used for any other type of web request.

Here’s what happens in a simple HTTP GET request
Say there’s an HTML page hosted at http://www.example.com/index.html.

Without getting too deep into the HTTP protocol itself, it is enough to know that a request must start with what is referred to as Request-Line.

This is followed by a sequence of key-value pair header lines. Each one tells the server something about what to expect in the subsequent request payload that will follow the header data, and what it can expect from the client regarding the kinds of responses it will be able to understand.

The very first token in the request is the HTTP method. This tells the server the type of operation that the client is attempting with respect to the referenced URL. The GET method is used when the client is simply requesting that the server deliver a copy of the resource that is referenced by the specified URL.

A barebones example of a request header, formatted according to the HTTP RFC, looks like this:

```GET /index.html HTTP/1.1```
```Host: www.example.com```

Having received the request header, the server then formats a response header starting with a Status-Line. This is followed by a set of key-value header pairs that provide the client with reciprocal information from the server, with respect to the request that the server is responding to.

The Status-Line tells the client the HTTP status code (usually 200 if there were no problems). It also provides a brief “reason” text description explaining the status code.

Key-value header pairs appear next, followed by the actual data that was requested (unless the status code indicating that the request was unable to be fulfilled for some reason).

```HTTP/1.1 200 OK```
```Date: Wed, 1 Aug 2018 16:03:29 GMT```
```Content-Length: 291```
```Content-Type: text/html```
```(additional headers…)```
```(response payload continues here…)```

So what’s this got to do with WebSockets, you might ask?

When making an HTTP request and receiving a response, the actual two-way network communication involved takes place over an active TCP/IP socket.

The web URL that was requested in the browser is mapped via the global DNS system to an IP address, and the default port for HTTP requests is 80.

This means that even though a web URL was entered into the browser, the actual communication occurs via TCP/IP, using an IP address and port combination that looks something like 123.11.85.9:80.

WebSockets are built on top of the TCP stack as well. This means all we need is a way for the client and the server to agree to hold the socket connection open and repurpose it for ongoing communication.

If they do this, then there is no technical reason why they can’t continue to use the socket to transmit any kind of arbitrary data. The only requirement is that they have both agreed on how the binary data being sent and received should be interpreted.

To begin the process of repurposing the HTTP TCP socket for WebSocket communication, the client can include a standard request header that was invented specifically for this kind of use case:

```GET /index.html HTTP/1.1```
```Host: www.example.com```
```Connection: Upgrade```
```Upgrade: websocket```

The Connection header tells the server that the client would like to negotiate a change in the way the socket is being used. The accompanying value Upgrade indicates that the transport protocol currently in use via TCP should change.

Now that the server knows that the client wants to upgrade the protocol currently in use over the active TCP socket, the server knows to look for the corresponding Upgrade header. This will tell it which transport protocol the client wants to use for the remaining lifetime of the connection.

As soon as the server sees websocket the value of the Upgradeheader, it knows that a WebSocket handshake process has begun.

The handshake process (along with everything else) is outlined in detail in RFC 6455, if you’d like to go into more detail on this topic.

Update your server.js code so that it can respond to an HTTP upgrade request:


Node.js does most of the heavy lifting with respect to parsing HTTP requests received from the client, as you can see in the code above.

All we need to do is listen for the upgrade event, then check that the Upgrade header is trying to switch to a WebSocket connection, and not something else unexpected.

Once we’ve done that, we can complete the handshake and then move on to the business of sending and receiving WebSocket frame data.

The fine-grained details of the handshake are outlined in section 4 of the RFC.

Avoiding funny business
The first part of the WebSocket handshake, other than what is described above, involves proving that this is actually a proper WebSocket upgrade handshake. It is important to prove that the process is not being hijacked by some kind of intermediate trickery — either by the client or perhaps by a proxy server that sits in the middle.

When initiating an upgrade to a WebSocket connection, the client must include a Sec-WebSocket-Key header with a value unique to that client. Here’s an example:

```Sec-WebSocket-Key: BOq0IliaPZlnbMHEBYtdjmKIL38=```
The above is automatic and handled for you if using the WebSocket class provided in modern browsers. You need only look for it on the server-side and produce a response.

When responding, the server must append the special GUID value ```258EAFA5-E914-47DA-95CA-C5AB0DC85B11``` to the key and generate a SHA-1 hash of the resultant string. Then it includes this as the base-64-encoded value of a Sec-WebSocket-Acceptheader in the response:

```Sec-WebSocket-Accept: 5fXT1W3UfPusBQv/h6c4hnwTJzk=```

In a Node.js WebSocket server, we could write a function to generate this value like so:


We’d then only need to call this function, passing the value of the Sec-WebSocket-Key header as the argument, and set the function return value as the value of the Sec-WebSocket-Accept header when sending the response.

To complete the handshake, write the appropriate HTTP response headers to the client socket. A bare-bones response would look something like this:

```HTTP/1.1 101 Web Socket Protocol Handshake```
```Upgrade: WebSocket```
```Connection: Upgrade```
```Sec-WebSocket-Accept: m9raz0Lr21hfqAitCxWigVwhppA=```

Update your server.js script like so:


We’re not actually quite finished with the handshake at this point — there are a couple more things to think about.

Subprotocols - agreeing upon a shared dialect
The client and server generally need to agree on a compatible strategy with respect to how they format, interpret and organize the data itself. This is both within a given message, and over time from one message to the next.

This is where subprotocols (mentioned earlier) come in.

If the client knows that it can deal with one or more specific application-level protocols (such as WAMP, MQTT, etc.), it can include a list of the protocols it understands when making the initial HTTP request.

If it does so, the server is then required to either select one of those protocols and include it in a response header or to otherwise fail the handshake and terminate the connection.

Example subprotocol request header:

```Sec-WebSocket-Protocol: mqtt, wamp```

Example reciprocal header issued by the server in the response:

```Sec-WebSocket-Protocol: wamp```

Note that the server must select exactly one protocol from the list provided by the client. Selecting more than one would mean that the data in subsequent WebSocket messages cannot be reliably interpreted by the server.

An example of this would be if both json-ld and json-schema were selected by the server. Both are data formats built on the JSON standard. There would be numerous edge cases where one could be interpreted as the other, leading to unexpected errors when processing the data.

While admittedly not messaging protocols per se, the example is still applicable.

When both the client and server are implemented to use a common messaging protocol from the outset, the Sec-WebSocket-Protocol header can be omitted in the initial request. In this case, the server can ignore this step.

Subprotocol negotiation is most useful when there can be no forward to guarantee that both the client and server will understand each other once the WebSocket connection has been established.

Standardised names for common protocols should be registered with the IANA registry for WebSocket Subprotocol Names. At the time of this article, there are 36 names already registered. These include soap, xmpp, wamp, mqtt, and others.

The registry is the single source of truth for mapping a subprotocol name to its interpretation. However, the only strict requirement is that the client and server agree upon what their mutually-selected subprotocol actually means. It doesn’t matter whether it appears in the IANA registry.

As a demonstration of subprotocols in the handshake, let’s have the client and server both agree to use JSON-formatted data when communicating.

As mentioned above, nobody’s forcing the client and server to only use an official subprotocol, or for the subprotocol to be an actual end-to-end messaging protocol.

It is perfectly valid to simply agree on json as a subprotocol for the purposes of formatting client and server messages in a consistent way. This is what we’ll be doing here. We’ll add this to the server code as a starting point:

Directly after the ```const responseHeaders = [ ... ]; statement:```

```Note: if the client has requested the use of a subprotocol but hasn’t provided any that the server is able to support, the server must send a failure response and close the connection. We won’t bother with that in this implementation. But you would need to if taking things further yourself.```

## WebSocket extensions

There is also a header for defining extensions to the way the data payload is encoded and framed. At the time of this article, only one standardized extension type exists. It provides a kind of WebSocket-equivalent to gzip compression in messages.

Another example of where extensions might come into play is multiplexing — the use of a single socket to interleave multiple concurrent streams of communication.

WebSocket extensions are an advanced topic and are really beyond the scope of this article. For now, it is enough to know what they are, and how they fit into the picture.

The client-side: using WebSockets in the browser
Before continuing with the server implementation, let’s first take a look at the client-side of the equation. After all, it’s kind of hard to test the server code without a client to kick things off.

The WebSocket API is defined in the WHATWG HTML Living Standard and actually pretty easy to use. To begin, construct a WebSocket object:


Note the use of ws where you’d normally have the http scheme. There’s also the option to use wss where you’d normally use https. These protocols were introduced alongside the WebSocket specification. They are designed to represent an HTTP connection that includes a request to upgrade the connection to use WebSockets.

Creating the WebSocket object isn’t going to do a lot by itself. The connection is established asynchronously, so you’ll need to listen for the completion of the handshake before sending any messages:


Another event listener is required in order to receive messages from the server:


There are also error and close events. WebSockets don’t automatically recover when connections are terminated. This is something you need to implement yourself and is part of the reason why there are many client-side libraries in existence.

While the WebSocket class is straightforward and easy to use, it really is just a basic building block. Support for different subprotocols or additional features such as messaging channels must be implemented separately.

Give it a go yourself
As a convenience, a public echo server for testing WebSockets is hosted by websocket.org. Try the following code in your browser. The echo server receives whatever message you send, and echoes the message data back to the WebSocket from which the message originated.

Enter the following into your client.js script and run it, paying attention to the developer console:


You should see the “Hello!” message sent to the echo server and then received back in the message handler:

```Sending: Hello!```
```Received: Hello!```
```Once you’ve done that, modify the code in preparation for communication with your own WebSocket server:```


Notice that I’ve added an additional parameter during WebSocket construction – an array of subprotocols that will be sent via the Sec-WebSocket-Protocol request header.

Like the server code provided earlier, the server will select json from the list and include it in the initial handshake response. The WebSocket API implemented by the browser will automatically fail the connection if the server does not select one of the specified subprotocols.

During implementation, try having the server select a subprotocol that is inconsistent with what was received from the client during the initial request. The client should throw an error and terminate the connection immediately.

The above code is the entire client-side script we’ll be using! Anything else you want to add is up to you, but the remainder of this implementation will take place on the server-side.

Generating and parsing WebSocket message frames
Once the handshake response has been sent to the client, we can begin sending and receiving messages between the client and the server. Take a quick look at section 5 of the RFC to get a sense of what’s involved.

WebSocket messages are delivered in packages called “frames”. These begin with a message header and conclude with the “payload” — the message data for this frame.

Large messages may split the data over several frames. In this case, you’ll need to keep track of what you’ve received so far and piece the data together once it has all arrived.

Alignment of Node.js socket buffers with WebSocket message frames
Node.js socket data (I’m talking about net.Socket in this case, not WebSockets) is received in buffered chunks. These are split apart with no regard for where your WebSocket frames begin or end!

What this means is that if your server is receiving large messages fragmented into multiple WebSocket frames, or receiving large numbers of messages in rapid succession, there’s no guarantee that each data buffer received by the Node.js socket will align with the start and end of the byte data that makes up a given frame.

So, as you’re parsing each buffer received by the socket, you’ll need to keep track of where one frame ends and where the next begins. You’ll need to be sure that you’ve received all of the bytes of data for a frame — before you can safely consume that frame’s data.

It may be that one frame ends midway through the same buffer in which the next frame begins. It also may be that a frame is split across several buffers that will be received in succession.

The following diagram is an exaggerated illustration of the issue. In most cases, frames tend to fit inside a buffer. Due to the way the data arrives, you’ll often find that a frame will start and end in line with the start and end of the socket buffer. But this can’t be relied upon in all cases and must be considered during implementation.


This can take some work to get right.

For the basic implementation that follows below, I have skipped any code for handling large messages or messages split across multiple frames.

Doing so requires the coordination of multiple data buffers across multiple frames. It would overcomplicate the exercise with the logic that is more about Node.js sockets than it is about WebSockets. My purpose here is to demonstrate some of the low-level work required to parse WebSocket frames to achieve two-way communication between a client and a server.

## Implementing the parser
To get started, update server.js code with the following:


We’ll start by implementing the parseMessage function.

The RFC is actually reasonably easy to follow. The sequence of bytes in a frame is laid out in the RFC using the following diagram:


Let’s break it down. There are two primary types of frames: message frames and control frames.

Message frames carry message data (the “payload”). Control frames are used for other purposes, such as sending a ping or pong, indicating that the connection is about to close, and so forth.

WebSocket frames consist of a header, followed by the message payload, if applicable. The header always starts with two bytes (or 16 bits).

The first bit tells us, for message frames, whether this is the last frame of the current message. This will always have the value 1 if your message frames are small (< 126 bytes).

Three reserved bits follow (we can generally ignore them), and then four bits for an “opcode”, which tells us what sort of frame this is.

After that, there is a single bit telling us whether the message payload is “masked” (more on this later), and then seven bits for the number of bytes in the payload.

Seven bits aren’t a lot though, so if the length is 126, then we can expect an extra two bytes (16 bits) with the actual payload length. Alternatively, if the length is 127, instead of two bytes, there will be an additional eight bytes to store the length as a 64-bit integer.


Opcodes: message frames vs control frames
**According to the RFC:**

Opcode: 4 bits
Defines the interpretation of the “Payload data”. If an unknown
opcode is received, the receiving endpoint MUST Fail the
WebSocket Connection. The following values are defined.
%x0 denotes a continuation frame
%x1 denotes a text frame
%x2 denotes a binary frame
%x3–7 are reserved for further non-control frames
%x8 denotes a connection close
%x9 denotes a ping
%xA denotes a pong
%xB-F are reserved for further control frames
Important points:

A continuation frame is used when a message is split into multiple frames. Our implementation is only dealing with small messages, so we won’t handle this case for now. But if you decide to do this yourself, keep in mind that when you encounter a continuation frame, it means that the opcode is the same as for the initial message frame in the sequence, up until the end of the final frame. You’ll identify this by the first bit in the message header.
We generally only care about text frames and binary frames for messages. In our case, we’ll only be supporting text frames. You might use binary frames for images, audio, and so forth.
You do need to support the 0x8 – “close” opcode – otherwise you won’t know that the client has disconnected.
Let’s implement this:


**Masked frames**
Frames sent by the client may be “masked” (and when the client is a browser, this will always be the case). What this means is that the browser will include a special four-byte “masking key” which must be XOR’d against each consecutive four-byte sequence in the message payload. The result will be the actual data.

Masking is a mechanism that ensures that message frames retain their integrity, and are not interfered with by third parties, such as intermediate proxy servers.

If the second byte of the initial header starts with the first bit set to 1, then the masking key will occupy the four bytes that follow the payload length (including the extended payload length, if present).

Start by reading the masking key from the buffer:


Next, read the data from the buffer:


The data buffer should now hold the data sent by the client, which means all we have to do is decode the buffer to a string:


Constructing a frame buffer for the response message
If you were able to successfully get all of the above workings, then the response should be fairly trivial — especially because messages sent by the server should not be masked, according to the RFC.

To save time, here’s the implementation:


Dispatching the response back to the client
You should already have the following code from earlier in the article, but I’ll repeat it here in order to wrap things up:


At this point you can run your server from the command line, then open your browser to localhost on port 3210. Using the browser’s developer tools, you’ll see the browser send a message and the server respond accordingly.

Remember — my implementation is not even remotely complete. Nor is it particularly efficient. There are many existing WebSocket server implementations out there already.

Moving forward — other things you might consider
The raw implementation of a WebSocket server is really just the first stage of the process. Here are just a few of the things you’ll want to think about if you taking things to the next level:

What framing extensions will you support, such as per-message deflation?
What degree of client interoperability are you aiming for?
Are messages being received in the same order they were sent? If not, how can you prevent this from putting your application into an invalid state?
Do you need guarantees on message delivery? If so, what strategies can you implement to this end?
How many connections are active on your server?
Are any connections hogging all of the server’s resources?
Are any connections idle and should ideally be dropped?
What is the duration of the average connection lifespan?
Are connections being dropped prematurely/unexpectedly, and if so, how can you retain diagnostic data to explain why?
Are you experiencing brief connection spikes ever, and if so, what is the performance impact on your server?
How much bandwidth is being used overall, and how is it impacting your budget?
Is your server’s capacity near its limit, and if not, how soon will that threshold be reached?
How will you automatically add additional server capacity if and when it is needed?
Think about the messaging protocols available, such as MQTT, WAMP, etc., and whether they can provide a solution to some of these questions. Consider existing libraries and frameworks, and the additional features they offer beyond simple, bare-bones management of WebSocket connections.

For further reading, you can check out Building realtime apps with Node.js and WebSockets: client-side considerations.

If you have a particular need to scale, and limited manpower or expertise to do so effectively, consider leveraging cloud-based realtime messaging solutions that have already solved these problems for you.