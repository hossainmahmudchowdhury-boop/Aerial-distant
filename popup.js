const toggleButton = document.getElementById("toggleBtn");
const clearButton = document.getElementById("clearBtn");
const resultElement = document.getElementById("result");

function setButtonState(isMeasuring) {
  toggleButton.textContent = isMeasuring ? "Stop Measuring" : "Start Measuring";
  toggleButton.classList.toggle("active", isMeasuring);
}

function renderMeasurement(measurement) {
  if (!measurement) {
    resultElement.classList.remove("show");
    resultElement.innerHTML = "";
    return;
  }

  resultElement.classList.add("show");
  resultElement.innerHTML =
    `Distance: <b>${measurement.distance} px</b><br>` +
    `Angle: ${measurement.angle}&deg;<br>` +
    `Horizontal: ${measurement.horizontalDisplacement}px, ` +
    `Vertical: ${measurement.verticalDisplacement}px`;
}

async function getActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab;
}

async function initializePopup() {
  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.id) return;

  chrome.storage.local.get("lastMeasurement", (storedData) => {
    renderMeasurement(storedData.lastMeasurement || null);
  });

  chrome.tabs.sendMessage(activeTab.id, { action: "getState" }, (response) => {
    if (chrome.runtime.lastError) {
      toggleButton.disabled = true;
      toggleButton.textContent = "Not available on this page";
      return;
    }

    setButtonState(response && response.isMeasuring);
  });
}

toggleButton.addEventListener("click", async () => {
  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.id) return;

  chrome.tabs.sendMessage(activeTab.id, { action: "getState" }, (response) => {
    const nextMeasuringState = !(response && response.isMeasuring);
    chrome.tabs.sendMessage(
      activeTab.id,
      { action: "toggle", enabled: nextMeasuringState },
      () => setButtonState(nextMeasuringState)
    );
  });
});

clearButton.addEventListener("click", async () => {
  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.id) return;

  chrome.tabs.sendMessage(activeTab.id, { action: "clear" }, () => {
    renderMeasurement(null);
  });
});

initializePopup();
