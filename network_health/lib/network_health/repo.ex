defmodule NetworkHealth.Repo do
  use Ecto.Repo,
    otp_app: :network_health,
    adapter: Ecto.Adapters.Postgres
end
