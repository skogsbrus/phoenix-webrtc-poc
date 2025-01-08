# phoenix-webrtc

This repo is a proof of concept, playing around with WebRTC and Phoenix LiveView /
Phoenix Channels.

- Round-trip latency is measured between all clients (peer-to-peer) and between
all clients and the server.
- Ping/pong messages are sent over WebRTC between clients and over a web socket
between clients and server.
- WebRTC Signalling (DSP / ICE) is implemented with Phoenix Channels.

## Setup

```sh
podman run -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -d postgres
```

```sh
nix develop
cd network_health
mix ecto.create
mix ecto.migrate
mix phx.server
```

## Known issues

- The latency charts do not render properly.
- Signalling is broadcasted to all clients and checked clientside instead of
  sending the information to the correct recipient _only_.
- If deployed. clients will likely hit the WebRTC connection limit implemented by their browser (assuming that many clients are connected).
