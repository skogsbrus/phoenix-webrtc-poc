defmodule NetworkHealth.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      NetworkHealthWeb.Telemetry,
      NetworkHealth.Repo,
      {DNSCluster, query: Application.get_env(:network_health, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: NetworkHealth.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: NetworkHealth.Finch},
      # Start a worker by calling: NetworkHealth.Worker.start_link(arg)
      # {NetworkHealth.Worker, arg},
      # Start to serve requests, typically the last entry
      NetworkHealthWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: NetworkHealth.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    NetworkHealthWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
