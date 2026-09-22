let isMeasuring = false;
let measurementPoints = [];
let measurementOverlay = null;
let measurementSvg = null;
let pointMarkers = [];
let measurementLabel = null;

function ensureOverlay() {
  if (measurementOverlay) return;

  measurementOverlay = document.createElement("div");
  Object.assign(measurementOverlay.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    zIndex: "2147483647",
    pointerEvents: "none",
  });

  measurementSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(measurementSvg.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
  });

  measurementOverlay.appendChild(measurementSvg);
  document.body.appendChild(measurementOverlay);
}

function resizeOverlay() {
  if (!measurementOverlay) return;

  measurementOverlay.style.width =
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) + "px";
  measurementOverlay.style.height =
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) + "px";
}

function createPointMarker(pagePoint) {
  const pointMarker = document.createElement("div");
  Object.assign(pointMarker.style, {
    position: "absolute",
    left: pagePoint.x - 5 + "px",
    top: pagePoint.y - 5 + "px",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#ff3b30",
    border: "2px solid #ffffff",
    boxShadow: "0 0 4px rgba(0,0,0,0.5)",
    pointerEvents: "none",
  });

  measurementOverlay.appendChild(pointMarker);
  pointMarkers.push(pointMarker);
}

function drawMeasurement(startPoint, endPoint) {
  const measurementLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  measurementLine.setAttribute("x1", startPoint.x);
  measurementLine.setAttribute("y1", startPoint.y);
  measurementLine.setAttribute("x2", endPoint.x);
  measurementLine.setAttribute("y2", endPoint.y);
  measurementLine.setAttribute("stroke", "#ff3b30");
  measurementLine.setAttribute("stroke-width", "2");
  measurementLine.setAttribute("stroke-dasharray", "6,4");
  measurementSvg.appendChild(measurementLine);

  const horizontalDisplacement = endPoint.x - startPoint.x;
  const verticalDisplacement = endPoint.y - startPoint.y;
  const distance = Math.hypot(horizontalDisplacement, verticalDisplacement);
  const angle =
    (Math.atan2(verticalDisplacement, horizontalDisplacement) * 180) / Math.PI;
  const midpointX = (startPoint.x + endPoint.x) / 2;
  const midpointY = (startPoint.y + endPoint.y) / 2;

  measurementLabel = document.createElement("div");
  measurementLabel.textContent =
    `${distance.toFixed(1)} px  (angle ${angle.toFixed(1)} degrees)`;
  Object.assign(measurementLabel.style, {
    position: "absolute",
    left: midpointX + 10 + "px",
    top: midpointY - 14 + "px",
    background: "#111827",
    color: "#ffffff",
    font: "12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    padding: "3px 7px",
    borderRadius: "5px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
  });
  measurementOverlay.appendChild(measurementLabel);

  chrome.storage.local.set({
    lastMeasurement: {
      distance: Number(distance.toFixed(2)),
      angle: Number(angle.toFixed(2)),
      horizontalDisplacement: Math.round(horizontalDisplacement),
      verticalDisplacement: Math.round(verticalDisplacement),
    },
  });
}

function clearMarkers() {
  pointMarkers.forEach((pointMarker) => pointMarker.remove());
  pointMarkers = [];

  if (measurementSvg) measurementSvg.innerHTML = "";
  if (measurementLabel) {
    measurementLabel.remove();
    measurementLabel = null;
  }
}

function clearMeasurement() {
  measurementPoints = [];
  clearMarkers();
}

function handlePageClick(event) {
  if (!isMeasuring) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  ensureOverlay();
  resizeOverlay();

  if (measurementPoints.length >= 2) {
    clearMarkers();
    measurementPoints = [];
  }

  const pagePoint = { x: event.pageX, y: event.pageY };
  measurementPoints.push(pagePoint);
  createPointMarker(pagePoint);

  if (measurementPoints.length === 2) {
    drawMeasurement(measurementPoints[0], measurementPoints[1]);
  }
}

document.addEventListener("click", handlePageClick, true);
window.addEventListener("resize", resizeOverlay);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle") {
    isMeasuring = message.enabled;
    document.documentElement.style.cursor = isMeasuring ? "crosshair" : "";
    if (isMeasuring) ensureOverlay();
    sendResponse({ isMeasuring });
  } else if (message.action === "clear") {
    clearMeasurement();
    chrome.storage.local.remove("lastMeasurement");
    sendResponse({ cleared: true });
  } else if (message.action === "getState") {
    sendResponse({ isMeasuring });
  }

  return true;
});
