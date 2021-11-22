const audioContext = new AudioContext({
  sampleRate: 96000,
  latencyHint: "interactive",
});

async function requestCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream.getTracks().forEach(track => track.stop())
}

async function createQuirks(audioStream) {
  // Check Source audio requires quirks
  const sourceAudioTrack = audioStream.getAudioTracks()[0];
  const sourceSettings = sourceAudioTrack.getSettings();
  if (
    sourceSettings.sampleRate !== 96000 ||
    sourceSettings.channelCount !== 1
  ) {
    console.log("No quirks required!");
    return sourceAudioTrack;
  }
  // Install quirks
  console.log("Creating quirks for MS2109...");
  const quirksNode = new AudioWorkletNode(audioContext, "ms2109-quirks");
  const audioSource = audioContext.createMediaStreamSource(audioStream);
  const audioDestination = audioContext.createMediaStreamDestination();
  audioSource.connect(quirksNode);
  quirksNode.connect(audioDestination);
  return audioDestination.stream.getAudioTracks()[0];
}

async function openCamera(videoDeviceId) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevice = devices.filter(device => device.deviceId === videoDeviceId)[0];
  if (!videoDevice) return;
  const auidoDevice = devices.filter(device => device.kind === "audioinput" && device.groupId === videoDevice.groupId)[0];
  const audioVideoSource = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: auidoDevice.deviceId,
      sampleRate: 96000,
    },
    video: {
      deviceId: videoDeviceId,
      width: 1920,
      height: 1080,
      frameRate: 60,
    },
  });
  return new MediaStream([
    audioVideoSource.getVideoTracks()[0],
    await createQuirks(audioVideoSource),
  ]);
}

async function updateSelections() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoSelect = document.querySelector("#videoinput");
  const videoDevices = devices.filter((device) => device.kind === "videoinput");
  videoSelect.innerHTML = "";
  videoDevices.forEach((device) => {
    videoSelect.appendChild(new Option(device.label, device.deviceId));
  });
  videoSelect.value =
    localStorage.getItem("videoinput") || videoDevices[0].deviceId;
}

async function loadCamera(argVideoDeviceId) {
  const videoDeviceId = document.querySelector("#videoinput").value;
  const stream = await openCamera(argVideoDeviceId || videoDeviceId);
  const video = document.querySelector("video");
  video.srcObject = stream;
}

async function queryPermission(name) {
  const permission = await navigator.permissions.query({ name });
  return permission.state === "granted";
}

async function main() {
  // Initialize audio context
  await audioContext.audioWorklet.addModule("/js/ms2109-quirks.js");

  const videoPermission = await queryPermission("camera");
  const audioPermission = await queryPermission("microphone");

  if (!videoPermission || !audioPermission) {
    await requestCamera();
  }
  updateSelections();
  loadCamera(localStorage.getItem("videoinput"));
}

function captureScreen() {
  const video = document.querySelector("video");
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  }, "image/png");
  var toastEl = document.querySelector('.toast');
  (new bootstrap.Toast(toastEl, { delay: 1500 })).show();
}

function updateVolumeIcon(volume) {
  const volumeIcon = document.querySelector("#volume-icon");
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

function attachEvents() {
  const menu = document.querySelector("#menu");
  const volume = document.querySelector("#volume");
  const video = document.querySelector("video");

  // Syncronize volume
  volume.value = localStorage.getItem("volume") || 100;
  video.volume = volume.value / 100;
  updateVolumeIcon(video.volume);
  volume.addEventListener("input", (e) => {
    video.volume = e.target.value / 100;
    localStorage.setItem("volume", e.target.value);
    updateVolumeIcon(video.volume);
  });

  // Syncronize video input
  const videoSelect = document.querySelector("#videoinput");
  videoSelect.addEventListener("change", (e) => {
    localStorage.setItem("videoinput", e.target.value);
    loadCamera();
  });

  // Capture to clipboard
  const capture = document.querySelector("#capture");
  capture.addEventListener("click", () => {
    captureScreen();
  });

  // Enter fullscreen
  const fullscreen = document.querySelector("#fullscreen");
  fullscreen.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
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
  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyC" && e.altKey) {
      captureScreen();
    }
  });

  // Fullscreen
  document.addEventListener("fullscreenchange", () => {
    const fullscreenIcon = document.querySelector("#fullscreen-icon");
    if (document.fullscreenElement) {
      fullscreenIcon.classList.remove("ri-fullscreen-fill");
      fullscreenIcon.classList.add("ri-fullscreen-exit-fill");
    } else {
      fullscreenIcon.classList.remove("ri-fullscreen-exit-fill");
      fullscreenIcon.classList.add("ri-fullscreen-fill");
    }
  });
}

main();
attachEvents();
navigator.serviceWorker.register("/js/sw.js");
