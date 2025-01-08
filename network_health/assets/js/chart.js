import Chart from "chart.js/auto"

function update(chartElem) {
  // Create timestamp for the x-axis (labels)
  const timestamp = chartElem.el.dataset.ts;

  // Get the new ping and RTT values from data attributes
  const newPing = parseFloat(chartElem.el.dataset.ping);
  const newRtt = parseFloat(chartElem.el.dataset.rtt);

  // Update the chart data (append the new values)
  chartElem.chart.data.labels.push(timestamp); // Add the timestamp to the x-axis
  chartElem.chart.data.datasets[0].data.push(newPing); // Add ping to dataset 0 (blue line)
  chartElem.chart.data.datasets[1].data.push(newRtt); // Add RTT to dataset 1 (red line)

  // Optionally, you can limit the number of points (e.g., keeping only the last 50)
  if (chartElem.chart.data.labels.length > 50) {
    chartElem.chart.data.labels.shift(); // Remove the oldest timestamp
    chartElem.chart.data.datasets[0].data.shift(); // Remove the oldest ping
    chartElem.chart.data.datasets[1].data.shift(); // Remove the oldest RTT
  }

  // Update the chart to reflect the new data
  chartElem.chart.update();
}

function chartConfig() {
  return {
    type: "line", // Line chart for time series
    data: {
      labels: [], // This will store time stamps or x-axis labels
      datasets: [
        {
          label: "Ping",
          data: [], // Stores ping values over time
          borderColor: "#2196F3", // Blue for ping
          fill: false, // Don't fill the area under the line
          tension: 0.1 // Smoothness of the line
        },
        {
          label: "RTT",
          data: [], // Stores RTT values over time
          borderColor: "#FF5722", // Red for RTT
          fill: false, // Don't fill the area under the line
          tension: 0.1 // Smoothness of the line
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear", // Linear scale for time axis
          position: "bottom",
          display: false,
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Milliseconds"
          }
        }
      },
      elements: {
        line: {
          borderWidth: 2 // Adjust line thickness
        }
      }
    }
  };
}

LatencyChart = {
  _init() {
    if (!this.chart) {
      const ctx = this.el.getContext("2d");
      this.chart = new Chart(ctx, this._getChartConfig());
    }
  },

  mounted() {
    this._init();
  },

  updated() {
    this._init();
    update(this);
  },

  _getChartConfig() {
    return chartConfig();
  },

  destroyed() {
    if (this.chart) {
      this.chart.destroy();
    }
  },
};

PeerLatencyChart = {
  _init() {
    if (!this.chart) {
      const ctx = this.el.getContext("2d");
      this.chart = new Chart(ctx, this._getChartConfig());
    }
  },

  mounted() {
    this._init();
  },

  updated() {
    this._init();
    update(this);
  },

  destroyed() {
    if (this.chart) {
      this.chart.destroy();
    }
  },

  _getChartConfig() {
    return chartConfig();
  }
};

export default {LatencyChart, PeerLatencyChart};
