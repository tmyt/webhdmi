declare const bootstrap: {
  Toast: any;
};

async function requestCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  stream.getTracks().forEach((track) => track.stop());
}

async function createQuirks(audioStream: MediaStream) {
  // Check Source audio requires quirks
  const sourceAudioTrack = audioStream.getAudioTracks()[0];
  if (!sourceAudioTrack) return null;
  const sourceSettings = sourceAudioTrack.getSettings();
  if (
    sourceSettings.sampleRate !== 96000 ||
    // @ts-ignore - このプロパティは存在してる
    sourceSettings.channelCount !== 1
  ) {
    console.log("No quirks required!");
    return sourceAudioTrack;
  }
  // Initialize audio context
  console.log("Initializing audio context");
  const audioContext = new AudioContext({
    sampleRate: 96000,
    latencyHint: "interactive",
  });
  await audioContext.audioWorklet.addModule("/js/ms2109-quirks.js");
  // Install quirks
  console.log("Creating quirks for MS2109...");
  const quirksNode = new AudioWorkletNode(audioContext, "ms2109-quirks");
  const audioSource = audioContext.createMediaStreamSource(audioStream);
  const audioDestination = audioContext.createMediaStreamDestination();
  audioSource.connect(quirksNode);
  quirksNode.connect(audioDestination);
  return audioDestination.stream.getAudioTracks()[0];
}

function getRequestConstraints() {
  const requestConstraints = localStorage.getItem("requestConstraints");
  if (!requestConstraints) return { width: 1920, height: 1080, frameRate: { min: 30, max: 60, ideal: 60 } };
  const [width, height] = requestConstraints.split("x");
  return { width: parseInt(width), height: parseInt(height) };
}

async function openCamera(videoDeviceId: string) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevice = devices.filter(
    (device) => device.deviceId === videoDeviceId
  )[0];
  if (!videoDevice) return null;
  const audioDevice = devices.filter(
    (device) =>
      device.kind === "audioinput" && device.groupId === videoDevice.groupId
  )[0];
  const audioVideoSource = await navigator.mediaDevices.getUserMedia({
    audio: audioDevice
      ? {
          autoGainControl: false,
          deviceId: { exact: audioDevice.deviceId },
          channelCount: { ideal: 2, min: 1 },
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 96000,
        }
      : false,
    video: {
      ...getRequestConstraints(),
      deviceId: { exact: videoDeviceId },
      frameRate: 60,
    },
  });
  return new MediaStream(
    [
      audioVideoSource.getVideoTracks()[0],
      await createQuirks(audioVideoSource),
    ].filter((a) => a) as MediaStreamTrack[]
  );
}

async function updateSelections() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoSelect = document.querySelector<HTMLSelectElement>("#videoinput")!;
  const videoDevices = devices.filter((device) => device.kind === "videoinput");
  videoSelect.innerHTML = "";
  videoDevices.forEach((device) => {
    videoSelect.appendChild(new Option(device.label, device.deviceId));
  });
  if (videoDevices.length > 0) {
    // add divider
    const option = new Option("------");
    option.disabled = true;
    videoSelect.appendChild(option);
    // add reset camera menu
    videoSelect.appendChild(new Option("Reset Camera", "**reset**"));
  }
  videoSelect.value =
    localStorage.getItem("videoinput") || videoDevices[0].deviceId;
}

async function loadCamera(argVideoDeviceId?: string | null) {
  const videoDeviceId =
    document.querySelector<HTMLSelectElement>("#videoinput")!.value;
  const stream = await openCamera(argVideoDeviceId || videoDeviceId);
  const video = document.querySelector<HTMLVideoElement>("video")!;
  video.srcObject = stream;
}

async function closeCamera() {
  const video = document.querySelector<HTMLVideoElement>("video")!;
  const srcObject = video.srcObject;
  video.srcObject = null;
  if (srcObject instanceof MediaStream) {
    srcObject.getTracks().forEach((track) => track.stop());
  }
}

async function queryPermission(name: string) {
  const permission = await navigator.permissions.query({
    name: name as PermissionName,
  });
  return permission.state === "granted";
}

async function main() {
  const videoPermission = await queryPermission("camera");
  const audioPermission = await queryPermission("microphone");

  if (!videoPermission || !audioPermission) {
    await requestCamera();
  }
  await updateSelections();
  await loadCamera(localStorage.getItem("videoinput"));
}

function getCapture() {
  const video = document.querySelector<HTMLVideoElement>("video")!;
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
}

async function captureScreen() {
  const blob = await getCapture();
  if (!blob) return;
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  showToast("#captured");
}

