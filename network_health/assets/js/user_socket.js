// NOTE: The contents of this file will only be executed if
// you uncomment its entry in "assets/js/app.js".

// Bring in Phoenix channels client library:
import {Socket} from "phoenix"

// And connect to the path in "lib/network_health_web/endpoint.ex". We pass the
// token for authentication. Read below how it should be used.
let socket = new Socket("/socket", {params: {token: window.userToken}})

// When you connect, you'll often need to authenticate the client.
// For example, imagine you have an authentication plug, `MyAuth`,
// which authenticates the session and assigns a `:current_user`.
// If the current user exists you can assign the user's token in
// the connection for use in the layout.
//
// In your "lib/network_health_web/router.ex":
//
//     pipeline :browser do
//       ...
//       plug MyAuth
//       plug :put_user_token
//     end
//
//     defp put_user_token(conn, _) do
//       if current_user = conn.assigns[:current_user] do
//         token = Phoenix.Token.sign(conn, "user socket", current_user.id)
//         assign(conn, :user_token, token)
//       else
//         conn
//       end
//     end
//
// Now you need to pass this token to JavaScript. You can do so
// inside a script tag in "lib/network_health_web/templates/layout/app.html.heex":
//
//     <script>window.userToken = "<%= assigns[:user_token] %>";</script>
//
// You will need to verify the user token in the "connect/3" function
// in "lib/network_health_web/channels/user_socket.ex":
//
//     def connect(%{"token" => token}, socket, _connect_info) do
//       # max_age: 1209600 is equivalent to two weeks in seconds
//       case Phoenix.Token.verify(socket, "user socket", token, max_age: 1_209_600) do
//         {:ok, user_id} ->
//           {:ok, assign(socket, :user, user_id)}
//
//         {:error, reason} ->
//           :error
//       end
//     end
//
// Finally, connect to the socket:
socket.connect()

// Now that you are connected, you can join channels with a topic.
// Let's assume you have a channel with a topic named `room` and the
// subtopic is its id - in this case 42:

const WebRTCManager = (() => {
  const peerConnections = {};
  const peerLatencies = {};
  let localId = null;
  let onLatenciesUpdatedCallback = null;
  let channel;

  function handlePong(peerId) {
    peerLatencies[peerId].pongTs = Date.now();
    const rtt = peerLatencies[peerId].pongTs - peerLatencies[peerId].pingTs;
    peerLatencies[peerId].rtt = rtt;
    peerLatencies[peerId].ping = rtt / 2;
    console.log(`RTT for peer ${peerId}: ${rtt}ms`);

    // Notify the callback
    if (onLatenciesUpdatedCallback) {
      onLatenciesUpdatedCallback(peerLatencies);
    }
  }

  function sendPing(dataChannel, peerId, delay = null) {
    if (delay !== null) {
      setTimeout(() => {
        peerLatencies[peerId].pingTs = Date.now();
        dataChannel.send("ping");
      }, delay);
    } else {
      peerLatencies[peerId].pingTs = Date.now();
      dataChannel.send("ping");
    }
  }

  function sendPong(dataChannel) {
    dataChannel.send("pong");
  }

  async function createAnswer(peerId, sdpOffer) {
    console.log(`Creating answer for peer ${peerId}`);
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    peerConnections[peerId] = peerConnection;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdpOffer));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        channel.push("ice_candidate", {
          to: peerId,
          from: localId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ondatachannel = (event) => {
      const dc = event.channel;
      dc.onopen = () => {
        peerLatencies[peerId] = {};
        sendPing(dc, peerId);
      };

      dc.onmessage = (event) => {
        if (event.data === "ping") {
          sendPong(dc);
        } else if (event.data === "pong") {
          handlePong(peerId);
          sendPing(dc, peerId, 1000);
        }
      };
    };

    const sdp = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(sdp);

    channel.push("answer", { to: peerId, from: localId, sdp });
  }

  async function createOffer(peerId) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnections[peerId] = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        channel.push("ice_candidate", {
          to: peerId,
          from: localId,
          candidate: event.candidate,
        });
      }
    };

    const dc = peerConnection.createDataChannel("pingpong");
    dc.onopen = () => {
      peerLatencies[peerId] = {};
      sendPing(dc, peerId);
    };

    dc.onmessage = (event) => {
      if (event.data === "ping") {
        sendPong(dc);
      } else if (event.data === "pong") {
        handlePong(peerId);
        sendPing(dc, peerId, 1000);
      }
    };

    const sdp = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(sdp);

    channel.push("offer", { to: peerId, from: localId, sdp });
  }

  function setupChannel(roomId) {
    channel = socket.channel(`web_rtc:${roomId}`);
    channel.join()
      .receive("ok", () => console.log(`Joined room '${roomId}' successfully`))
      .receive("error", () => console.error(`Failed to join room '${roomId}'`));

    channel.on("new_peer", ({ peerId }) => {
      if (!localId) {
        localId = peerId;
      }
      if (peerId === localId) return;
      console.log("New peer:", peerId);
      createOffer(peerId);
    });

    channel.on("lost_peer", ({ peerId }) => {
      console.log("Lost peer:", peerId);
      if (peerConnections[peerId]) {
        peerConnections[peerId].close();
        delete peerConnections[peerId];
      }
      delete peerLatencies[peerId];
    });

    channel.on("offer", ({ from, to, sdp }) => {
      if (from === localId) return;
      createAnswer(from, sdp);
    });

    channel.on("answer", ({ from, to, sdp }) => {
      if (to === localId) {
        peerConnections[from].setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    channel.on("ice_candidate", ({ from, to, candidate }) => {
      if (to === localId) {
        peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  return {
    init: (roomId, onLatenciesUpdated) => {
      setupChannel(roomId);
      onLatenciesUpdatedCallback = onLatenciesUpdated;
    },
  };
})();

export default WebRTCManager;
