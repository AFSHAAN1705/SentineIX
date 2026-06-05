(function () {
  if (window.bootstrap) {
    document.querySelectorAll(".toast").forEach((toast) => new bootstrap.Toast(toast).show());
  }

  const canvas = document.getElementById("matrixRain");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const glyphs = "01SXDETECTINVESTIGATE";
    let columns = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Array(Math.ceil(canvas.width / 18)).fill(0);
    };
    const draw = () => {
      ctx.fillStyle = "rgba(8, 11, 18, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00e5ff";
      ctx.font = "16px Share Tech Mono";
      columns.forEach((y, index) => {
        const text = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillText(text, index * 18, y);
        columns[index] = y > canvas.height + Math.random() * 800 ? 0 : y + 18;
      });
      requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  const password = document.getElementById("passwordInput");
  const strength = document.getElementById("strengthBar");
  if (password && strength) {
    password.addEventListener("input", () => {
      const value = password.value;
      let score = Math.min(value.length * 8, 45);
      if (/[A-Z]/.test(value)) score += 15;
      if (/[0-9]/.test(value)) score += 15;
      if (/[^A-Za-z0-9]/.test(value)) score += 25;
      strength.style.width = `${Math.min(score, 100)}%`;
      strength.style.background = score > 75 ? "#00ff9d" : score > 45 ? "#ffb300" : "#ff3c5f";
    });
  }

  const severityGrid = document.querySelector("[data-severity-grid]");
  const severityInput = document.getElementById("severityInput");
  const severityHelp = document.getElementById("severityHelp");
  const helpText = {
    Low: "Low severity keeps the report in queue without immediate escalation.",
    Medium: "Medium severity flags the incident for business-impact triage.",
    High: "High severity prioritizes analyst response and containment review.",
    Critical: "Critical severity signals active breach, ransomware, or severe outage risk."
  };
  if (severityGrid && severityInput) {
    severityGrid.querySelectorAll(".severity-card").forEach((card) => {
      card.addEventListener("click", () => {
        severityGrid.querySelectorAll(".severity-card").forEach((item) => item.classList.remove("selected"));
        card.classList.add("selected");
        severityInput.value = card.dataset.value;
        if (severityHelp) severityHelp.textContent = helpText[card.dataset.value];
      });
    });
  }

  document.querySelectorAll(".export-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const table = document.getElementById(button.dataset.table);
      if (!table) return;
      const rows = [...table.querySelectorAll("tr")].map((row) =>
        [...row.children].map((cell) => `"${cell.innerText.replace(/"/g, '""')}"`).join(",")
      );
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${button.dataset.table}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  });

  (function themeSystem() {
    const toggle = document.getElementById("themeToggle");
    const html = document.documentElement;
    const stored = localStorage.getItem("sentinelx-theme") || "dark";
    html.setAttribute("data-theme", stored);
    if (toggle) {
      toggle.innerHTML = stored === "dark" ? "\u2600" : "\u263E";
      toggle.addEventListener("click", () => {
        const current = html.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", next);
        localStorage.setItem("sentinelx-theme", next);
        toggle.innerHTML = next === "dark" ? "\u2600" : "\u263E";
      });
    }
  })();

  (function notificationSystem() {
    const bell = document.getElementById("notificationBell");
    const dropdown = document.getElementById("notificationDropdown");
    if (bell && dropdown) {
      bell.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
      });
      document.addEventListener("click", (e) => {
        if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove("show");
        }
      });
    }
  })();
})();