async function saveScreen() {
  const blob = await getCapture();
  if (!blob) return;
  const file = new File([blob], `webhdmi_${Date.now()}.png`, {
    type: "image/png",
  });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

function updateVolumeIcon(volume: number) {
  const volumeIcon = document.querySelector<HTMLElement>("#volume-icon")!;
  if (volume === 0) {
    if (!volumeIcon.classList.contains("ri-volume-mute-fill")) {
      volumeIcon.classList.add("ri-volume-mute-fill");
      volumeIcon.classList.remove("ri-volume-down-fill");
      volumeIcon.classList.remove("ri-volume-up-fill");
    }
  } else if (volume < 0.5) {
    if (!volumeIcon.classList.contains("ri-volume-down-fill")) {
      volumeIcon.classList.add("ri-volume-down-fill");
      volumeIcon.classList.remove("ri-volume-mute-fill");
      volumeIcon.classList.remove("ri-volume-up-fill");
    }
  } else {
    if (!volumeIcon.classList.contains("ri-volume-up-fill")) {
      volumeIcon.classList.add("ri-volume-up-fill");
      volumeIcon.classList.remove("ri-volume-mute-fill");
      volumeIcon.classList.remove("ri-volume-down-fill");
    }
  }
}

function initializeVideoVolume() {
  const video = document.querySelector<HTMLVideoElement>("video")!;
  const volume = document.querySelector<HTMLInputElement>("#volume")!;
  const mutedValue = localStorage.getItem("muted") === "true";
  const volumeValue = parseInt(localStorage.getItem("volume") || "0");
  video.volume = volumeValue / 100;
  if (mutedValue) {
    video.muted = true;
    volume.value = "0";
  } else {
    video.muted = false;
    volume.value = volumeValue.toString();
  }
  updateVolumeIcon(video.muted ? 0 : video.volume);
}

function attachKeyboards() {
  document.addEventListener("keydown", processKeyDown);
  document.addEventListener("keyup", processKeyUp);
}

function detachKeyboards() {
  document.removeEventListener("keydown", processKeyDown);
  document.removeEventListener("keyup", processKeyUp);
}

function showToast(id: `#${string}`, delay = 1500) {
  const toastEl = document.querySelector(id);
  new bootstrap.Toast(toastEl, { delay }).show();
}

function attachEvents() {
  const menu = document.querySelector<HTMLSelectElement>("#menu")!;
  const volumeIcon = document.querySelector<HTMLElement>("#volume-icon")!;
  const volume = document.querySelector<HTMLInputElement>("#volume")!;
  const video = document.querySelector<HTMLVideoElement>("video")!;

  // mute event
  volumeIcon.addEventListener("click", () => {
    if (video.muted) {
      video.muted = false;
      volume.value = localStorage.getItem("volume") || "100";
    } else {
      video.muted = true;
      volume.value = "0";
    }
    localStorage.setItem("muted", video.muted.toString());
    updateVolumeIcon(video.muted ? 0 : video.volume);
  });

  // Synchronize volume
  initializeVideoVolume();

  volume.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    video.muted = false;
    video.volume = target.valueAsNumber / 100;
    localStorage.setItem("volume", target.value);
    localStorage.setItem("muted", "false");
    updateVolumeIcon(video.volume);
  });

  // Synchronize video input
  const videoSelect = document.querySelector<HTMLSelectElement>("#videoinput")!;
  videoSelect.addEventListener("change", async (e) => {
    const target = e.target as HTMLSelectElement;
    if (target.value === "**reset**") {
      const currentItem = localStorage.getItem("videoinput");
      (e.target as HTMLSelectElement).value = currentItem as string;
    } else {
      localStorage.setItem("videoinput", target.value);
    }
    await closeCamera();
    await loadCamera();
  });

  // Connect keyboard
  const connectKeyboard =
    document.querySelector<HTMLElement>("#connect-keyboard");
  const onTransmitError = () => {
    stop();
    detachKeyboards();
    connectKeyboard?.classList.remove("btn-info");
    connectKeyboard?.classList.add("btn-secondary");
    showToast("#ble-error", 2500);
  };
  const onReconnect = () => {
    showToast("#ble-reconnect", 3000);
  };
  const options = {
    onerror: onTransmitError,
    onreconnect: onReconnect,
  };
  connectKeyboard?.addEventListener("click", async () => {
    if (connectKeyboard.classList.contains("btn-info")) {
      stop();
      connectKeyboard.classList.remove("btn-info");
      connectKeyboard.classList.add("btn-secondary");
    } else {
      if (!(await start(options))) {
        return;
      }
      attachKeyboards();
      connectKeyboard.classList.remove("btn-secondary");
      connectKeyboard.classList.add("btn-info");
      showToast("#ble-connected", 2500);
    }
  });

  // Capture to clipboard
  const capture = document.querySelector<HTMLButtonElement>("#capture")!;
  capture.addEventListener("click", async () => {
    await captureScreen();
  });

  // Enter fullscreen
  const fullscreen = document.querySelector<HTMLButtonElement>("#fullscreen")!;
  fullscreen.addEventListener("click", async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  });

  // Hide menu
  let hidingTimer = 0;
  document.addEventListener("mousemove", () => {
    menu.classList.remove("hide");
    clearTimeout(hidingTimer);
    hidingTimer = setTimeout(() => {
      menu.classList.add("hide");
    }, 1500);
  });

  // Shortcut key
  document.addEventListener("keydown", async (e) => {
    if (e.code === "KeyC" && e.altKey) {
      await captureScreen();
    }
  });
  document.addEventListener("keydown", async (e) => {
    if (e.code === "KeyS" && e.altKey && e.shiftKey) {
      await saveScreen();
    }
  });

  // Fullscreen
  document.addEventListener("fullscreenchange", () => {
    const fullscreenIcon =
      document.querySelector<HTMLButtonElement>("#fullscreen-icon")!;
    if (document.fullscreenElement) {
      fullscreenIcon.classList.remove("ri-fullscreen-fill");
      fullscreenIcon.classList.add("ri-fullscreen-exit-fill");
    } else {
      fullscreenIcon.classList.remove("ri-fullscreen-exit-fill");
      fullscreenIcon.classList.add("ri-fullscreen-fill");
    }
  });
}

void main();
attachEvents();
void navigator.serviceWorker.register("/sw.js");
