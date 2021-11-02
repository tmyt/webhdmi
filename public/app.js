async function requestCamera() {
  await navigator
    .mediaDevices
    .getUserMedia({ video: true, audio: true });
}

async function openCamera([audioDeviceId, videoDeviceId]) {
  return await navigator
    .mediaDevices
    .getUserMedia({
      audio: {
        deviceId: audioDeviceId
      },
      video: {
        deviceId: videoDeviceId,
        width: 1920,
        height: 1080
      }
    });
}

async function updateSelections() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoSelect = document.querySelector('#videoinput');
  const audioSelect = document.querySelector('#audioinput');
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  const audioDevices = devices.filter(device => device.kind === 'audioinput');
  videoSelect.innerHTML = '';
  audioSelect.innerHTML = '';
  videoDevices.forEach(device => {
    videoSelect.appendChild(new Option(device.label, device.deviceId));
  });
  audioDevices.forEach(device => {
    audioSelect.appendChild(new Option(device.label, device.deviceId));
  });
  videoSelect.value = localStorage.getItem('videoinput') || videoDevices[0].deviceId;
  audioSelect.value = localStorage.getItem('audioinput') || audioDevices[0].deviceId;
}

async function loadCamera() {
  const audioDeviceId = document.querySelector('#audioinput').value;
  const videoDeviceId = document.querySelector('#videoinput').value;
  const stream = await openCamera([audioDeviceId, videoDeviceId]);
  const video = document.querySelector('video');
  video.srcObject = stream;
}

async function main() {
  const videoPermission = await navigator
    .permissions
    .query({ name: 'camera' });
  const audioPermission = await navigator
    .permissions
    .query({ name: 'microphone' });

  if (videoPermission.state !== 'granted' || audioPermission.state !== 'granted') {
    await requestCamera();
  }
  updateSelections();
  loadCamera();
}

function attachEvents() {
  const menu = document.querySelector('#menu');
  const volume = document.querySelector('#volume');
  const video = document.querySelector('video');

  // Syncronize volume
  volume.value = localStorage.getItem('volume') || 100;
  video.volume = volume.value / 100;
  volume.addEventListener('input', (e) => {
    video.volume = e.target.value / 100;
    localStorage.setItem('volume', e.target.value);
  });

  // Syncronize video input
  const videoSelect = document.querySelector('#videoinput');
  videoSelect.addEventListener('change', (e) => {
    localStorage.setItem('videoinput', e.target.value);
    loadCamera();
  });

  // Syncronize audio input
  const audioSelect = document.querySelector('#audioinput');
  audioSelect.addEventListener('change', (e) => {
    localStorage.setItem('audioinput', e.target.value);
    loadCamera();
  });

  // Hide menu
  let hidingTimer = 0;
  document.addEventListener('mousemove', () => {
    menu.classList.remove('hide');
    clearTimeout(hidingTimer);
    hidingTimer = setTimeout(() => {
      menu.classList.add('hide');
    }, 1500);
  });
}

main();
attachEvents();
navigator.serviceWorker.register('/sw.js');