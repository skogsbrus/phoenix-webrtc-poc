defmodule MapTransformer do
  def transform_nested_map_keys_to_atoms(map) when is_map(map) do
    map
    |> Enum.map(fn {key, value} ->
      # Convert the key to an atom if it's a string
      new_key = if is_binary(key), do: String.to_atom(key), else: key

      # Recursively transform nested maps
      new_value = if is_map(value), do: transform_nested_map_keys_to_atoms(value), else: value

      {new_key, new_value}
    end)
    |> Enum.into(%{})
  end
end

defmodule NetworkHealthWeb.HealthLive do
  use NetworkHealthWeb, :live_view

  defp calc_rtt(socket) do
    now = :os.system_time(:millisecond)
    case socket.assigns.ping_ts do
      nil -> socket
      before -> assign(socket, :rtt, now - before)
            |> assign(:ping, (now - before) / 2.0)
            |> assign(:server_time, :os.system_time(:millisecond))
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div id="pingpong" class="container" phx-hook="PingPongLatency">
      <!-- Server Health Section -->
      <div class="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-md">
        <h1 class="text-3xl font-bold text-gray-800 mb-6">Network Health</h1>
        <div class="space-y-4">
          <p class="text-lg text-gray-700">
            <span class="font-semibold">Server RTT:</span> <%= @rtt %>ms
          </p>
          <p class="text-lg text-gray-700">
            <span class="font-semibold">Server Ping:</span> <%= @ping %>ms
          </p>
        </div>

        <!-- Server Latency Graph -->
        <div class="flex-auto h-96">
          <h4 class="font-semibold text-gray-800">Server Latency (Ping & RTT)</h4>
          <div class="relative">
            <canvas phx-hook="LatencyChart" id="server-latency-chart" data-ping={@ping} data-rtt={@rtt} data-ts={@server_time}></canvas>
          </div>
        </div>
      </div>

      <!-- Peer Latencies Section -->
      <div class="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-md mt-6">
        <h3 class="text-xl font-semibold mb-4">Peer Latencies</h3>
        <ul class="space-y-4">
          <%= for {peer_id, latency} <- @peer_latencies do %>
            <li class="border-b pb-4">
              <div class="font-medium text-lg text-gray-800">
                Peer: <span class="text-indigo-600"><%= peer_id %></span>
              </div>
              <ul class="mt-2 space-y-2">
                <li class="flex justify-between">
                  <span class="text-sm text-gray-600">RTT:</span>
                  <span class="text-sm font-semibold text-gray-800"><%= latency.rtt %>ms</span>
                </li>
                <li class="flex justify-between">
                  <span class="text-sm text-gray-600">Ping:</span>
                  <span class="text-sm font-semibold text-gray-800"><%= latency.ping %>ms</span>
                </li>
              </ul>
              <!-- Peer Latency Graph -->
              <div class="flex-auto h-96">
                <h5 class="relative text-sm font-semibold text-gray-800">Peer Latency (Ping & RTT)</h5>
                <div class="relative">
                  <canvas phx-hook="PeerLatencyChart" id={"peer-latency-#{peer_id}-chart"} data-ping={latency.ping} data-rtt={latency.rtt} data-ts={@server_time}></canvas>
                </div>
              </div>
            </li>
          <% end %>
        </ul>
      </div>
    </div>
    """
  end

  @doc """
  Mounts the live view, starting the ping-pong cycle by initiating a ping. We
  expect the client to respond with a a pong.
  """
  @impl true
  def mount(_params, _session, socket) do
    socket = socket
      |> assign(:ping, nil)
      |> assign(:rtt, nil)
      |> assign(:peer_latencies, %{})
      |> assign(:server_time, :os.system_time(:millisecond))

    Process.send_after(self(), :ping, 0)
    {:ok, socket}
  end

  @impl true
  def handle_info(:ping, socket) do
    socket = assign_new(socket, :rtt, fn -> nil end)
     |> assign(:ping_ts, :os.system_time(:millisecond))
     |> push_event("ping", %{})
    {:noreply, socket}
  end

  @doc """
  Handles the pong event, calculating the round-trip time latency.
  """
  @impl true
  def handle_event("pong", _value, socket) do
    socket = calc_rtt(socket)
    Process.send_after(self(), :ping, 1_000)
    {:noreply, socket}
  end

  def handle_event("peer_latency", peer_latencies, socket) do
    socket = socket
     |> assign(:peer_latencies, MapTransformer.transform_nested_map_keys_to_atoms(peer_latencies))
     |> assign(:server_time, :os.system_time(:millisecond))

    {:noreply, socket}
  end
end
