// Page-specific JS for contiguous practice page
document.addEventListener("DOMContentLoaded", () => {
  // Mark the Contiguous nav link active when on the practice page
  try {
    const links = document.querySelectorAll(".nav-link");
    links.forEach((a) => {
      // simple heuristic: if href contains 'contiguous' mark active
      if (
        a.getAttribute("href") &&
        a.getAttribute("href").indexOf("contiguous") !== -1
      ) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
  } catch (e) {
    // non-fatal
    console.warn("Nav active toggle failed", e);
  }
});

// ---------- Practice: generator + solver ----------
const practiceState = {
  algorithm: null,
  processes: [],
  partitions: [],
  nextProcIndex: 0,
  nameCounter: 0,
  remainderCounters: {},
  waiting: [],
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextPartitionName(i) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (i < letters.length) return letters[i];
  return "P" + (i + 1 - letters.length);
}

function getBaseName(name) {
  const m = String(name).match(/^([A-Za-z]+)/);
  return m ? m[1] : name;
}

function generateProblem(procCount, partCount) {
  practiceState.algorithm = ["first", "best", "worst"][randInt(0, 2)];
  practiceState.processes = [];
  practiceState.partitions = [];
  practiceState.nextProcIndex = 0;
  practiceState.nameCounter = 0;
  practiceState.remainderCounters = {};
  practiceState.waiting = [];

  for (let i = 0; i < procCount; i++) {
    practiceState.processes.push({
      id: "p" + (i + 1),
      size: randInt(10, 800),
      placed: false,
    });
  }
  for (let j = 0; j < partCount; j++) {
    practiceState.partitions.push({
      name: nextPartitionName(j),
      size: randInt(50, 1000),
      occupant: null,
    });
  }
}

function renderGeneratedSummary() {
  const algoEl = document.getElementById("gen-algo-name");
  const procEl = document.getElementById("gen-processes");
  const partEl = document.getElementById("gen-partitions");
  if (algoEl) algoEl.textContent = practiceState.algorithm.toUpperCase();
  if (procEl)
    procEl.innerHTML =
      "<strong>Proses:</strong> " +
      practiceState.processes.map((p) => `${p.id}(${p.size}Kb)`).join(", ");
  if (partEl)
    partEl.innerHTML =
      "<strong>Partisi:</strong> " +
      practiceState.partitions.map((p) => `${p.name}(${p.size}Kb)`).join(", ");
}

function renderPracticePartitions() {
  const tbody = document.getElementById("practice-partitions-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  practiceState.partitions.forEach((part, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.idx = idx;
    let status = "Free";
    if (part.occupant) {
      const occ = String(part.occupant);
      // split occupant like 'p12' -> 'p' and '12'
      const head = occ.charAt(0);
      const tail = occ.slice(1);
      status = `Occ: <span class="occ-p">${head}</span><span class="occ-num">${tail}</span>`;
      tr.classList.add("partition-occupied");
    }
    tr.innerHTML = `<td>${part.name}</td><td>${part.size}</td><td class="part-status">${status}</td>`;
    tr.addEventListener("click", () => onPartitionClick(idx));
    tbody.appendChild(tr);
  });
  // Append a Waiting row so user can choose to put a process into waiting queue
  const waitTr = document.createElement("tr");
  waitTr.dataset.idx = "waiting";
  const waitingList = practiceState.waiting.length
    ? practiceState.waiting.join(", ")
    : "-";
  waitTr.innerHTML = `<td>Waiting</td><td>-</td><td class="part-status">${waitingList}</td>`;
  waitTr.addEventListener("click", () => onPartitionClick("waiting"));
  tbody.appendChild(waitTr);
}

function renderPracticeProcesses() {
  const list = document.getElementById("practice-processes-list");
  if (!list) return;
  list.innerHTML = "";
  practiceState.processes.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className =
      "proc-item" + (idx === practiceState.nextProcIndex ? " current" : "");
    div.innerHTML = `<div>${p.id}</div><div>${p.size} Kb</div>`;
    list.appendChild(div);
  });
}

function computeTargetIndexFor(proc) {
  const parts = practiceState.partitions;
  const available = parts
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => !p.occupant && p.size >= proc.size);
  if (available.length === 0) return -1;
  if (practiceState.algorithm === "first") {
    return available[0].idx;
  }
  if (practiceState.algorithm === "best") {
    let best = available[0];
    available.forEach((a) => {
      if (a.size < best.size) best = a;
    });
    return best.idx;
  }
  // worst
  let worst = available[0];
  available.forEach((a) => {
    if (a.size > worst.size) worst = a;
  });
  return worst.idx;
}

