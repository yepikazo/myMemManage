// Enhanced contiguous simulation with algorithm selection and highlighting
const initialPartitions = [
  { name: "A", size: 100 },
  { name: "B", size: 500 },
  { name: "C", size: 200 },
  { name: "D", size: 300 },
  { name: "E", size: 600 },
  { name: "F", size: 400 },
];

const processes = [
  { id: "p1", size: 312 },
  { id: "p2", size: 196 },
  { id: "p3", size: 80 },
  { id: "p4", size: 486 },
  { id: "p5", size: 550 },
  { id: "p6", size: 266 },
];

// buildSteps supports algorithms: 'first', 'best', 'worst'
function buildSteps(
  algorithm = "first",
  processesArg = null,
  partitionsArg = null
) {
  const steps = [];
  const actions = [];

  const partitionsList = partitionsArg || initialPartitions;
  const processesList = processesArg || processes;

  let parts = partitionsList.map((p) => ({
    name: p.name,
    size: p.size,
    occupant: null,
  }));
  steps.push(JSON.parse(JSON.stringify(parts)));
  actions.push({
    type: "init",
    scanned: [],
    allocated: null,
    detailed: "Kondisi awal partisi sebelum alokasi.",
  });

  const remCounts = {};

  for (const proc of processesList) {
    let placed = false;
    let placedOn = null;
    const scans = [];
    let allocIdx = -1;

    if (algorithm === "first") {
      // scan in order and allocate on first fit
      for (let idx = 0; idx < parts.length; idx++) {
        const part = parts[idx];
        const diff = part.size - proc.size;
        if (part.occupant === null) {
          const fits = part.size >= proc.size;
          scans.push({
            name: part.name,
            size: part.size,
            fits,
            occupied: false,
            diff,
          });
          if (!placed && fits) {
            allocIdx = idx;
            placed = true;
            break;
          }
        } else {
          scans.push({
            name: part.name,
            size: part.size,
            fits: false,
            occupied: true,
            occupant: part.occupant,
            diff,
          });
        }
      }
    } else if (algorithm === "best" || algorithm === "worst") {
      // full scan to find best or worst candidate
      let candidateIdx = -1;
      for (let idx = 0; idx < parts.length; idx++) {
        const part = parts[idx];
        const diff = part.size - proc.size;
        if (part.occupant === null) {
          const fits = part.size >= proc.size;
          scans.push({
            name: part.name,
            size: part.size,
            fits,
            occupied: false,
            diff,
          });
          if (fits) {
            if (candidateIdx === -1) candidateIdx = idx;
            else {
              if (algorithm === "best") {
                if (parts[idx].size < parts[candidateIdx].size)
                  candidateIdx = idx;
              } else {
                // worst
                if (parts[idx].size > parts[candidateIdx].size)
                  candidateIdx = idx;
              }
            }
          }
        } else {
          scans.push({
            name: part.name,
            size: part.size,
            fits: false,
            occupied: true,
            occupant: part.occupant,
          });
        }
      }
      if (candidateIdx !== -1) {
        allocIdx = candidateIdx;
        placed = true;
      }
    }

    // perform allocation if found
    if (placed && allocIdx >= 0) {
      const part = parts[allocIdx];
      const leftover = part.size - proc.size;
      const baseMatch = part.name.match(/^[A-Za-z]+/);
      const base = baseMatch ? baseMatch[0] : part.name;
      if (!remCounts[base]) remCounts[base] = 1;
      let remName = null;
      if (leftover > 0) {
        remName = `${base}${remCounts[base]++}`;
      }
      // replace with allocated block
      parts.splice(allocIdx, 1, {
        name: part.name,
        size: proc.size,
        occupant: proc.id,
      });
      if (leftover > 0)
        parts.splice(allocIdx + 1, 0, {
          name: remName,
          size: leftover,
          occupant: null,
        });
      placedOn = part.name;
      // annotate scans: mark allocated scan entry if present
      for (const s of scans) {
        if (s.name === part.name) {
          s.allocated = true;
          if (leftover > 0) {
            s.leftover = leftover;
            s.remName = remName;
          }
          break;
        }
      }
      // build detail
      let detail = `Menjalankan ${
        algorithm === "first"
          ? "First-Fit"
          : algorithm === "best"
          ? "Best-Fit"
          : "Worst-Fit"
      } untuk proses ${proc.id} (ukuran ${proc.size} Kb).<br>`;
      for (const s of scans) {
        if (s.occupied) {
          detail += `Scan part ${s.name} (ukuran ${s.size} Kb): sudah terisi oleh ${s.occupant} → tidak dapat digunakan. Lanjut ke partisi berikutnya.<br>`;
        } else {
          detail += `Scan part ${s.name} (ukuran ${s.size} Kb): bandingkan ${
            s.size
          } vs ${proc.size} → ${
            s.fits ? "cukup besar → muat" : "tidak cukup → tidak muat"
          }.`;
          if (s.allocated) {
            if (s.leftover)
              detail += ` Alokasi terjadi di sini; sisa ruang dibuat sebagai partisi baru ${s.remName} (ukuran ${s.leftover} Kb).`;
            else detail += ` Alokasi terjadi di sini; tidak ada sisa ruang.`;
          }
          detail += `<br>`;
        }
      }
      detail += `Kesimpulan: proses ${proc.id} ditempatkan pada partisi ${placedOn}.`;
      actions.push({
        type: "placed",
        proc: proc.id,
        scanned: scans,
        allocatedName: placedOn,
        detailed: detail,
      });
    } else {
      // waiting
      const waitLabel = `Wait For ${proc.id}`;
      parts.push({ name: waitLabel, size: proc.size, occupant: "waiting" });
      let detail = `Menjalankan ${
        algorithm === "first"
          ? "First-Fit"
          : algorithm === "best"
          ? "Best-Fit"
          : "Worst-Fit"
      } untuk proses ${proc.id} (ukuran ${proc.size} Kb).<br>`;
      for (const s of scans) {
        if (s.occupied) {
          detail += `Scan part ${s.name} (ukuran ${s.size} Kb): sudah terisi oleh ${s.occupant} → tidak dapat digunakan. Lanjut ke partisi berikutnya.<br>`;
        } else {
          detail += `Scan part ${s.name} (ukuran ${s.size} Kb): bandingkan ${
            s.size
          } vs ${proc.size} → ${
            s.fits ? "cukup besar → muat" : "tidak cukup → tidak muat"
          }.<br>`;
        }
      }
      detail += `Kesimpulan: tidak ditemukan partisi yang muat; proses ditambahkan pada baris waiting ("${waitLabel}").`;
      actions.push({
        type: "waiting",
        proc: proc.id,
        scanned: scans,
        waitLabel,
        detailed: detail,
      });
    }

    steps.push(JSON.parse(JSON.stringify(parts)));
  }

  return { steps, actions };
}

