defmodule NetworkHealthWeb.WebRTCChannel do
  use NetworkHealthWeb, :channel

  @impl true
  def join("web_rtc:" <> room_id, _payload, socket) do
    IO.puts(">>> Joining WebRTC channel #{room_id}")
    peer_id = :crypto.strong_rand_bytes(16)
              |> Base.encode16
              |> String.downcase()
    socket = assign(socket, peer_id: peer_id)
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    broadcast!(socket, "lost_peer", %{peerId: socket.assigns.peer_id})
    :ok
  end

  @impl true
  def handle_info(:after_join, socket) do
    IO.puts(">>> New peer joined: #{socket.assigns.peer_id}")
    broadcast!(socket, "new_peer", %{peerId: socket.assigns.peer_id})
    {:noreply, socket}
  end

  @impl true
  def handle_in("peer_rtt", %{"localId" => local_id, "peerId" => peer_id, "rtt" => rtt}, socket) do
    IO.puts(">>> Received RTT from peer #{local_id} to #{peer_id}: #{rtt}ms")
    {:noreply, socket}
  end

  @impl true
  def handle_in("offer", %{"from" => from, "to" => to, "sdp" => sdp}, socket) do
    IO.puts(">>> Received offer from #{from} to #{to}")
    broadcast!(socket, "offer", %{from: from, to: to, sdp: sdp})
    {:noreply, socket}
  end

  @impl true
  def handle_in("answer", %{"from" => from, "to" => to, "sdp" => sdp}, socket) do
    IO.puts(">>> Received answer from #{from} to #{to}")
    broadcast!(socket, "answer", %{from: from, to: to, sdp: sdp})
    {:noreply, socket}
  end

  @impl true
  def handle_in("ice_candidate", %{"to" => to, "from" => from, "candidate" => candidate}, socket) do
    IO.puts(">>> Received ICE candidate from #{from} to #{to}")
    broadcast!(socket, "ice_candidate", %{from: from, to: to, candidate: candidate})
    {:noreply, socket}
  end
end