function onPartitionClick(idx) {
  const msgEl = document.getElementById("practice-message");
  if (!msgEl) return;
  msgEl.textContent = "";
  const procIdx = practiceState.nextProcIndex;
  if (procIdx >= practiceState.processes.length) {
    msgEl.textContent = "Semua proses sudah ditempatkan.";
    return;
  }
  const proc = practiceState.processes[procIdx];
  const targetIdx = computeTargetIndexFor(proc);
  // If there is no suitable partition, user must choose the Waiting row
  if (targetIdx === -1 && idx !== "waiting") {
    msgEl.textContent = `Tidak ada partisi yang cukup besar untuk ${proc.id} (${proc.size}Kb). Pilih 'Waiting' jika ingin menunda proses.`;
    // flash the wrong row if user clicked a partition
    if (typeof idx === "number") {
      const rows = document.querySelectorAll("#practice-partitions-tbody tr");
      const row = rows[idx];
      if (row) {
        row.style.transition = "background 120ms";
        row.style.background = "rgba(255,80,80,0.14)";
        setTimeout(() => (row.style.background = ""), 600);
      }
    }
    return;
  }

  // If there is a valid target but user clicked wrong partition (not 'waiting')
  if (targetIdx !== -1 && idx !== targetIdx) {
    // wrong placement
    const clickedName =
      typeof idx === "number" ? practiceState.partitions[idx].name : "Waiting";
    msgEl.textContent = `Penempatan salah: ${proc.id} tidak boleh ditempatkan pada partisi ${clickedName}.`;
    // flash the wrong row
    if (typeof idx === "number") {
      const rows = document.querySelectorAll("#practice-partitions-tbody tr");
      const row = rows[idx];
      if (row) {
        row.style.transition = "background 120ms";
        row.style.background = "rgba(255,80,80,0.14)";
        setTimeout(() => (row.style.background = ""), 600);
      }
    }
    return;
  }

  if (idx === "waiting") {
    // place process into waiting queue
    practiceState.waiting.push(proc.id);
    practiceState.nextProcIndex++;
    renderPracticePartitions();
    renderPracticeProcesses();
    if (practiceState.nextProcIndex >= practiceState.processes.length) {
      msgEl.textContent =
        "Semua proses telah diproses (beberapa berada dalam antrian Waiting).";
    } else {
      msgEl.textContent = `Proses ${proc.id} ditunda (Waiting). Lanjutkan ke ${
        practiceState.processes[practiceState.nextProcIndex].id
      }.`;
    }
    return;
  }

  // correct placement: allocate
  const part = practiceState.partitions[idx];
  part.occupant = proc.id;
  const remainder = part.size - proc.size;
  part.size = proc.size; // mark allocated size
  // if remainder exists, insert a new part after idx and name it based on base of allocated partition
  if (remainder > 0) {
    const base = getBaseName(part.name);
    if (!practiceState.remainderCounters[base])
      practiceState.remainderCounters[base] = 1;
    const suffix = practiceState.remainderCounters[base]++;
    const newName = base + suffix;
    const remPart = { name: newName, size: remainder, occupant: null };
    practiceState.partitions.splice(idx + 1, 0, remPart);
  }
  practiceState.nextProcIndex++;
  renderPracticePartitions();
  renderPracticeProcesses();
  if (practiceState.nextProcIndex >= practiceState.processes.length) {
    msgEl.textContent =
      "Selamat — semua proses telah ditempatkan dengan benar.";
  } else {
    msgEl.textContent = `Berhasil menempatkan ${proc.id}. Lanjutkan ke ${
      practiceState.processes[practiceState.nextProcIndex].id
    }.`;
  }
}

// wire up generate/reset
document.addEventListener("DOMContentLoaded", () => {
  const genBtn = document.getElementById("generate-problem");
  const resetBtn = document.getElementById("reset-problem");
  const procCountInput = document.getElementById("gen-process-count");
  const partCountInput = document.getElementById("gen-partition-count");

  function clearPracticeUI() {
    const algo = document.getElementById("gen-algo-name");
    if (algo) algo.textContent = "-";
    const gp = document.getElementById("gen-processes");
    if (gp) gp.textContent = "";
    const gpa = document.getElementById("gen-partitions");
    if (gpa) gpa.textContent = "";
    const tbody = document.getElementById("practice-partitions-tbody");
    if (tbody) tbody.innerHTML = "";
    const list = document.getElementById("practice-processes-list");
    if (list) list.innerHTML = "";
    const msg = document.getElementById("practice-message");
    if (msg) msg.textContent = "";
    practiceState.algorithm = null;
    practiceState.processes = [];
    practiceState.partitions = [];
    practiceState.nextProcIndex = 0;
    practiceState.remainderCounters = {};
    practiceState.waiting = [];
    practiceState.nameCounter = 0;
  }

  if (genBtn)
    genBtn.addEventListener("click", () => {
      const pc = Math.max(2, Math.min(20, parseInt(procCountInput.value) || 4));
      const pt = Math.max(2, Math.min(20, parseInt(partCountInput.value) || 5));
      generateProblem(pc, pt);
      renderGeneratedSummary();
      renderPracticePartitions();
      renderPracticeProcesses();
      const msg = document.getElementById("practice-message");
      if (msg)
        msg.textContent = `Silakan tempatkan ${practiceState.processes[0].id} sekarang.`;
    });

  if (resetBtn)
    resetBtn.addEventListener("click", () => {
      clearPracticeUI();
    });
});