// DOM wiring and rendering
const container = document.getElementById("partition-container");
const stepNumEl = document.getElementById("step-num");
const stepTotalEl = document.getElementById("step-total");
const explanationEl = document.getElementById("step-explanation");
const algoSelect = document.getElementById("algo-select");
let steps = [];
let actions = [];
let current = 0;

function computeAndRender(algorithm) {
  const procs = readProcessesFromUI();
  const parts = readPartitionsFromUI();
  const sim = buildSteps(algorithm, procs, parts);
  steps = sim.steps;
  actions = sim.actions;
  current = 0;
  stepTotalEl.textContent = steps.length - 1;
  renderStep(0);
}

/* ---------- UI helpers: read/populate editable tables ---------- */
function readProcessesFromUI() {
  const rows = document.querySelectorAll("#processes-tbody tr");
  const list = [];
  rows.forEach((tr, idx) => {
    const idInput = tr.querySelector(".proc-id");
    const sizeInput = tr.querySelector(".proc-size");
    const id =
      idInput && idInput.value.trim() ? idInput.value.trim() : `p${idx + 1}`;
    const size = sizeInput ? parseInt(sizeInput.value, 10) || 0 : 0;
    list.push({ id, size });
  });
  return list;
}

function readPartitionsFromUI() {
  const rows = document.querySelectorAll("#partitions-tbody tr");
  const list = [];
  rows.forEach((tr, idx) => {
    const nameInput = tr.querySelector(".part-name");
    const sizeInput = tr.querySelector(".part-size");
    const name =
      nameInput && nameInput.value.trim()
        ? nameInput.value.trim()
        : `P${idx + 1}`;
    const size = sizeInput ? parseInt(sizeInput.value, 10) || 0 : 0;
    list.push({ name, size });
  });
  return list;
}

