// Editor de Recortes con Esquinas Libres y Zoom Interactivo
let currentSheet = 1;
let totalSheets = 38;
let currentBoxIndex = 0;
let allConfig = {};
let currentImage = new Image();
let imageLoaded = false;

// Zoom & Pan State
let zoomLevel = 1.0;
let panOffset = { x: 0, y: 0 };
let isSpacePressed = false;
let isPanning = false;
let panStart = { x: 0, y: 0 };

// DOM Elements
const canvas = document.getElementById("cropCanvas");
const ctx = canvas.getContext("2d");
const canvasWrapper = document.getElementById("canvasWrapper");
const canvasViewport = document.getElementById("canvasViewport");
const previewCanvas = document.getElementById("previewCanvas");
const pCtx = previewCanvas.getContext("2d");

const loupeCanvas = document.getElementById("loupeCanvas");
const lCtx = loupeCanvas.getContext("2d");

function updateLoupe(clientX, clientY, normX, normY) {
  if (!imageLoaded) return;
  loupeCanvas.classList.remove("hidden");

  const vpRect = canvasViewport.getBoundingClientRect();
  let loupeX = clientX - vpRect.left;
  let loupeY = clientY - vpRect.top - 100; // 100px por encima del cursor

  // Si está muy cerca del borde superior, mostrar la lupa por debajo
  if (loupeY < 90) {
    loupeY = clientY - vpRect.top + 100;
  }
  // Mantener horizontalmente visible
  loupeX = Math.max(90, Math.min(vpRect.width - 90, loupeX));

  loupeCanvas.style.left = `${loupeX}px`;
  loupeCanvas.style.top = `${loupeY}px`;

  const size = 160;
  lCtx.clearRect(0, 0, size, size);

  lCtx.save();
  // Recorte circular
  lCtx.beginPath();
  lCtx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  lCtx.clip();

  // Dibujar imagen ampliada (aumento de 3.5x)
  const natX = normX * currentImage.naturalWidth;
  const natY = normY * currentImage.naturalHeight;
  const mag = 3.5;

  lCtx.drawImage(
    currentImage,
    size / 2 - natX * mag,
    size / 2 - natY * mag,
    currentImage.naturalWidth * mag,
    currentImage.naturalHeight * mag
  );

  lCtx.restore();

  // Retícula / Punto de mira en el centro exacto
  lCtx.save();
  lCtx.strokeStyle = "rgba(49, 130, 206, 0.9)";
  lCtx.lineWidth = 1.5;

  lCtx.beginPath();
  lCtx.moveTo(size / 2 - 25, size / 2);
  lCtx.lineTo(size / 2 - 5, size / 2);
  lCtx.moveTo(size / 2 + 5, size / 2);
  lCtx.lineTo(size / 2 + 25, size / 2);
  lCtx.moveTo(size / 2, size / 2 - 25);
  lCtx.lineTo(size / 2, size / 2 - 5);
  lCtx.moveTo(size / 2, size / 2 + 5);
  lCtx.lineTo(size / 2, size / 2 + 25);
  lCtx.stroke();

  // Punto central blanco
  lCtx.beginPath();
  lCtx.arc(size / 2, size / 2, 2.5, 0, Math.PI * 2);
  lCtx.fillStyle = "#ffffff";
  lCtx.fill();
  lCtx.strokeStyle = "#2b6cb0";
  lCtx.lineWidth = 1.5;
  lCtx.stroke();

  // Indicador de esquina
  lCtx.fillStyle = "rgba(0, 0, 0, 0.65)";
  lCtx.fillRect(size / 2 - 32, size - 24, 64, 18);
  lCtx.fillStyle = "#ffffff";
  lCtx.font = "bold 10px sans-serif";
  lCtx.textAlign = "center";
  lCtx.textBaseline = "middle";
  lCtx.fillText(`Esquina ${activeCornerIndex + 1}`, size / 2, size - 15);

  lCtx.restore();
}

function hideLoupe() {
  loupeCanvas.classList.add("hidden");
}


const sheetSelect = document.getElementById("sheetSelect");
const sheetProgress = document.getElementById("sheetProgress");
const sidebarTitle = document.getElementById("sidebarTitle");
const photoTabs = document.getElementById("photoTabs");
const cornerCountBadge = document.getElementById("cornerCountBadge");

// Metadatos
const inputTitle = document.getElementById("inputTitle");
const inputDimensions = document.getElementById("inputDimensions");
const checkSheetNeedsReview = document.getElementById("checkSheetNeedsReview");
const checkPhotoNeedsDeblur = document.getElementById("checkPhotoNeedsDeblur");
const sharpnessScore = document.getElementById("sharpnessScore");
const photoMetaTitle = document.getElementById("photoMetaTitle");
const btnExpandPreview = document.getElementById("btnExpandPreview");
const previewBox = document.getElementById("previewBox");

// Modal Previsualización Ampliada HD
const largePreviewModal = document.getElementById("largePreviewModal");
const largePreviewTitle = document.getElementById("largePreviewTitle");
const largePreviewSubtitle = document.getElementById("largePreviewSubtitle");
const largePhotoNeedsDeblur = document.getElementById("largePhotoNeedsDeblur");
const largePreviewViewport = document.getElementById("largePreviewViewport");
const largePreviewCanvasWrapper = document.getElementById("largePreviewCanvasWrapper");
const largePreviewCanvas = document.getElementById("largePreviewCanvas");
const lpCtx = largePreviewCanvas ? largePreviewCanvas.getContext("2d") : null;
const btnLargeZoomIn = document.getElementById("btnLargeZoomIn");
const btnLargeZoomOut = document.getElementById("btnLargeZoomOut");
const btnLargeZoomReset = document.getElementById("btnLargeZoomReset");
const btnCloseLargePreview = document.getElementById("btnCloseLargePreview");
const largeZoomLabel = document.getElementById("largeZoomLabel");

let largeZoom = 1.0;
let largePan = { x: 0, y: 0 };
let isLargePanning = false;
let largePanStart = { x: 0, y: 0 };

const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnAddBox = document.getElementById("btnAddBox");
const btnDeleteBox = document.getElementById("btnDeleteBox");
const btnRenderAll = document.getElementById("btnRenderAll");
const btnRenderSingleHeader = document.getElementById("btnRenderSingleHeader");
const btnRenderSingleSidebar = document.getElementById("btnRenderSingleSidebar");
const btnLargeRenderSingle = document.getElementById("btnLargeRenderSingle");

// Toast
const toastNotification = document.getElementById("toastNotification");
const toastMessage = document.getElementById("toastMessage");
const btnToastOpenFolder = document.getElementById("btnToastOpenFolder");
const btnToastClose = document.getElementById("btnToastClose");

const btnAddCorner = document.getElementById("btnAddCorner");
const btnRemoveCorner = document.getElementById("btnRemoveCorner");
const btnResetCorners = document.getElementById("btnResetCorners");

