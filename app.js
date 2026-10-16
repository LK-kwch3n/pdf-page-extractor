const fileInput = document.querySelector("#pdf-file");
const dropZone = document.querySelector("#drop-zone");
const fileSummary = document.querySelector("#file-summary");
const fileName = document.querySelector("#file-name");
const fileDetails = document.querySelector("#file-details");
const removeFileButton = document.querySelector("#remove-file");
const pageRangesInput = document.querySelector("#page-ranges");
const extractForm = document.querySelector("#extract-form");
const extractButton = document.querySelector("#extract-button");
const statusBox = document.querySelector("#status");

let selectedFile = null;
let sourcePdf = null;

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function showStatus(message, type = "info") {
  statusBox.textContent = message;
  statusBox.className = `status ${type === "info" ? "" : type}`.trim();
  statusBox.hidden = false;
}

function hideStatus() {
  statusBox.hidden = true;
  statusBox.textContent = "";
  statusBox.className = "status";
}

function setBusy(isBusy) {
  fileInput.disabled = isBusy;
  pageRangesInput.disabled = isBusy || !sourcePdf;
  extractButton.disabled = isBusy || !sourcePdf;
  removeFileButton.disabled = isBusy;
  extractButton.textContent = isBusy ? "Extracting…" : "Extract pages";
}

function clearFile() {
  selectedFile = null;
  sourcePdf = null;
  fileInput.value = "";
  pageRangesInput.value = "";
  fileSummary.hidden = true;
  dropZone.hidden = false;
  setBusy(false);
  hideStatus();
}

function isPdf(file) {
  return file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
}

async function loadFile(file) {
  if (!isPdf(file)) {
    showStatus("Please choose a PDF file.", "error");
    return;
  }

  selectedFile = file;
  sourcePdf = null;
  dropZone.hidden = true;
  fileSummary.hidden = false;
  fileName.textContent = file.name;
  fileDetails.textContent = `${formatBytes(file.size)} · Reading PDF…`;
  hideStatus();
  setBusy(true);

  try {
    const bytes = await file.arrayBuffer();
    sourcePdf = await PDFLib.PDFDocument.load(bytes);
    const pageCount = sourcePdf.getPageCount();
    fileDetails.textContent = `${formatBytes(file.size)} · ${pageCount.toLocaleString()} page${pageCount === 1 ? "" : "s"}`;
    setBusy(false);
    pageRangesInput.focus();

    if (file.size >= 100 * 1024 * 1024) {
      showStatus(
        "This is a large file. Extraction may take a while and temporarily use several times the file size in memory.",
      );
    }
  } catch (error) {
    console.error(error);
    sourcePdf = null;
    setBusy(false);
    showStatus(
      "This PDF could not be opened. It may be encrypted, password-protected, damaged, or unsupported.",
      "error",
    );
  }
}

function parsePageSelection(value, pageCount) {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error("Enter at least one page number or range.");
  }

  const pages = [];
  const parts = cleaned.split(",");

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) {
      throw new Error("Remove empty items between commas.");
    }

    if (/^\d+$/.test(part)) {
      pages.push(Number(part));
      continue;
    }

    const rangeMatch = part.match(/^(\d+)\s*:\s*(\d+)$/);
    if (!rangeMatch) {
      throw new Error(`“${part}” is not valid. Use a page number or a range like 2:5.`);
    }

    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (start > end) {
      throw new Error(`Range ${part} runs backward. Put the smaller page first.`);
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
  }

  const invalidPage = pages.find((page) => page < 1 || page > pageCount);
  if (invalidPage !== undefined) {
    throw new Error(`Page ${invalidPage} is outside this PDF. Choose pages from 1 to ${pageCount}.`);
  }

  return pages;
}

function makeOutputName(name) {
  const baseName = name.replace(/\.pdf$/i, "") || "document";
  return `${baseName}-extracted.pdf`;
}

function downloadPdf(bytes, name) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

fileInput.addEventListener("change", () => {
  const [file] = fileInput.files;
  if (file) loadFile(file);
});

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
}

dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) loadFile(file);
});

removeFileButton.addEventListener("click", clearFile);

extractForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedFile || !sourcePdf) return;

  try {
    const pages = parsePageSelection(pageRangesInput.value, sourcePdf.getPageCount());
    setBusy(true);
    showStatus(`Preparing ${pages.length.toLocaleString()} page${pages.length === 1 ? "" : "s"}…`);

    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

    const outputPdf = await PDFLib.PDFDocument.create();
    const copiedPages = await outputPdf.copyPages(
      sourcePdf,
      pages.map((page) => page - 1),
    );
    copiedPages.forEach((page) => outputPdf.addPage(page));

    const bytes = await outputPdf.save();
    const outputName = makeOutputName(selectedFile.name);
    downloadPdf(bytes, outputName);
    showStatus(`Done — ${outputName} is downloading.`, "success");
  } catch (error) {
    console.error(error);
    showStatus(error instanceof Error ? error.message : "The PDF could not be created.", "error");
  } finally {
    setBusy(false);
  }
});