function createProcessRow(id = "", size = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td><input class="proc-id" value="${id}" /></td><td><input class="proc-size" type="number" min="1" value="${size}" /></td>`;
  return tr;
}

function createPartitionRow(name = "", size = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td><input class="part-name" value="${name}" /></td><td><input class="part-size" type="number" min="1" value="${size}" /></td>`;
  return tr;
}

function populateProcessesTable(arr) {
  const tbody = document.getElementById("processes-tbody");
  tbody.innerHTML = "";
  arr.forEach((p) => {
    tbody.appendChild(createProcessRow(p.id || "", p.size || ""));
  });
}

function populatePartitionsTable(arr) {
  const tbody = document.getElementById("partitions-tbody");
  tbody.innerHTML = "";
  arr.forEach((p) => {
    tbody.appendChild(createPartitionRow(p.name || "", p.size || ""));
  });
}

function addProcessRow(id = "", size = "") {
  const tbody = document.getElementById("processes-tbody");
  tbody.appendChild(createProcessRow(id, size));
}

function addPartitionRow(name = "", size = "") {
  const tbody = document.getElementById("partitions-tbody");
  tbody.appendChild(createPartitionRow(name, size));
}

// Populate N empty process rows (ids p1..pn)
function populateProcessesWithCount(n) {
  const tbody = document.getElementById("processes-tbody");
  tbody.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    tbody.appendChild(createProcessRow(`p${i}`, ""));
  }
}

// Populate N empty partition rows (names A,B,C... or P1.. if >26)
function populatePartitionsWithCount(n) {
  const tbody = document.getElementById("partitions-tbody");
  tbody.innerHTML = "";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  for (let i = 1; i <= n; i++) {
    const name = i <= letters.length ? letters[i - 1] : `P${i}`;
    tbody.appendChild(createPartitionRow(name, ""));
  }
}

// Populate N random processes with sizes (1..5000 Kb)
function populateProcessesRandom(n) {
  const tbody = document.getElementById("processes-tbody");
  tbody.innerHTML = "";
  for (let i = 1; i <= n; i++) {
    const id = `p${i}`;
    const size = Math.floor(Math.random() * 5000) + 1; // 1..5000 Kb
    tbody.appendChild(createProcessRow(id, size));
  }
}

// Populate N random partitions with sizes (1..5000 Kb)
function populatePartitionsRandom(n) {
  const tbody = document.getElementById("partitions-tbody");
  tbody.innerHTML = "";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  for (let i = 1; i <= n; i++) {
    const name = i <= letters.length ? letters[i - 1] : `P${i}`;
    const size = Math.floor(Math.random() * 5000) + 1;
    tbody.appendChild(createPartitionRow(name, size));
  }
}

/* wire up action buttons for table editing */
document.addEventListener("DOMContentLoaded", () => {
  // populate initial sample rows from the defaults
  populateProcessesTable(processes);
  populatePartitionsTable(initialPartitions);

  document.getElementById("add-process").addEventListener("click", () => {
    const count = document.querySelectorAll("#processes-tbody tr").length + 1;
    addProcessRow(`p${count}`, "");
  });

  document.getElementById("add-partition").addEventListener("click", () => {
    const count = document.querySelectorAll("#partitions-tbody tr").length + 1;
    addPartitionRow(`X${count}`, "");
  });

  // set number of processes upfront (create that many empty rows)
  document.getElementById("set-process-count").addEventListener("click", () => {
    const val =
      parseInt(document.getElementById("process-count").value, 10) || 0;
    if (isNaN(val) || val < 2) {
      alert("Masukkan jumlah proses minimal 2.");
      return;
    }
    populateProcessesWithCount(val);
    // do not auto-run simulation — user will fill values then tekan TERAPKAN DATA
  });

  // set number of partitions upfront
  document
    .getElementById("set-partition-count")
    .addEventListener("click", () => {
      const val =
        parseInt(document.getElementById("partition-count").value, 10) || 0;
      if (isNaN(val) || val < 2) {
        alert("Masukkan jumlah partisi minimal 2.");
        return;
      }
      populatePartitionsWithCount(val);
    });

  // random generators (count + values). Limit to max 20
  document.getElementById("random-processes").addEventListener("click", () => {
    let val = parseInt(document.getElementById("process-count").value, 10) || 0;
    if (isNaN(val) || val < 2) val = 2;
    if (val > 20) val = 20;
    populateProcessesRandom(val);
  });

  document.getElementById("random-partitions").addEventListener("click", () => {
    let val =
      parseInt(document.getElementById("partition-count").value, 10) || 0;
    if (isNaN(val) || val < 2) val = 2;
    if (val > 20) val = 20;
    populatePartitionsRandom(val);
  });

  document.getElementById("reset-processes").addEventListener("click", () => {
    populateProcessesTable(processes);
    computeAndRender(algoSelect.value);
  });

  document.getElementById("reset-partitions").addEventListener("click", () => {
    populatePartitionsTable(initialPartitions);
    computeAndRender(algoSelect.value);
  });

  document.getElementById("apply-data").addEventListener("click", () => {
    // re-run with the UI-specified data
    computeAndRender(algoSelect.value);
  });
  // initial compute now that UI is populated
  computeAndRender(algoSelect.value);

  // re-compute when algorithm change is handled earlier via listener
});