const btnZoomIn = document.getElementById("btnZoomIn");
const btnZoomOut = document.getElementById("btnZoomOut");
const btnZoomFit = document.getElementById("btnZoomFit");
const btnZoom100 = document.getElementById("btnZoom100");
const zoomLabel = document.getElementById("zoomLabel");

// Modal Render
const renderModal = document.getElementById("renderModal");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const renderLog = document.getElementById("renderLog");
const modalActions = document.getElementById("modalActions");
const btnCloseModal = document.getElementById("btnCloseModal");

// Interaction State
let isInteracting = false;
let interactionType = null; // 'corner', 'edge_add', 'move_polygon'
let activeCornerIndex = -1;
let dragStartMouse = { x: 0, y: 0 };
let initialPointsSnapshot = null;

const CORNER_RADIUS = 7;
const EDGE_HANDLE_RADIUS = 5;

// Inicialización
async function init() {
  sheetSelect.innerHTML = "";
  for (let i = 1; i <= totalSheets; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Obra ${String(i).padStart(3, '0')}`;
    sheetSelect.appendChild(opt);
  }

  const resp = await fetch("/api/config");
  allConfig = await resp.json();

  updateSheetSelectLabels();
  setupEventListeners();
  loadSheet(1);
}

function updateSheetSelectLabels() {
  for (let i = 1; i <= totalSheets; i++) {
    const sKey = String(i);
    const sData = allConfig[sKey];
    const isFlagged = sData && !!sData.needs_review;
    const opt = sheetSelect.querySelector(`option[value="${i}"]`);
    if (opt) {
      if (isFlagged) {
        opt.textContent = `Obra ${String(i).padStart(3, '0')} ⚠️ [Repetir lámina]`;
      } else {
        opt.textContent = `Obra ${String(i).padStart(3, '0')}`;
      }
    }
  }
}

// Convertir caja tradicional (x1, y1, x2, y2, angle) a lista de puntos [ [x, y], ... ]
function ensurePointsFormat(box) {
  if (box.points && box.points.length >= 3) {
    return box.points;
  }
  if (box.corners && box.corners.length >= 3) {
    box.points = box.corners;
    return box.points;
  }

  const x1 = Math.min(box.x1, box.x2);
  const x2 = Math.max(box.x1, box.x2);
  const y1 = Math.min(box.y1, box.y2);
  const y2 = Math.max(box.y1, box.y2);

  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const hw = (x2 - x1) / 2;
  const hh = (y2 - y1) / 2;
  const rad = ((box.angle || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  box.points = [
    [cx + (-hw * cos - -hh * sin), cy + (-hw * sin + -hh * cos)], // TL
    [cx + (hw * cos - -hh * sin), cy + (hw * sin + -hh * cos)],   // TR
    [cx + (hw * cos - hh * sin), cy + (hw * sin + hh * cos)],     // BR
    [cx + (-hw * cos - hh * sin), cy + (-hw * sin + hh * cos)]    // BL
  ];
  return box.points;
}

function getCurrentBoxes() {
  const sKey = String(currentSheet);
  if (!allConfig[sKey]) allConfig[sKey] = { boxes: [] };
  if (!allConfig[sKey].boxes) allConfig[sKey].boxes = [];

  // Asegurar formato de puntos en todas las cajas
  allConfig[sKey].boxes.forEach(b => ensurePointsFormat(b));
  return allConfig[sKey].boxes;
}

async function saveCurrentSheet() {
  const sKey = String(currentSheet);
  const boxes = getCurrentBoxes();
  const isFlagged = allConfig[sKey] ? !!allConfig[sKey].needs_review : false;
  await fetch("/api/save_sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheet: currentSheet, boxes: boxes, needs_review: isFlagged })
  });
}

function updateSidebarTitle() {
  const sKey = String(currentSheet);
  const isFlagged = allConfig[sKey] ? !!allConfig[sKey].needs_review : false;
  sidebarTitle.textContent = isFlagged
    ? `Obra ${String(currentSheet).padStart(3, '0')} ⚠️ (Repetir)`
    : `Obra ${String(currentSheet).padStart(3, '0')}`;
}

function updateRenderSingleButtonLabels() {
  const sheetStr = String(currentSheet).padStart(3, '0');
  if (btnRenderSingleSidebar) {
    btnRenderSingleSidebar.textContent = `⚡ Renderizar Obra ${sheetStr} (Alta Res)`;
  }
  if (btnRenderSingleHeader) {
    btnRenderSingleHeader.textContent = `⚡ Renderizar Obra ${sheetStr}`;
  }
}

let toastTimeout = null;
function showToast(message, allowOpenFolder = true) {
  if (!toastNotification) return;
  toastMessage.textContent = message;
  if (btnToastOpenFolder) {
    btnToastOpenFolder.style.display = allowOpenFolder ? "inline-block" : "none";
  }
  toastNotification.classList.remove("hidden");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastNotification.classList.add("hidden");
  }, 6000);
}

async function renderCurrentSheetSingle() {
  const sheetNum = currentSheet;
  const sheetStr = String(sheetNum).padStart(3, '0');
  await saveCurrentSheet();

  const buttons = [btnRenderSingleHeader, btnRenderSingleSidebar, btnLargeRenderSingle].filter(Boolean);
  buttons.forEach(b => {
    b.disabled = true;
    b.dataset.origText = b.textContent;
    b.textContent = "⏳ Renderizando...";
  });

  try {
    const resp = await fetch("/api/render_single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet: sheetNum })
    });
    const data = await resp.json();

    if (data.status === "ok") {
      const count = data.count || (data.files ? data.files.length : 1);
      showToast(`✔ Obra ${sheetStr} guardada en alta resolución (${count} foto${count > 1 ? 's' : ''})`);
    } else {
      alert("Error al renderizar: " + (data.message || "Error desconocido"));
    }
  } catch (err) {
    alert("Error de conexión al renderizar: " + err.message);
  } finally {
    buttons.forEach(b => {
      b.disabled = false;
      b.textContent = b.dataset.origText || `⚡ Renderizar Obra ${sheetStr} (Alta Res)`;
    });
    updateRenderSingleButtonLabels();
  }
}

function loadSheet(num) {
  if (num < 1) num = 1;
  if (num > totalSheets) num = totalSheets;

  saveCurrentSheet();

  currentSheet = num;
  currentBoxIndex = 0;
  sheetSelect.value = currentSheet;
  sheetProgress.textContent = `${currentSheet} / ${totalSheets}`;
  updateSidebarTitle();
  updateRenderSingleButtonLabels();

  btnPrev.disabled = (currentSheet === 1);
  btnNext.textContent = (currentSheet === totalSheets) ? "Finalizar ✔" : "Siguiente ▶";

  imageLoaded = false;
  currentImage = new Image();
  currentImage.src = `/api/sheet_image/${currentSheet}?t=${Date.now()}`;
  currentImage.onload = () => {
    imageLoaded = true;
    resetZoomAndFit();
    renderPhotoTabs();
    updateCornerUI();
    updateMetadataInputs();
    redraw();
  };
}

function resetZoomAndFit() {
  if (!imageLoaded) return;
  const vw = canvasViewport.clientWidth - 30;
  const vh = canvasViewport.clientHeight - 60;

  const imgW = currentImage.naturalWidth;
  const imgH = currentImage.naturalHeight;

  // Base canvas resolution = original display preview size
  canvas.width = imgW;
  canvas.height = imgH;

  const fitScale = Math.min(vw / imgW, vh / imgH, 1.0);
  zoomLevel = fitScale;
  panOffset = { x: 0, y: 0 };
  applyZoomPanTransform();
}

function applyZoomPanTransform() {
  canvasWrapper.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`;
  zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
}

function renderPhotoTabs() {
  const boxes = getCurrentBoxes();
  photoTabs.innerHTML = "";

  if (boxes.length === 0) {
    boxes.push({
      title: "",
      dimensions: "",
      points: [
        [0.15, 0.15],
        [0.85, 0.15],
        [0.85, 0.85],
        [0.15, 0.85]
      ]
    });
  }

  if (currentBoxIndex >= boxes.length) {
    currentBoxIndex = Math.max(0, boxes.length - 1);
  }

  boxes.forEach((b, idx) => {
    const tab = document.createElement("button");
    const isAct = idx === currentBoxIndex;
    const isDeblur = !!b.needs_deblur;
    tab.className = `photo-tab ${isAct ? 'active' : ''} ${isDeblur ? 'deblur' : ''}`;
    let tabLabel = `Foto ${idx + 1}`;
    if (isDeblur) tabLabel += " 🔍";
    tab.textContent = tabLabel;

    let tooltip = `Foto ${idx + 1}`;
    if (b.title) tooltip += `: ${b.title}`;
    if (isDeblur) tooltip += ` [Requiere Deblur]`;
    tab.title = tooltip;

    tab.onclick = () => {
      currentBoxIndex = idx;
      renderPhotoTabs();
      updateCornerUI();
      updateMetadataInputs();
      redraw();
    };
    photoTabs.appendChild(tab);
  });
}

function updateMetadataInputs() {
  const sKey = String(currentSheet);
  const isFlagged = allConfig[sKey] ? !!allConfig[sKey].needs_review : false;
  if (checkSheetNeedsReview) {
    checkSheetNeedsReview.checked = isFlagged;
  }

  if (photoMetaTitle) {
    photoMetaTitle.textContent = `Datos de Foto ${currentBoxIndex + 1}`;
  }

  const boxes = getCurrentBoxes();
  const box = boxes[currentBoxIndex];
  if (box) {
    inputTitle.value = box.title || "";
    inputDimensions.value = box.dimensions || "";
    if (checkPhotoNeedsDeblur) {
      checkPhotoNeedsDeblur.checked = !!box.needs_deblur;
    }
  } else {
    inputTitle.value = "";
    inputDimensions.value = "";
    if (checkPhotoNeedsDeblur) {
      checkPhotoNeedsDeblur.checked = false;
    }
  }
}

function updateCornerUI() {
  const boxes = getCurrentBoxes();
  const box = boxes[currentBoxIndex];
  if (box && box.points) {
    cornerCountBadge.textContent = `${box.points.length} esquinas`;
  }
}

// Dibujar Canvas
function redraw() {
  if (!imageLoaded) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(currentImage, 0, 0);

  const boxes = getCurrentBoxes();

  // 1. Dibujar fotos no seleccionadas
  boxes.forEach((b, idx) => {
    if (idx !== currentBoxIndex) {
      drawPolygon(b.points, false, idx + 1, b);
    }
  });

  // 2. Dibujar foto activa con manillas interactivas
  if (boxes[currentBoxIndex]) {
    drawPolygon(boxes[currentBoxIndex].points, true, currentBoxIndex + 1, boxes[currentBoxIndex]);
  }

  updateLivePreview();
}

function drawPolygon(points, isSelected, number, boxData) {
  if (!points || points.length < 3) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const isSheetRev = allConfig[String(currentSheet)] && !!allConfig[String(currentSheet)].needs_review;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0][0] * cw, points[0][1] * ch);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] * cw, points[i][1] * ch);
  }
  ctx.closePath();

  // Relleno
  if (isSheetRev) {
    ctx.fillStyle = isSelected ? "rgba(245, 158, 11, 0.22)" : "rgba(245, 158, 11, 0.1)";
  } else {
    ctx.fillStyle = isSelected ? "rgba(49, 130, 206, 0.18)" : "rgba(255, 255, 255, 0.08)";
  }
  ctx.fill();

  // Borde
  ctx.lineWidth = isSelected ? 3 : 1.5;
  if (isSheetRev) {
    ctx.strokeStyle = isSelected ? "#f59e0b" : "rgba(245, 158, 11, 0.65)";
  } else {
    ctx.strokeStyle = isSelected ? "#3182ce" : "rgba(255, 255, 255, 0.5)";
  }
  ctx.stroke();

  // Etiqueta Foto X
  const minX = Math.min(...points.map(p => p[0])) * cw;
  const minY = Math.min(...points.map(p => p[1])) * ch;
  let labelText = (boxData && boxData.title) ? `Foto ${number}: ${boxData.title}` : `Foto ${number}`;
  if (boxData && boxData.needs_deblur) labelText += " 🔍";
  if (isSheetRev) labelText += " ⚠️";
  ctx.font = "bold 12px sans-serif";
  const tagW = ctx.measureText(labelText).width + 16;

  if (isSheetRev) {
    ctx.fillStyle = isSelected ? "#d97706" : "#78350f";
  } else {
    ctx.fillStyle = isSelected ? "#3182ce" : "#4a5568";
  }
  ctx.fillRect(minX, minY - 22, tagW, 22);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(labelText, minX + 8, minY - 6);

  if (isSelected) {
    // 1. Resaltar la cara baja (la base que se nivelará horizontalmente a 0.0°)
    let bestEdgeIdx = -1;
    let maxMidY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const midY = (p1[1] + p2[1]) / 2;
      if (midY > maxMidY) {
        maxMidY = midY;
        bestEdgeIdx = i;
      }
    }

    if (bestEdgeIdx >= 0) {
      const p1 = points[bestEdgeIdx];
      const p2 = points[(bestEdgeIdx + 1) % points.length];
      const p1x = p1[0] * cw, p1y = p1[1] * ch;
      const p2x = p2[0] * cw, p2y = p2[1] * ch;

      // Línea resaltada en verde esmeralda para la cara baja
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = "#10b981";
      ctx.stroke();

      // Etiqueta "BASE HORIZONTAL" centrada sobre el segmento
      const mx = (p1x + p2x) / 2;
      const my = (p1y + p2y) / 2;
      const label = "BASE HORIZONTAL (0.0°)";
      ctx.font = "bold 10px sans-serif";
      const tw = ctx.measureText(label).width;

      ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(mx - tw / 2 - 7, my + 6, tw + 14, 18, 4);
        ctx.fill();
      } else {
        ctx.fillRect(mx - tw / 2 - 7, my + 6, tw + 14, 18);
      }

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, mx, my + 15);
      ctx.restore();
    }

    // 2. Dibujar manillas de esquina individuales
    points.forEach((pt, idx) => {
      const px = pt[0] * cw;
      const py = pt[1] * ch;

      ctx.beginPath();
      ctx.arc(px, py, CORNER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#2b6cb0";
      ctx.stroke();

      // Número de esquina sutil
      ctx.fillStyle = "#2d3748";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${idx + 1}`, px, py);
    });

    // 3. Dibujar manillas intermedias "+" en cada borde para añadir esquinas
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const mx = ((p1[0] + p2[0]) / 2) * cw;
      const my = ((p1[1] + p2[1]) / 2) * ch;

      ctx.beginPath();
      ctx.arc(mx, my, EDGE_HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(49, 130, 206, 0.9)";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", mx, my);
    }
  }

  ctx.restore();
}

// Funciones de Mapeo Proyectivo / Cuadrilátero para Enmarcado Exacto
function drawWarpedTriangle(targetCtx, img, s0, s1, s2, d0, d1, d2) {
  const u0 = s0[0], v0 = s0[1];
  const u1 = s1[0], v1 = s1[1];
  const u2 = s2[0], v2 = s2[1];

  const x0 = d0[0], y0 = d0[1];
  const x1 = d1[0], y1 = d1[1];
  const x2 = d2[0], y2 = d2[1];

  const D = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (Math.abs(D) < 1e-7) return;

  const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / D;
  const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / D;
  const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / D;

  const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / D;
  const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / D;
  const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / D;

  targetCtx.save();
  targetCtx.beginPath();
  targetCtx.moveTo(x0, y0);
  targetCtx.lineTo(x1, y1);
  targetCtx.lineTo(x2, y2);
  targetCtx.closePath();
  targetCtx.clip();

  targetCtx.transform(a, b, c, d, e, f);
  targetCtx.drawImage(img, 0, 0);
  targetCtx.restore();
}

function drawWarpedQuad(targetCtx, img, pTL, pTR, pBR, pBL, targetW, targetH) {
  const dTL = [0, 0];
  const dTR = [targetW, 0];
  const dBR = [targetW, targetH];
  const dBL = [0, targetH];

  // Triángulo 1 con leve extensión en la diagonal para costura limpia
  const dTR_ext = [targetW + 0.75, -0.75];
  const dBL_ext = [-0.75, targetH + 0.75];
  drawWarpedTriangle(targetCtx, img, pTL, pTR, pBL, dTL, dTR_ext, dBL_ext);

  // Triángulo 2
  drawWarpedTriangle(targetCtx, img, pTR, pBR, pBL, dTR, dBR, dBL);
}

function getSortedQuadPoints(pts) {
  const n = pts.length;
  if (n !== 4) return null;

  let bestEdgeIdx = 0;
  let maxMidY = -Infinity;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const midY = (p1[1] + p2[1]) / 2;
    if (midY > maxMidY) {
      maxMidY = midY;
      bestEdgeIdx = i;
    }
  }

  const iBot = bestEdgeIdx;
  let pBL = pts[iBot];
  let pBR = pts[(iBot + 1) % n];
  let blIdx = iBot;
  let brIdx = (iBot + 1) % n;

  if (pBL[0] > pBR[0]) {
    [pBL, pBR] = [pBR, pBL];
    [blIdx, brIdx] = [brIdx, blIdx];
  }

  const otherIndices = [0, 1, 2, 3].filter(idx => idx !== blIdx && idx !== brIdx);
  let pTL = pts[otherIndices[0]];
  let pTR = pts[otherIndices[1]];
  if (pTL[0] > pTR[0]) {
    [pTL, pTR] = [pTR, pTL];
  }

  const dx = pBR[0] - pBL[0];
  const dy = pBR[1] - pBL[1];
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  const wTop = Math.hypot(pTR[0] - pTL[0], pTR[1] - pTL[1]);
  const wBot = Math.hypot(pBR[0] - pBL[0], pBR[1] - pBL[1]);
  const hLeft = Math.hypot(pBL[0] - pTL[0], pBL[1] - pTL[1]);
  const hRight = Math.hypot(pBR[0] - pTR[0], pBR[1] - pTR[1]);

  const targetW = Math.max(10, Math.round(Math.max(wTop, wBot)));
  const targetH = Math.max(10, Math.round(Math.max(hLeft, hRight)));

  return { pTL, pTR, pBR, pBL, angleDeg, targetW, targetH };
}

// Medidor de nitidez en tiempo real mediante varianza del Laplaciano
function calculateSharpness(ctx, width, height) {
  if (!ctx || width <= 2 || height <= 2) return { score: 0, label: "—", cls: "" };
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const w = width;
    const h = height;

    const gray = new Float32Array(w * h);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        const lap = gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w] - 4 * gray[idx];
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    if (count === 0) return { score: 0, label: "—", cls: "" };
    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    const score = Math.round(variance);

    if (score < 400) {
      return { score, label: `${score} (🔴 Posiblemente borrosa)`, cls: "sharpness-blur" };
    } else if (score < 1000) {
      return { score, label: `${score} (🟡 Aceptable)`, cls: "sharpness-mid" };
    } else {
      return { score, label: `${score} (🟢 Nítida)`, cls: "sharpness-good" };
    }
  } catch (e) {
    return { score: 0, label: "—", cls: "" };
  }
}

// Previsualización en Vivo en Sidebar (Nivelada con Cara Baja Horizontal)
function updateLivePreview() {
  const boxes = getCurrentBoxes();
  const box = boxes[currentBoxIndex];
  const levelAngleText = document.getElementById("levelAngleText");

  if (!box || !box.points || box.points.length < 3 || !imageLoaded) {
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    if (levelAngleText) levelAngleText.textContent = "Base: —";
    if (sharpnessScore) {
      sharpnessScore.textContent = "—";
      sharpnessScore.className = "sharpness-score";
    }
    return;
  }

  const cw = canvas.width;
  const ch = canvas.height;
  const pts = box.points.map(p => [p[0] * cw, p[1] * ch]);
  const n = pts.length;

  if (n === 4) {
    const quad = getSortedQuadPoints(pts);
    if (levelAngleText) {
      levelAngleText.textContent = `Cara baja: ${quad.angleDeg >= 0 ? "+" : ""}${quad.angleDeg.toFixed(2)}° → Nivelada a 0.0° (Cuadrada)`;
    }

    const previewW = 300;
    const previewH = Math.max(20, Math.round(300 * (quad.targetH / quad.targetW)));
    previewCanvas.width = previewW;
    previewCanvas.height = previewH;

    pCtx.clearRect(0, 0, previewW, previewH);
    drawWarpedQuad(pCtx, currentImage, quad.pTL, quad.pTR, quad.pBR, quad.pBL, previewW, previewH);
  } else {
    // Polígono libre (n > 4)
    let bestEdge = null;
    let maxMidY = -Infinity;
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const midY = (p1[1] + p2[1]) / 2;
      if (midY > maxMidY) {
        maxMidY = midY;
        bestEdge = [p1, p2];
      }
    }

    let [pA, pB] = bestEdge;
    if (pA[0] > pB[0]) [pA, pB] = [pB, pA];

    const dx = pB[0] - pA[0];
    const dy = pB[1] - pA[1];
    const theta = Math.atan2(dy, dx);
    const angleDeg = (theta * 180) / Math.PI;

    if (levelAngleText) {
      levelAngleText.textContent = `Cara baja: ${angleDeg >= 0 ? "+" : ""}${angleDeg.toFixed(2)}° → Nivelada a 0.0° (Polígono)`;
    }

    const cx = pts.reduce((sum, p) => sum + p[0], 0) / n;
    const cy = pts.reduce((sum, p) => sum + p[1], 0) / n;

    const cosT = Math.cos(-theta);
    const sinT = Math.sin(-theta);

    const rotPts = pts.map(([x, y]) => {
      const ox = x - cx;
      const oy = y - cy;
      return [
        ox * cosT - oy * sinT + cx,
        ox * sinT + oy * cosT + cy
      ];
    });

    const minX = Math.min(...rotPts.map(p => p[0]));
    const maxX = Math.max(...rotPts.map(p => p[0]));
    const minY = Math.min(...rotPts.map(p => p[1]));
    const maxY = Math.max(...rotPts.map(p => p[1]));
    const bw = Math.max(10, maxX - minX);
    const bh = Math.max(10, maxY - minY);

    previewCanvas.width = 300;
    previewCanvas.height = Math.max(20, Math.round(300 * (bh / bw)));

    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    pCtx.save();

    const scale = previewCanvas.width / bw;
    pCtx.scale(scale, scale);
    pCtx.translate(-minX, -minY);

    pCtx.translate(cx, cy);
    pCtx.rotate(-theta);
    pCtx.translate(-cx, -cy);

    pCtx.beginPath();
    pCtx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      pCtx.lineTo(pts[i][0], pts[i][1]);
    }
    pCtx.closePath();
    pCtx.clip();

    pCtx.drawImage(currentImage, 0, 0);
    pCtx.restore();
  }

  // Actualizar estimación de nitidez
  if (sharpnessScore) {
    const sharp = calculateSharpness(pCtx, previewCanvas.width, previewCanvas.height);
    sharpnessScore.textContent = sharp.label;
    sharpnessScore.className = `sharpness-score ${sharp.cls}`;
  }

  if (largePreviewModal && !largePreviewModal.classList.contains("hidden")) {
    renderLargePreviewCanvas();
  }
}

// Renderizado de Vista Previa Ampliada HD
function renderLargePreviewCanvas() {
  if (!lpCtx || !imageLoaded) return;

  const boxes = getCurrentBoxes();
  const box = boxes[currentBoxIndex];
  if (!box || !box.points || box.points.length < 3) {
    lpCtx.clearRect(0, 0, largePreviewCanvas.width, largePreviewCanvas.height);
    return;
  }

  const cw = canvas.width;
  const ch = canvas.height;
  const pts = box.points.map(p => [p[0] * cw, p[1] * ch]);
  const n = pts.length;

  if (n === 4) {
    const quad = getSortedQuadPoints(pts);
    largePreviewCanvas.width = quad.targetW;
    largePreviewCanvas.height = quad.targetH;

    lpCtx.clearRect(0, 0, quad.targetW, quad.targetH);
    drawWarpedQuad(lpCtx, currentImage, quad.pTL, quad.pTR, quad.pBR, quad.pBL, quad.targetW, quad.targetH);
  } else {
    // Polígono libre
    let bestEdge = null;
    let maxMidY = -Infinity;
    for (let i = 0; i < n; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const midY = (p1[1] + p2[1]) / 2;
      if (midY > maxMidY) {
        maxMidY = midY;
        bestEdge = [p1, p2];
      }
    }

    let [pA, pB] = bestEdge;
    if (pA[0] > pB[0]) [pA, pB] = [pB, pA];

    const dx = pB[0] - pA[0];
    const dy = pB[1] - pA[1];
    const theta = Math.atan2(dy, dx);

    const cx = pts.reduce((sum, p) => sum + p[0], 0) / n;
    const cy = pts.reduce((sum, p) => sum + p[1], 0) / n;

    const cosT = Math.cos(-theta);
    const sinT = Math.sin(-theta);

    const rotPts = pts.map(([x, y]) => {
      const ox = x - cx;
      const oy = y - cy;
      return [
        ox * cosT - oy * sinT + cx,
        ox * sinT + oy * cosT + cy
      ];
    });

    const minX = Math.min(...rotPts.map(p => p[0]));
    const maxX = Math.max(...rotPts.map(p => p[0]));
    const minY = Math.min(...rotPts.map(p => p[1]));
    const maxY = Math.max(...rotPts.map(p => p[1]));
    const bw = Math.max(10, maxX - minX);
    const bh = Math.max(10, maxY - minY);

    largePreviewCanvas.width = Math.round(bw);
    largePreviewCanvas.height = Math.round(bh);

    lpCtx.clearRect(0, 0, largePreviewCanvas.width, largePreviewCanvas.height);
    lpCtx.save();

    lpCtx.translate(-minX, -minY);
    lpCtx.translate(cx, cy);
    lpCtx.rotate(-theta);
    lpCtx.translate(-cx, -cy);

    lpCtx.beginPath();
    lpCtx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      lpCtx.lineTo(pts[i][0], pts[i][1]);
    }
    lpCtx.closePath();
    lpCtx.clip();

    lpCtx.drawImage(currentImage, 0, 0);
    lpCtx.restore();
  }
}

function applyLargeZoomTransform() {
  if (!largePreviewCanvasWrapper) return;
  largePreviewCanvasWrapper.style.transform = `translate(${largePan.x}px, ${largePan.y}px) scale(${largeZoom})`;
  if (largeZoomLabel) {
    largeZoomLabel.textContent = `${Math.round(largeZoom * 100)}%`;
  }
}

function resetLargeZoom() {
  if (!largePreviewViewport || !largePreviewCanvas || largePreviewCanvas.width === 0) return;
  const vpW = largePreviewViewport.clientWidth - 40;
  const vpH = largePreviewViewport.clientHeight - 40;
  const fitScale = Math.min(vpW / largePreviewCanvas.width, vpH / largePreviewCanvas.height, 1.0);
  largeZoom = Math.max(0.1, fitScale);
  largePan = { x: 0, y: 0 };
  applyLargeZoomTransform();
}

function openLargePreview() {
  const boxes = getCurrentBoxes();
  const box = boxes[currentBoxIndex];
  if (!box) return;

  const sheetStr = String(currentSheet).padStart(3, '0');
  const titleStr = box.title ? ` — "${box.title}"` : "";
  if (largePreviewTitle) {
    largePreviewTitle.textContent = `Vista Previa Ampliada — Obra ${sheetStr} (Foto ${currentBoxIndex + 1})${titleStr}`;
  }

  if (largePhotoNeedsDeblur) {
    largePhotoNeedsDeblur.checked = !!box.needs_deblur;
  }

  updateLargePreviewSubtitle(box);

  renderLargePreviewCanvas();
  largePreviewModal.classList.remove("hidden");
  setTimeout(() => {
    resetLargeZoom();
  }, 20);
}

function updateLargePreviewSubtitle(box) {
  if (!largePreviewSubtitle || !box) return;
  const dimStr = box.dimensions ? `Dimensiones: ${box.dimensions}` : "Dimensiones no especificadas";
  const isSheetFlagged = allConfig[String(currentSheet)] && !!allConfig[String(currentSheet)].needs_review;
  const revStr = isSheetFlagged ? " | ⚠️ Lámina marcada para repetir" : "";
  const deblurStr = box.needs_deblur ? " | 🔍 Marcada para deblur" : "";
  largePreviewSubtitle.textContent = `${dimStr}${revStr}${deblurStr} | Base nivelada a 0.0°`;
}

function closeLargePreview() {
  if (largePreviewModal) {
    largePreviewModal.classList.add("hidden");
  }
}

// Detección de impacto (Hit Testing)
function getCanvasCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  // Convierte coordenadas de pantalla a espacio de imagen canvas
  const x = (clientX - rect.left) / (rect.width / canvas.width);
  const y = (clientY - rect.top) / (rect.height / canvas.height);
  return { x, y };
}

function hitTest(cx, cy) {
  const boxes = getCurrentBoxes();
  const box = boxes[currentBoxIndex];
  if (!box || !box.points) return null;

  const cw = canvas.width;
  const ch = canvas.height;
  const pts = box.points.map(p => [p[0] * cw, p[1] * ch]);

  // 1. Manillas de Esquinas individuales
  for (let i = 0; i < pts.length; i++) {
    const d = Math.hypot(cx - pts[i][0], cy - pts[i][1]);
    if (d < CORNER_RADIUS * 2.5) {
      return { type: "corner", index: i };
    }
  }

  // 2. Manillas intermedias "+" para añadir esquinas
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const d = Math.hypot(cx - mx, cy - my);
    if (d < EDGE_HANDLE_RADIUS * 2.5) {
      return { type: "edge_add", edgeIndex: i };
    }
  }

  // 3. Interior del polígono (mover polígono completo)
  if (isPointInsidePoly(cx, cy, pts)) {
    return { type: "move_polygon" };
  }

  // 4. Clic sobre otra foto
  for (let bIdx = 0; bIdx < boxes.length; bIdx++) {
    if (bIdx === currentBoxIndex) continue;
    const otherPts = boxes[bIdx].points.map(p => [p[0] * cw, p[1] * ch]);
    if (isPointInsidePoly(cx, cy, otherPts)) {
      return { type: "select_box", boxIndex: bIdx };
    }
  }

  return null;
}

function isPointInsidePoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Listeners de Eventos
function setupEventListeners() {
  // Zoom con botones
  btnZoomIn.onclick = () => {
    zoomLevel = Math.min(6.0, zoomLevel * 1.25);
    applyZoomPanTransform();
  };
  btnZoomOut.onclick = () => {
    zoomLevel = Math.max(0.2, zoomLevel / 1.25);
    applyZoomPanTransform();
  };
  btnZoom100.onclick = () => {
    zoomLevel = 1.0;
    panOffset = { x: 0, y: 0 };
    applyZoomPanTransform();
  };
  btnZoomFit.onclick = () => {
    resetZoomAndFit();
  };

  // Zoom interactivo con rueda del ratón
  canvasViewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(8.0, zoomLevel * zoomFactor));

    // Zoom centrado hacia la posición del ratón
    const vpRect = canvasViewport.getBoundingClientRect();
    const mouseX = e.clientX - vpRect.left - vpRect.width / 2;
    const mouseY = e.clientY - vpRect.top - vpRect.height / 2;

    panOffset.x -= (mouseX - panOffset.x) * (zoomFactor - 1);
    panOffset.y -= (mouseY - panOffset.y) * (zoomFactor - 1);
    zoomLevel = newZoom;
    applyZoomPanTransform();
  }, { passive: false });

  // Espacio para Paneo
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (largePreviewModal && !largePreviewModal.classList.contains("hidden")) {
        closeLargePreview();
        return;
      }
      if (renderModal && !renderModal.classList.contains("hidden")) {
        renderModal.classList.add("hidden");
        return;
      }
    }

    if (e.code === "Space" && !isSpacePressed && e.target.tagName !== "INPUT") {
      isSpacePressed = true;
      canvasViewport.style.cursor = "grab";
    }

    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      btnNext.click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      btnPrev.click();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const boxes = getCurrentBoxes();
      currentBoxIndex = (currentBoxIndex + 1) % boxes.length;
      renderPhotoTabs();
      updateCornerUI();
      updateMetadataInputs();
      redraw();
    } else if (e.key === "Delete") {
      e.preventDefault();
      btnDeleteBox.click();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      isSpacePressed = false;
      isPanning = false;
      canvasViewport.style.cursor = "default";
    }
  });

  // Navegación
  btnPrev.onclick = () => loadSheet(currentSheet - 1);
  btnNext.onclick = () => {
    if (currentSheet < totalSheets) {
      loadSheet(currentSheet + 1);
    } else {
      saveCurrentSheet();
      alert("¡Has revisado las 38 láminas! Pulsa 'Renderizar Todo' para generar los archivos PNG finales.");
    }
  };
  sheetSelect.onchange = (e) => loadSheet(parseInt(e.target.value));

  // Botones de Esquinas Libres
  btnAddCorner.onclick = () => {
    const boxes = getCurrentBoxes();
    const box = boxes[currentBoxIndex];
    if (!box || !box.points) return;

    // Encontrar el segmento más largo e insertar un punto intermedio
    let maxDist = 0;
    let maxIdx = 0;
    for (let i = 0; i < box.points.length; i++) {
      const p1 = box.points[i];
      const p2 = box.points[(i + 1) % box.points.length];
      const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    const p1 = box.points[maxIdx];
    const p2 = box.points[(maxIdx + 1) % box.points.length];
    const newPt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    box.points.splice(maxIdx + 1, 0, newPt);

    updateCornerUI();
    redraw();
  };

  btnRemoveCorner.onclick = () => {
    const boxes = getCurrentBoxes();
    const box = boxes[currentBoxIndex];
    if (!box || !box.points || box.points.length <= 3) {
      alert("Un polígono debe tener al menos 3 esquinas.");
      return;
    }
    box.points.pop();
    updateCornerUI();
    redraw();
  };

  btnResetCorners.onclick = () => {
    const boxes = getCurrentBoxes();
    const box = boxes[currentBoxIndex];
    if (!box || !box.points) return;
    const xs = box.points.map(p => p[0]);
    const ys = box.points.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    box.points = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY]
    ];
    updateCornerUI();
    redraw();
  };

  // Añadir/Eliminar Foto
  btnAddBox.onclick = () => {
    const boxes = getCurrentBoxes();
    boxes.push({
      title: "",
      dimensions: "",
      needs_review: false,
      points: [
        [0.2, 0.2],
        [0.8, 0.2],
        [0.8, 0.8],
        [0.2, 0.8]
      ]
    });
    currentBoxIndex = boxes.length - 1;
    renderPhotoTabs();
    updateCornerUI();
    updateMetadataInputs();
    redraw();
    saveCurrentSheet();
  };

  btnDeleteBox.onclick = () => {
    const boxes = getCurrentBoxes();
    if (boxes.length <= 1) {
      alert("Cada lámina debe tener al menos una fotografía.");
      return;
    }
    boxes.splice(currentBoxIndex, 1);
    currentBoxIndex = Math.max(0, currentBoxIndex - 1);
    renderPhotoTabs();
    updateCornerUI();
    updateMetadataInputs();
    updateSheetSelectLabels();
    redraw();
    saveCurrentSheet();
  };

  // Metadatos (Título y Dimensiones de esta foto)
  if (inputTitle) {
    inputTitle.addEventListener("input", (e) => {
      const boxes = getCurrentBoxes();
      if (boxes[currentBoxIndex]) {
        boxes[currentBoxIndex].title = e.target.value;
        const tab = photoTabs.children[currentBoxIndex];
        if (tab) {
          tab.title = e.target.value ? `Foto ${currentBoxIndex + 1}: ${e.target.value}` : `Foto ${currentBoxIndex + 1}`;
        }
        redraw();
        saveCurrentSheet();
      }
    });
  }

  if (inputDimensions) {
    inputDimensions.addEventListener("input", (e) => {
      const boxes = getCurrentBoxes();
      if (boxes[currentBoxIndex]) {
        boxes[currentBoxIndex].dimensions = e.target.value;
        saveCurrentSheet();
      }
    });
  }

  // Repetir Lámina Completa (de toda la página)
  if (checkSheetNeedsReview) {
    checkSheetNeedsReview.addEventListener("change", (e) => {
      const sKey = String(currentSheet);
      if (!allConfig[sKey]) allConfig[sKey] = { boxes: [] };
      allConfig[sKey].needs_review = e.target.checked;
      updateSidebarTitle();
      updateSheetSelectLabels();
      redraw();
      saveCurrentSheet();
    });
  }

  // Marcar Foto Borrosa (requiere deblur)
  if (checkPhotoNeedsDeblur) {
    checkPhotoNeedsDeblur.addEventListener("change", (e) => {
      const boxes = getCurrentBoxes();
      if (boxes[currentBoxIndex]) {
        boxes[currentBoxIndex].needs_deblur = e.target.checked;
        if (largePhotoNeedsDeblur) {
          largePhotoNeedsDeblur.checked = e.target.checked;
        }
        renderPhotoTabs();
        redraw();
        saveCurrentSheet();
      }
    });
  }

  if (largePhotoNeedsDeblur) {
    largePhotoNeedsDeblur.addEventListener("change", (e) => {
      const boxes = getCurrentBoxes();
      if (boxes[currentBoxIndex]) {
        boxes[currentBoxIndex].needs_deblur = e.target.checked;
        if (checkPhotoNeedsDeblur) {
          checkPhotoNeedsDeblur.checked = e.target.checked;
        }
        renderPhotoTabs();
        redraw();
        saveCurrentSheet();
        updateLargePreviewSubtitle(boxes[currentBoxIndex]);
      }
    });
  }

  // Previsualización Ampliada HD
  if (btnExpandPreview) {
    btnExpandPreview.onclick = openLargePreview;
  }
  if (previewBox) {
    previewBox.onclick = openLargePreview;
  }
  if (btnCloseLargePreview) {
    btnCloseLargePreview.onclick = closeLargePreview;
  }
  if (largePreviewModal) {
    largePreviewModal.addEventListener("click", (e) => {
      if (e.target === largePreviewModal) {
        closeLargePreview();
      }
    });
  }

  if (btnLargeZoomIn) {
    btnLargeZoomIn.onclick = () => {
      largeZoom = Math.min(10.0, largeZoom * 1.25);
      applyLargeZoomTransform();
    };
  }
  if (btnLargeZoomOut) {
    btnLargeZoomOut.onclick = () => {
      largeZoom = Math.max(0.15, largeZoom / 1.25);
      applyLargeZoomTransform();
    };
  }
  if (btnLargeZoomReset) {
    btnLargeZoomReset.onclick = resetLargeZoom;
  }

  if (largePreviewViewport) {
    largePreviewViewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.max(0.15, Math.min(10.0, largeZoom * zoomFactor));

      const vpRect = largePreviewViewport.getBoundingClientRect();
      const mouseX = e.clientX - vpRect.left - vpRect.width / 2;
      const mouseY = e.clientY - vpRect.top - vpRect.height / 2;

      largePan.x -= (mouseX - largePan.x) * (zoomFactor - 1);
      largePan.y -= (mouseY - largePan.y) * (zoomFactor - 1);
      largeZoom = newZoom;
      applyLargeZoomTransform();
    }, { passive: false });

    largePreviewViewport.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isLargePanning = true;
      largePanStart = { x: e.clientX - largePan.x, y: e.clientY - largePan.y };
      largePreviewViewport.style.cursor = "grabbing";
    });
  }

  // Renderizado Individual de Lámina / Obra
  if (btnRenderSingleHeader) {
    btnRenderSingleHeader.onclick = renderCurrentSheetSingle;
  }
  if (btnRenderSingleSidebar) {
    btnRenderSingleSidebar.onclick = renderCurrentSheetSingle;
  }
  if (btnLargeRenderSingle) {
    btnLargeRenderSingle.onclick = renderCurrentSheetSingle;
  }

  // Toast Flotante
  if (btnToastOpenFolder) {
    btnToastOpenFolder.onclick = () => {
      fetch("/api/open_folder", { method: "POST" });
    };
  }
  if (btnToastClose) {
    btnToastClose.onclick = () => {
      if (toastNotification) toastNotification.classList.add("hidden");
    };
  }

  // Clic derecho en esquina para eliminarla
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const c = getCanvasCoords(e.clientX, e.clientY);
    const hit = hitTest(c.x, c.y);
    if (hit && hit.type === "corner") {
      const boxes = getCurrentBoxes();
      const box = boxes[currentBoxIndex];
      if (box.points.length > 3) {
        box.points.splice(hit.index, 1);
        updateCornerUI();
        redraw();
        saveCurrentSheet();
      }
    }
  });

  // Ratón: Interacción con el lienzo
  canvasViewport.addEventListener("mousedown", (e) => {
    // Paneo con botón central o con barra espaciadora
    if (e.button === 1 || isSpacePressed) {
      isPanning = true;
      panStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      canvasViewport.style.cursor = "grabbing";
      return;
    }

    if (e.button !== 0) return; // Solo botón izquierdo

    const c = getCanvasCoords(e.clientX, e.clientY);
    const hit = hitTest(c.x, c.y);

    if (hit && hit.type === "select_box") {
      currentBoxIndex = hit.boxIndex;
      renderPhotoTabs();
      updateCornerUI();
      redraw();
      return;
    }

    if (hit && hit.type === "edge_add") {
      // Clic sobre "+" del borde: insertar punto
      const boxes = getCurrentBoxes();
      const box = boxes[currentBoxIndex];
      const p1 = box.points[hit.edgeIndex];
      const p2 = box.points[(hit.edgeIndex + 1) % box.points.length];
      const newPt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      box.points.splice(hit.edgeIndex + 1, 0, newPt);

      // Iniciar arrastre inmediato de la nueva esquina
      isInteracting = true;
      interactionType = "corner";
      activeCornerIndex = hit.edgeIndex + 1;
      dragStartMouse = c;
      updateCornerUI();
      redraw();
      updateLoupe(e.clientX, e.clientY, newPt[0], newPt[1]);
      return;
    }

    if (hit) {
      isInteracting = true;
      interactionType = hit.type;
      activeCornerIndex = hit.index !== undefined ? hit.index : -1;
      dragStartMouse = c;
      const boxes = getCurrentBoxes();
      initialPointsSnapshot = JSON.parse(JSON.stringify(boxes[currentBoxIndex].points));

      if (hit.type === "corner") {
        updateLoupe(e.clientX, e.clientY, boxes[currentBoxIndex].points[activeCornerIndex][0], boxes[currentBoxIndex].points[activeCornerIndex][1]);
      }
    } else {
      // Clic en fondo vacío -> iniciar paneo
      isPanning = true;
      panStart = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      canvasViewport.style.cursor = "grabbing";
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (isLargePanning) {
      largePan.x = e.clientX - largePanStart.x;
      largePan.y = e.clientY - largePanStart.y;
      applyLargeZoomTransform();
      return;
    }

    if (isPanning) {
      panOffset.x = e.clientX - panStart.x;
      panOffset.y = e.clientY - panStart.y;
      applyZoomPanTransform();
      return;
    }

    const c = getCanvasCoords(e.clientX, e.clientY);

    if (!isInteracting) {
      if (isSpacePressed) {
        canvasViewport.style.cursor = "grab";
        return;
      }
      const hit = hitTest(c.x, c.y);
      if (!hit) canvas.style.cursor = "default";
      else if (hit.type === "corner") canvas.style.cursor = "pointer";
      else if (hit.type === "edge_add") canvas.style.cursor = "copy";
      else if (hit.type === "move_polygon") canvas.style.cursor = "move";
      else canvas.style.cursor = "pointer";
      return;
    }

    const boxes = getCurrentBoxes();
    const box = boxes[currentBoxIndex];
    if (!box || !box.points) return;

    const cw = canvas.width;
    const ch = canvas.height;

    if (interactionType === "corner") {
      // Arrastre libre de una esquina individual con Lupa ampliada
      const normX = Math.max(0, Math.min(1, c.x / cw));
      const normY = Math.max(0, Math.min(1, c.y / ch));
      box.points[activeCornerIndex] = [normX, normY];
      redraw();
      updateLoupe(e.clientX, e.clientY, normX, normY);
    } else if (interactionType === "move_polygon") {
      // Mover polígono completo
      const dx = (c.x - dragStartMouse.x) / cw;
      const dy = (c.y - dragStartMouse.y) / ch;

      for (let i = 0; i < box.points.length; i++) {
        box.points[i][0] = Math.max(0, Math.min(1, initialPointsSnapshot[i][0] + dx));
        box.points[i][1] = Math.max(0, Math.min(1, initialPointsSnapshot[i][1] + dy));
      }
      redraw();
    }
  });

  window.addEventListener("mouseup", () => {
    if (isLargePanning) {
      isLargePanning = false;
      if (largePreviewViewport) largePreviewViewport.style.cursor = "grab";
    }
    hideLoupe();
    if (isPanning) {
      isPanning = false;
      canvasViewport.style.cursor = isSpacePressed ? "grab" : "default";
    }
    if (isInteracting) {
      isInteracting = false;
      interactionType = null;
      activeCornerIndex = -1;
      initialPointsSnapshot = null;
      saveCurrentSheet();
    }
  });

  // Renderizado por Lotes
  btnRenderAll.onclick = async () => {
    await saveCurrentSheet();
    renderModal.classList.remove("hidden");
    progressBar.style.width = "0%";
    progressText.textContent = "Iniciando...";
    progressPercent.textContent = "0%";
    renderLog.innerHTML = "";
    modalActions.classList.add("hidden");

    await fetch("/api/render_all", { method: "POST" });
    pollRenderProgress();
  };

  const btnOpenFolder = document.getElementById("btnOpenFolder");
  if (btnOpenFolder) {
    btnOpenFolder.onclick = () => {
      fetch("/api/open_folder", { method: "POST" });
    };
  }

  const btnRunDeblur = document.getElementById("btnRunDeblur");
  if (btnRunDeblur) {
    btnRunDeblur.onclick = async () => {
      await saveCurrentSheet();
      btnRunDeblur.disabled = true;
      btnRunDeblur.textContent = "🪄 Procesando...";
      showToast("Iniciando deblur con IA en alta resolución...", false);
      try {
        await fetch("/api/run_deblur", { method: "POST" });
        showToast("Procesando deblur en segundo plano. Guardando en 'deblur/'", true);
      } catch (err) {
        showToast("Error al iniciar deblur: " + err.message, false);
      } finally {
        setTimeout(() => {
          btnRunDeblur.disabled = false;
          btnRunDeblur.textContent = "🪄 Deblur";
        }, 3000);
      }
    };
  }

  const btnOpenDeblur = document.getElementById("btnOpenDeblur");
  if (btnOpenDeblur) {
    btnOpenDeblur.onclick = () => {
      fetch("/api/open_deblur_folder", { method: "POST" });
    };
  }

  btnCloseModal.onclick = () => {
    renderModal.classList.add("hidden");
  };
}

async function pollRenderProgress() {
  const resp = await fetch("/api/render_status");
  const state = await resp.json();

  const pct = Math.round((state.current / (state.total || 38)) * 100);
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${state.current} / ${state.total || 38} láminas`;
  progressPercent.textContent = `${pct}%`;

  if (state.log && state.log.length > 0) {
    renderLog.innerHTML = state.log.map(l => `<div>${l}</div>`).join("");
    renderLog.scrollTop = renderLog.scrollHeight;
  }

  if (state.finished) {
    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";
    document.getElementById("modalTitle").textContent = "¡Renderizado Completado con Éxito!";
    document.getElementById("modalDesc").innerHTML = `Todas las fotos recortadas y el catálogo se han guardado en:<br><code style="color: #63b3ed; word-break: break-all; font-size: 11px; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 6px;">C:\\Users\\Study\\Documents\\Olmo's organization\\Archive\\Archivo Obras Jose Luis\\cartulinas\\recortadas\\</code>`;
    modalActions.classList.remove("hidden");
  } else if (state.error) {
    document.getElementById("modalTitle").textContent = "Error durante el renderizado";
    document.getElementById("modalDesc").textContent = state.error;
    modalActions.classList.remove("hidden");
  } else {
    setTimeout(pollRenderProgress, 500);
  }
}

window.onload = init;
