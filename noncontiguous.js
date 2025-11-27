// Page replacement simulator (FIFO / LRU / OPTIMAL) with detailed explanations
document.addEventListener("DOMContentLoaded", () => {
  const framesInput = document.getElementById("sim-frames");
  const refInput = document.getElementById("sim-refstr");
  const refCountInput = document.getElementById("sim-ref-count");
  const algSelect = document.getElementById("sim-alg");
  const randBtn = document.getElementById("sim-random");
  const genBtn = document.getElementById("sim-generate");
  const prevBtn = document.getElementById("sim-prev");
  const nextBtn = document.getElementById("sim-next");
  const runAllBtn = document.getElementById("sim-runall");
  const framesArea = document.getElementById("sim-frames-area");
  const infoEl = document.getElementById("sim-info");
  const explanationEl = document.getElementById("step-explanation");

  let steps = [];
  let current = 0;
  let lastAlgorithm = "FIFO";
  let lastExplainedIndex = -1;

  function buildSteps(frameCount, refArr, algorithm) {
    const stepsLocal = [];
    const frames = new Array(frameCount).fill(null);
    let fifoPtr = 0;
    let hits = 0;
    let faults = 0;
    let time = 0; // for LRU timestamps
    const lastUsed = new Array(frameCount).fill(-1);
    const loadOrder = new Array(frameCount).fill(-1); // order when a page was loaded (for FIFO tie-break)
    let loadCounter = 0;

    // initial state: empty frames
    stepsLocal.push({
      frames: frames.slice(),
      ref: null,
      status: "init",
      hits,
      faults,
    });

    for (let idx = 0; idx < refArr.length; idx++) {
      const r = refArr[idx];
      const found = frames.indexOf(r);
      if (found !== -1) {
        // hit
        hits++;
        lastUsed[found] = time;
        stepsLocal.push({
          frames: frames.slice(),
          ref: r,
          status: "hit",
          hitIndex: found,
          hits,
          faults,
        });
        time++;
        continue;
      }

      // miss: empty slot?
      const empty = frames.indexOf(null);
      if (empty !== -1) {
        frames[empty] = r;
        lastUsed[empty] = time;
        loadOrder[empty] = loadCounter++;
        faults++;
        stepsLocal.push({
          frames: frames.slice(),
          ref: r,
          status: "pf",
          replacedIndex: empty,
          replacedOld: null,
          replacedWith: r,
          replacementReason: `Ditempatkan di frame kosong F${empty}`,
          hits,
          faults,
        });
        time++;
        continue;
      }

      // Need to replace according to algorithm
      let replacedIndex = -1;
      let replacedOld = null;
      let reason = "";

      if (!algorithm || algorithm === "FIFO") {
        replacedIndex = fifoPtr;
        replacedOld = frames[replacedIndex];
        frames[replacedIndex] = r;
        lastUsed[replacedIndex] = time;
        loadOrder[replacedIndex] = loadCounter++;
        reason = `FIFO: memilih F${replacedIndex} karena merupakan frame yang paling dulu dimasukkan.`;
        fifoPtr = (fifoPtr + 1) % frameCount;
      } else if (algorithm === "LRU") {
        let lruIdx = 0;
        let min = lastUsed[0];
        for (let j = 1; j < frameCount; j++) {
          if (lastUsed[j] < min) {
            min = lastUsed[j];
            lruIdx = j;
          }
        }
        replacedIndex = lruIdx;
        replacedOld = frames[replacedIndex];
        frames[replacedIndex] = r;
        lastUsed[replacedIndex] = time;
        loadOrder[replacedIndex] = loadCounter++;
        const age = time - min;
        reason = `LRU: memilih F${replacedIndex} karena terakhir digunakan ${age} langkah lalu (paling lama).`;
      } else if (algorithm === "OPTIMAL") {
        let replaceIdx = -1;
        let farthestPos = -1;
        const futurePositions = new Array(frameCount).fill(-1);
        for (let j = 0; j < frameCount; j++) {
          const val = frames[j];
          let nextPos = -1;
          for (let k = idx + 1; k < refArr.length; k++) {
            if (refArr[k] === val) {
              nextPos = k;
              break;
            }
          }
          futurePositions[j] = nextPos === -1 ? Infinity : nextPos;
        }
        // prefer any not used again (Infinity), tie-break by earliest loadOrder
        let anyInf = -1;
        for (let j = 0; j < frameCount; j++) {
          if (futurePositions[j] === Infinity) {
            if (anyInf === -1) anyInf = j;
            else if (loadOrder[j] < loadOrder[anyInf]) anyInf = j;
          }
        }
        if (anyInf !== -1) replaceIdx = anyInf;
        else {
          for (let j = 0; j < frameCount; j++) {
            if (futurePositions[j] > farthestPos) {
              farthestPos = futurePositions[j];
              replaceIdx = j;
            }
          }
        }
        if (replaceIdx === -1) replaceIdx = fifoPtr; // fallback
        replacedIndex = replaceIdx;
        replacedOld = frames[replacedIndex];
        frames[replacedIndex] = r;
        lastUsed[replacedIndex] = time;
        loadOrder[replacedIndex] = loadCounter++;
        const posStr = futurePositions
          .map((p, idx) => `F${idx}=${p === Infinity ? "∞" : p}`)
          .join(", ");
        reason = `OPTIMAL: jarak ke depan ${posStr}; memilih F${replacedIndex}.`;
        fifoPtr = (fifoPtr + 1) % frameCount;
      } else {
        replacedIndex = fifoPtr;
        replacedOld = frames[replacedIndex];
        frames[replacedIndex] = r;
        lastUsed[replacedIndex] = time;
        loadOrder[replacedIndex] = loadCounter++;
        reason = `Fallback: FIFO`;
        fifoPtr = (fifoPtr + 1) % frameCount;
      }

      faults++;
      stepsLocal.push({
        frames: frames.slice(),
        ref: r,
        status: "pf",
        replacedIndex,
        replacedOld,
        replacedWith: r,
        replacementReason: reason,
        hits,
        faults,
      });
      time++;
    }
    return stepsLocal;
  }

  // Keep styling to CSS via class `warna-font`.

  function renderStep(i) {
    current = Math.max(0, Math.min(i, steps.length - 1));
    framesArea.innerHTML = "";
    if (!steps.length) return;
    const table = document.createElement("table");
    table.className = "alloc-table";
    // Allow the table to size itself; we will set a minWidth to force overflow when many columns exist.
    table.style.width = "auto";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const headFirst = document.createElement("th");
    headFirst.textContent = "Frame \\ Time";
    headRow.appendChild(headFirst);
    for (let j = 0; j < steps.length; j++) {
      const th = document.createElement("th");
      th.style.textAlign = "center";
      th.textContent = j === 0 ? "t0" : steps[j].ref;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const frameCount = steps[0].frames.length;
    for (let r = 0; r < frameCount; r++) {
      const tr = document.createElement("tr");
      const tdLabel = document.createElement("td");
      tdLabel.textContent = `F${r}`;
      tr.appendChild(tdLabel);
      for (let j = 0; j < steps.length; j++) {
        const td = document.createElement("td");
        td.style.textAlign = "center";
        if (j <= current) {
          const val = steps[j].frames[r];
          td.textContent = val === null ? "-" : val;
        } else {
          td.textContent = "-";
          td.style.opacity = "0.45";
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Put the table inside a scrollable wrapper so horizontal scrolling appears.
    const wrap = document.createElement("div");
    wrap.style.overflowX = "auto";
    wrap.style.width = "100%";
    // Set a min-width so the table will overflow when there are many time-columns.
    const minW = Math.max(480, steps.length * 60);
    table.style.minWidth = minW + "px";
    wrap.appendChild(table);
    framesArea.appendChild(wrap);

    const s = steps[current];
    infoEl.textContent = `Step ${current}/${steps.length - 1} — Hits: ${
      s.hits
    }  Faults: ${s.faults}`;

    if (explanationEl) {
      let appendHtml = "";
      for (
        let stepIdx = lastExplainedIndex + 1;
        stepIdx <= current;
        stepIdx++
      ) {
        if (stepIdx < 0 || stepIdx >= steps.length) continue;
        if (stepIdx === 0) {
          appendHtml += `<p class="warna-font"><strong>t0 — Initial state</strong>: semua frame kosong.</p>`;
          continue;
        }
        const step = steps[stepIdx];
        const prev = steps[stepIdx - 1];
        if (step.status === "hit") {
          const fidx =
            step.hitIndex !== undefined
              ? step.hitIndex
              : step.frames.indexOf(step.ref);
          appendHtml += `<p class="warna-font"><strong>Reference ${step.ref}</strong>: <em>Hit</em> — sudah ada di frame F${fidx}. Tidak ada perubahan.</p>`;
        } else if (step.status === "pf") {
          const replaced =
            step.replacedIndex !== undefined
              ? step.replacedIndex
              : (function () {
                  for (let k = 0; k < step.frames.length; k++)
                    if (prev.frames[k] !== step.frames[k]) return k;
                  return -1;
                })();
          if (replaced === -1)
            appendHtml += `<p class="warna-font"><strong>Reference ${step.ref}</strong>: Page fault — frames diperbarui (tidak terdeteksi frame yang berubah).</p>`;
          else {
            const oldVal =
              step.replacedOld !== undefined
                ? step.replacedOld
                : prev.frames[replaced];
            const newVal =
              step.replacedWith !== undefined
                ? step.replacedWith
                : step.frames[replaced];
            if (step.replacementReason) {
              appendHtml += `<p class="warna-font"><strong>Reference ${step.ref}</strong>: Page fault — ${step.replacementReason} Mengganti F${replaced} yang berisi ${oldVal} menjadi ${newVal}.</p>`;
            } else {
              appendHtml += `<p class="warna-font"><strong>Reference ${step.ref}</strong>: Page fault — menggantikan frame F${replaced} yang berisi ${oldVal} dengan ${newVal} menurut <strong>${lastAlgorithm}</strong>.</p>`;
            }
            // (no per-step algorithm detail) — overall algorithm detail shown once when generator runs
          }
        } else
          appendHtml += `<p class="warna-font"><strong>Reference ${step.ref}</strong>: status = ${step.status}.</p>`;
      }
      if (appendHtml.length) {
        explanationEl.innerHTML = (explanationEl.innerHTML || "") + appendHtml;
        lastExplainedIndex = Math.max(lastExplainedIndex, current);
      }
    }
  }

  if (randBtn)
    randBtn.addEventListener("click", () => {
      const count = Math.max(
        1,
        Math.min(50, parseInt(refCountInput.value) || 8)
      );
      const arr = [];
      for (let i = 0; i < count; i++) arr.push(Math.floor(Math.random() * 10));
      refInput.value = arr.join(",");
    });

  if (genBtn)
    genBtn.addEventListener("click", () => {
      const fc = Math.max(1, Math.min(10, parseInt(framesInput.value) || 3));
      const refCount = Math.max(
        1,
        Math.min(50, parseInt(refCountInput.value) || 8)
      );
      let refArr = [];
      if ((refInput.value || "").trim().length)
        refArr = (refInput.value || "")
          .split(/[,\s]+/)
          .filter((x) => x.length)
          .map((r) => (isNaN(parseInt(r)) ? r : parseInt(r)));
      else {
        for (let i = 0; i < refCount; i++)
          refArr.push(Math.floor(Math.random() * 10));
        refInput.value = refArr.join(",");
      }
      if (refArr.length < refCount) {
        for (let i = refArr.length; i < refCount; i++)
          refArr.push(Math.floor(Math.random() * 10));
        refInput.value = refArr.join(",");
      } else if (refArr.length > refCount) {
        refArr = refArr.slice(0, refCount);
        refInput.value = refArr.join(",");
      }
      const algorithm = algSelect && algSelect.value ? algSelect.value : "FIFO";
      lastAlgorithm = algorithm;
      steps = buildSteps(fc, refArr, algorithm);
      lastExplainedIndex = -1;
      if (explanationEl) {
        // single overall algorithm explanation (not per-step)
        let algDetail = "";
        if (algorithm === "LRU")
          algDetail =
            "Pilih frame yang paling lama tidak dipakai (Least Recently Used).";
        else if (algorithm === "OPTIMAL")
          algDetail =
            "Pilih frame yang tidak akan dipakai lagi di masa depan; jika semua akan dipakai, pilih yang dipakai paling jauh waktunya.";
        else
          algDetail = "Ganti frame sesuai urutan masuk (First-In-First-Out).";
        explanationEl.innerHTML = `<p class="warna-font"><strong>Algoritma aktif: ${algorithm}</strong></p><p class="warna-font">Rincian ${algorithm}: ${algDetail}</p>`;
      }
      renderStep(0);
    });

  if (prevBtn) prevBtn.addEventListener("click", () => renderStep(current - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => renderStep(current + 1));
  if (runAllBtn)
    runAllBtn.addEventListener("click", () => {
      if (!steps.length) return;
      let i = 0;
      const iv = setInterval(() => {
        renderStep(i);
        i++;
        if (i >= steps.length) clearInterval(iv);
      }, 450);
    });
});
