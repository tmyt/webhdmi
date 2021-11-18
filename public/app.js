async function requestCamera() {
  await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
  const audioContext = new AudioContext({
    sampleRate: 96000,
    latencyHint: "interactive",
  });
  await audioContext.audioWorklet.addModule("ms2109-quirks.js");
  const quirksNode = new AudioWorkletNode(audioContext, "ms2109-quirks");
  const audioSource = audioContext.createMediaStreamSource(audioStream);
  const audioDestination = audioContext.createMediaStreamDestination();
  audioSource.connect(quirksNode);
  quirksNode.connect(audioDestination);
  return audioDestination.stream.getAudioTracks()[0];
}

async function openCamera([audioDeviceId, videoDeviceId]) {
  if (!audioDeviceId || !videoDeviceId) return;
  const videoSource = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      deviceId: videoDeviceId,
      width: 1920,
      height: 1080,
      frameRate: 60,
    },
  });
  const audioSource = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: audioDeviceId,
      sampleRate: 96000,
    },
    video: false,
  });
  videoSource.addTrack(await createQuirks(audioSource));
  return videoSource;
}

async function updateSelections() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoSelect = document.querySelector("#videoinput");
  const audioSelect = document.querySelector("#audioinput");
  const videoDevices = devices.filter((device) => device.kind === "videoinput");
  const audioDevices = devices.filter((device) => device.kind === "audioinput");
  videoSelect.innerHTML = "";
  audioSelect.innerHTML = "";
  videoDevices.forEach((device) => {
    videoSelect.appendChild(new Option(device.label, device.deviceId));
  });
  audioDevices.forEach((device) => {
    audioSelect.appendChild(new Option(device.label, device.deviceId));
  });
  videoSelect.value =
    localStorage.getItem("videoinput") || videoDevices[0].deviceId;
  audioSelect.value =
    localStorage.getItem("audioinput") || audioDevices[0].deviceId;
}

async function loadCamera(argAudioDeviceId, argVideoDeviceId) {
  const audioDeviceId = document.querySelector("#audioinput").value;
  const videoDeviceId = document.querySelector("#videoinput").value;
  const stream = await openCamera([
    argAudioDeviceId || audioDeviceId,
    argVideoDeviceId || videoDeviceId,
  ]);
  const video = document.querySelector("video");
  video.srcObject = stream;
}

async function queryPermission(name) {
  const permission = await navigator.permissions.query({ name });
  return permission.state === "granted";
}

async function main() {
  const videoPermission = await queryPermission("camera");
  const audioPermission = await queryPermission("microphone");

  if (!videoPermission || !audioPermission) {
    await requestCamera();
  }
  updateSelections();
  loadCamera(
    localStorage.getItem("audioinput"),
    localStorage.getItem("videoinput")
  );
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
}

function attachEvents() {
  const menu = document.querySelector("#menu");
  const volume = document.querySelector("#volume");
  const video = document.querySelector("video");

  // Syncronize volume
  volume.value = localStorage.getItem("volume") || 100;
  video.volume = volume.value / 100;
  volume.addEventListener("input", (e) => {
    video.volume = e.target.value / 100;
    localStorage.setItem("volume", e.target.value);
  });

  // Syncronize video input
  const videoSelect = document.querySelector("#videoinput");
  videoSelect.addEventListener("change", (e) => {
    localStorage.setItem("videoinput", e.target.value);
    loadCamera();
  });

  // Syncronize audio input
  const audioSelect = document.querySelector("#audioinput");
  audioSelect.addEventListener("change", (e) => {
    localStorage.setItem("audioinput", e.target.value);
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
}

main();
attachEvents();
navigator.serviceWorker.register("/sw.js");
