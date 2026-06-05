function renderSentinelCharts(data) {
  if (!window.Chart || !data) return;

  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  const textColor = theme === "dark" ? "#e8eaf0" : "#0f172a";
  const borderColor = theme === "dark" ? "#1e293b" : "#cbd5e1";

  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = borderColor;
  Chart.defaults.font.family = "DM Sans";

  const palette = ["#00f5ff", "#ff3c5f", "#ffb300", "#00ff9d", "#2f81f7", "#a855f7"];

  function rc(id) { return document.getElementById(id); }

  function lineChart(id, labels, values, label, color) {
    const el = rc(id);
    if (!el) return;
    new Chart(el, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: label || "Count",
          data: values,
          borderColor: color || "#00f5ff",
          backgroundColor: (color || "#00f5ff") + "22",
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { ticks: { maxRotation: 45 } }
        }
      }
    });
  }

  function doughnutChart(id, labels, values, colors) {
    const el = rc(id);
    if (!el) return;
    new Chart(el, {
      type: "doughnut",
      data: { labels: labels, datasets: [{ data: values, backgroundColor: colors || palette }] },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom", labels: { padding: 12 } } }
      }
    });
  }

  function barChart(id, labels, values, label, color) {
    const el = rc(id);
    if (!el) return;
    new Chart(el, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{ label: label || "Count", data: values, backgroundColor: color || "#00ff9d" }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  const monthly = rc("monthlyChart");
  if (monthly) {
    const labels = Object.keys(data.monthly || {});
    const values = Object.values(data.monthly || {});
    lineChart("monthlyChart", labels, values, "Incidents", "#00f5ff");
  }

  const severity = rc("severityChart");
  if (severity) {
    doughnutChart("severityChart", Object.keys(data.severity || {}), Object.values(data.severity || {}), ["#ff3c5f", "#ff7b00", "#ffb300", "#2f81f7"]);
  }

  const workload = rc("workloadChart");
  if (workload) {
    barChart("workloadChart", Object.keys(data.workload || {}), Object.values(data.workload || {}), "Assigned", "#00ff9d");
  }

  const typeChart = rc("typeChart");
  if (typeChart && data.types) {
    barChart("typeChart", Object.keys(data.types), Object.values(data.types), "Incidents", "#a855f7");
  }

  const trendChart = rc("trendChart");
  if (trendChart && data.monthly) {
    lineChart("trendChart", Object.keys(data.monthly), Object.values(data.monthly), "Trend", "#00f5ff");
  }

  const resolutionChart = rc("resolutionChart");
  if (resolutionChart && data.resolutionTimes) {
    const items = data.resolutionTimes.slice(0, 15);
    barChart("resolutionChart", items.map(i => i.incident_id ? "SX-" + String(i.incident_id).padStart(5, "0") : ""), items.map(i => i.time_to_resolve_hours || 0), "Hours", "#ffb300");
  }

  const analystPerfChart = rc("analystPerfChart");
  if (analystPerfChart && data.analystPerformance) {
    barChart("analystPerfChart", data.analystPerformance.map(a => a.analyst), data.analystPerformance.map(a => a.resolved), "Resolved", "#00ff9d");
  }

  document.addEventListener("themeChanged", () => {
    location.reload();
  });
}