function renderStep(i) {
  const state = steps[i];
  stepNumEl.textContent = i;

  // build table with possible highlight classes
  let html =
    '<table class="alloc-table"><thead><tr><th>Partisi</th><th>Ukuran (Kb)</th><th>Occupant</th></tr></thead><tbody>';
  const action = actions[i];
  const scannedNames =
    action && action.scanned ? action.scanned.map((s) => s.name) : [];
  const allocatedName =
    action && action.allocatedName
      ? action.allocatedName
      : action && action.type === "placed"
      ? action.allocatedName
      : null;
  const waitLabel = action && action.waitLabel ? action.waitLabel : null;

  for (const p of state) {
    const classes = [];
    if (scannedNames.includes(p.name)) classes.push("scanned");
    if (allocatedName && p.name === allocatedName) classes.push("allocated");
    if (waitLabel && p.name === waitLabel) classes.push("waiting-row");
    html += `<tr class="${classes.join(" ")}"><td>${p.name}</td><td>${
      p.size
    }</td><td class="partition-occupant">${p.occupant || "-"}</td></tr>`;
  }
  html += "</tbody></table>";

  container.innerHTML = html;

  // explanation: show scan details in a collapsible block and bold conclusion
  if (action) {
    // Always show full scan details (no collapse)
    let detailHtml =
      "<div class='explain-scans'><h4>Rincian pemindaian</h4><div style='margin-top:8px;'>";
    if (action.scanned && action.scanned.length) {
      for (const s of action.scanned) {
        if (s.occupied) {
          detailHtml += `<div>Scan ${s.name} (${
            s.size
          } Kb): sudah terisi oleh ${
            s.occupant
          } → tidak dapat digunakan. (selisih: ${
            s.diff >= 0 ? "+" + s.diff : s.diff
          } Kb)</div>`;
        } else {
          detailHtml += `<div>Scan ${s.name} (${s.size} Kb): bandingkan ${
            s.size
          } vs proses → ${
            s.fits ? "cukup besar → muat" : "tidak cukup → tidak muat"
          }; selisih = ${s.diff >= 0 ? "+" + s.diff : s.diff} Kb${
            s.allocated
              ? s.leftover
                ? `; alokasi di sini, sisa -> ${s.remName} (${s.leftover} Kb)`
                : "; alokasi di sini, tidak ada sisa"
              : ""
          }.</div>`;
        }
      }
    } else {
      detailHtml +=
        "<div>Tidak ada partisi untuk dipindai pada langkah ini.</div>";
    }
    detailHtml += "</div></div>";

    // bold conclusion (use the detailed text's last sentence)
    const conclusion = action.detailed
      ? `<div class="explain-conclusion">${
          action.detailed.split("<br>").slice(-1)[0]
        }</div>`
      : "";
    explanationEl.innerHTML = detailHtml + conclusion;
  } else {
    explanationEl.innerHTML = "<p>Tidak ada penjelasan untuk langkah ini.</p>";
  }
}

// controls
document.getElementById("prev-step").addEventListener("click", () => {
  if (current > 0) current -= 1;
  renderStep(current);
});

document.getElementById("next-step").addEventListener("click", () => {
  if (current < steps.length - 1) current += 1;
  renderStep(current);
});

document.getElementById("run-all").addEventListener("click", () => {
  let i = current;
  const interval = setInterval(() => {
    if (i >= steps.length - 1) {
      clearInterval(interval);
      current = steps.length - 1;
      renderStep(current);
      return;
    }
    i += 1;
    current = i;
    renderStep(i);
  }, 700);
});

algoSelect.addEventListener("change", (e) => {
  computeAndRender(e.target.value);
});

// initial compute is triggered once DOM is ready
