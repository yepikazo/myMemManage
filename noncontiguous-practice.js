// Practice engine for non-contiguous (page replacement) practice
const ncState = {
  frames: [],
  ref: [],
  currentIdx: 0,
  fifoPtr: 0,
  algorithm: "FIFO",
  expected: [], // expected actions per reference
  hits: 0,
  faults: 0,
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNCProblem(frameCount, refArr) {
  ncState.frames = new Array(frameCount).fill(null);
  ncState.ref = refArr.slice();
  ncState.currentIdx = 0;
  ncState.fifoPtr = 0;
  ncState.algorithm = ["FIFO", "LRU", "OPTIMAL"][Math.floor(Math.random() * 3)];
  ncState.expected = prepareExpectedTargets(
    frameCount,
    ncState.ref,
    ncState.algorithm
  );
  ncState.hits = 0;
  ncState.faults = 0;
}

function prepareExpectedTargets(frameCount, refArr, algorithm) {
  const frames = new Array(frameCount).fill(null);
  const lastUsed = new Array(frameCount).fill(-1);
  const loadOrder = new Array(frameCount).fill(-1);
  let loadCounter = 0;
  let fifoPtr = 0;
  let time = 0;
  const expected = [];

  for (let idx = 0; idx < refArr.length; idx++) {
    const r = refArr[idx];
    const found = frames.indexOf(r);
    if (found !== -1) {
      // hit
      lastUsed[found] = time;
      expected.push({ type: "hit", target: found });
      time++;
      continue;
    }
    const empty = frames.indexOf(null);
    if (empty !== -1) {
      frames[empty] = r;
      lastUsed[empty] = time;
      loadOrder[empty] = loadCounter++;
      expected.push({ type: "place", target: empty });
      time++;
      continue;
    }

    // replace according to algorithm
    let replaceIdx = -1;
    if (algorithm === "FIFO") {
      replaceIdx = fifoPtr;
      fifoPtr = (fifoPtr + 1) % frameCount;
    } else if (algorithm === "LRU") {
      let lruIdx = 0;
      let min = lastUsed[0];
      for (let j = 1; j < frameCount; j++)
        if (lastUsed[j] < min) {
          min = lastUsed[j];
          lruIdx = j;
        }
      replaceIdx = lruIdx;
    } else if (algorithm === "OPTIMAL") {
      const futurePositions = new Array(frameCount).fill(-1);
      for (let j = 0; j < frameCount; j++) {
        const val = frames[j];
        let nextPos = -1;
        for (let k = idx + 1; k < refArr.length; k++)
          if (refArr[k] === val) {
            nextPos = k;
            break;
          }
        futurePositions[j] = nextPos === -1 ? Infinity : nextPos;
      }
      // prefer Infinity
      let anyInf = -1;
      for (let j = 0; j < frameCount; j++) {
        if (futurePositions[j] === Infinity) {
          if (anyInf === -1) anyInf = j;
          else if (loadOrder[j] < loadOrder[anyInf]) anyInf = j;
        }
      }
      if (anyInf !== -1) replaceIdx = anyInf;
      else {
        let farthest = -1;
        for (let j = 0; j < frameCount; j++)
          if (futurePositions[j] > farthest) {
            farthest = futurePositions[j];
            replaceIdx = j;
          }
      }
      if (replaceIdx === -1) replaceIdx = fifoPtr;
      fifoPtr = (fifoPtr + 1) % frameCount;
    } else replaceIdx = fifoPtr;

    const old = frames[replaceIdx];
    frames[replaceIdx] = r;
    lastUsed[replaceIdx] = time;
    loadOrder[replaceIdx] = loadCounter++;
    expected.push({ type: "replace", target: replaceIdx, oldValue: old });
    time++;
  }
  return expected;
}

function renderNCFrames() {
  const thead = document.getElementById("nc-frames-thead");
  const tbody = document.getElementById("nc-frames-tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";
  // build header: first cell "Frame" then each reference value (showing sequence)
  const headRow = document.createElement("tr");
  const thLabel = document.createElement("th");
  thLabel.textContent = "Frame";
  headRow.appendChild(thLabel);
  ncState.ref.forEach((r) => {
    const th = document.createElement("th");
    th.style.textAlign = "center";
    th.textContent = r;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  // build rows: one row per frame, each cell clickable for current step
  for (let f = 0; f < ncState.frames.length; f++) {
    const tr = document.createElement("tr");
    tr.dataset.idx = f;
    // first cell label
    const tdLabel = document.createElement("td");
    tdLabel.textContent = f;
    tr.appendChild(tdLabel);
    for (let c = 0; c < ncState.ref.length; c++) {
      const td = document.createElement("td");
      td.style.textAlign = "center";
      td.dataset.row = f;
      td.dataset.col = c;
      td.textContent = "-";
      td.addEventListener("click", () => onNCFrameClick(f, c));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  updateStepIndicator();
}

function updateStepIndicator() {
  const el = document.getElementById("nc-step-indicator");
  if (!el) return;
  el.classList.add("warna-font");
  el.textContent = `Step: ${ncState.currentIdx} / ${ncState.ref.length}`;
}

function renderNCRefList() {
  const list = document.getElementById("nc-ref-list");
  if (!list) return; // reference list removed from HTML; avoid errors
  list.innerHTML = "";
  ncState.ref.forEach((r, idx) => {
    const div = document.createElement("div");
    div.className =
      "proc-item" + (idx === ncState.currentIdx ? " current" : "");
    div.classList.add("warna-font");
    div.textContent = `${r}`;
    list.appendChild(div);
  });
}

// not used - logic now precomputed in ncState.expected
function computeTargetIndexForRef(val) {
  return -1;
}

function onNCFrameClick(idx) {
  const msg = document.getElementById("nc-message");
  if (msg) msg.classList.add("warna-font");
  msg.textContent = "";
  if (ncState.currentIdx >= ncState.ref.length) {
    msg.textContent = "Semua reference sudah diproses.";
    return;
  }
  const val = ncState.ref[ncState.currentIdx];
  const expected = ncState.expected[ncState.currentIdx];
  // If expected is hit
  if (expected.type === "hit") {
    const actualIdx = ncState.frames.indexOf(val);
    if (actualIdx === -1) {
      msg.textContent = `Kesalahan internal: seharusnya ada hit tapi frame belum berisi ${val}.`;
      return;
    }
    if (idx === actualIdx) {
      // correct hit
      ncState.hits++;
      ncState.currentIdx++;
      fillColumn(ncState.currentIdx - 1);
      renderNCRefList();
      updateStepIndicator();
      if (ncState.currentIdx >= ncState.ref.length) {
        const rate = Math.round((ncState.hits / ncState.ref.length) * 100);
        msg.textContent = `Selesai! Semua reference telah diproses. Hit: ${ncState.hits}, Faults: ${ncState.faults}. Hit rate: ${rate}%`;
      } else {
        msg.textContent = `Hit benar.`;
      }
      return;
    } else {
      msg.textContent = `Pilihan salah.`;
      flashRow(idx);
      return;
    }
  }
  // expected place/replace
  if (idx !== expected.target) {
    msg.textContent = `Pilihan salah.`;
    flashRow(idx);
    return;
  }
  // Accept placement (page fault)
  ncState.frames[idx] = val;
  ncState.faults++;
  ncState.currentIdx++;
  fillColumn(ncState.currentIdx - 1);
  renderNCRefList();
  updateStepIndicator();
  if (ncState.currentIdx >= ncState.ref.length) {
    const rate = Math.round((ncState.hits / ncState.ref.length) * 100);
    msg.textContent = `Selesai! Semua reference telah diproses. Hit: ${ncState.hits}, Faults: ${ncState.faults}. Hit rate: ${rate}%`;
  } else {
    msg.textContent = `Berhasil menempatkan.`;
  }
}

function fillColumn(stepIdx) {
  // Fill the whole column (snapshot of frames after this step)
  const rows = document.querySelectorAll("#nc-frames-tbody tr");
  if (!rows || rows.length === 0) return;
  for (let f = 0; f < rows.length; f++) {
    const row = rows[f];
    const cells = row.querySelectorAll("td");
    const targetCell = cells[stepIdx + 1]; // cells[0] is label
    if (!targetCell) continue;
    const val = ncState.frames[f];
    targetCell.textContent = val === null ? "-" : val;
  }
}

function flashRow(idx) {
  const rows = document.querySelectorAll("#nc-frames-tbody tr");
  const row = rows[idx];
  if (!row) return;
  row.style.transition = "background 120ms";
  row.style.background = "rgba(255,80,80,0.14)";
  setTimeout(() => (row.style.background = ""), 600);
}

document.addEventListener("DOMContentLoaded", () => {
  const genBtn = document.getElementById("nc-generate");
  const randBtn = document.getElementById("nc-random");
  const resetBtn = document.getElementById("nc-reset");
  const framesInput = document.getElementById("nc-gen-frames");
  const refInput = document.getElementById("nc-gen-ref");

  function clearUI() {
    const summary = document.getElementById("nc-gen-summary");
    if (summary) summary.textContent = "";
    const msg = document.getElementById("nc-message");
    if (msg) msg.textContent = "";
    const list = document.getElementById("nc-ref-list");
    if (list) list.innerHTML = "";
    const tbody = document.getElementById("nc-frames-tbody");
    if (tbody) tbody.innerHTML = "";
    ncState.frames = [];
    ncState.ref = [];
    ncState.currentIdx = 0;
    ncState.fifoPtr = 0;
  }

  if (genBtn)
    genBtn.addEventListener("click", () => {
      const fc = Math.max(1, Math.min(10, parseInt(framesInput.value) || 3));
      const refCountInput = document.getElementById("nc-gen-refcount");
      const rc = Math.max(1, Math.min(50, parseInt(refCountInput.value) || 8));
      const arr = [];
      for (let i = 0; i < rc; i++) arr.push(randInt(0, 9));
      generateNCProblem(fc, arr);
      renderNCFrames();
      renderNCRefList();
      const summary = document.getElementById("nc-gen-summary");
      if (summary) {
        summary.classList.add("warna-font");
        summary.textContent = `Reference: ${arr.join(
          ", "
        )} — Algoritma (acak): ${ncState.algorithm}`;
      }
      const msg = document.getElementById("nc-message");
      if (msg) {
        msg.classList.add("warna-font");
        msg.textContent = `Silakan proses ${ncState.ref[0]} dengan mengklik frame yang sesuai atau tekan 'Tandai Hit'.`;
      }
    });

  if (randBtn);

  if (resetBtn) resetBtn.addEventListener("click", () => clearUI());

  const markHitBtn = document.getElementById("nc-mark-hit");
  if (markHitBtn)
    markHitBtn.addEventListener("click", () => {
      const msg = document.getElementById("nc-message");
      if (msg) msg.classList.add("warna-font");
      msg.textContent = "";
      if (ncState.currentIdx >= ncState.ref.length) {
        msg.textContent = "Semua reference sudah diproses.";
        return;
      }
      const exp = ncState.expected[ncState.currentIdx];
      const val = ncState.ref[ncState.currentIdx];
      if (exp.type !== "hit") {
        msg.textContent = `Peringatan: langkah ini bukan Hit.`;
        return;
      }
      const actualIdx = ncState.frames.indexOf(val);
      if (actualIdx === -1) {
        msg.textContent = `Peringatan: seharusnya ada hit, tetapi frame belum berisi ${val}.`;
        return;
      }
      // accept hit
      ncState.hits++;
      ncState.currentIdx++;
      fillColumn(ncState.currentIdx - 1);
      renderNCRefList();
      updateStepIndicator();
      if (ncState.currentIdx >= ncState.ref.length) {
        const rate = Math.round((ncState.hits / ncState.ref.length) * 100);
        msg.textContent = `Selesai! Semua reference telah diproses. Hit: ${ncState.hits}, Faults: ${ncState.faults}. Hit rate: ${rate}%`;
      } else {
        msg.textContent = `Hit benar.`;
      }
    });
});
