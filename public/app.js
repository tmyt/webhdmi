async function requestCamera() {
  await navigator
    .mediaDevices
    .getUserMedia({ video: true, audio: true })
}

async function loadCamera() {
  const devices = await navigator
    .mediaDevices
    .enumerateDevices();
  const compositeDevice = devices
    .find(device => device.label.includes("USB3.0 HD VIDEO"));
  const compositeDevices = devices.filter(device => device.groupId === compositeDevice.groupId);
  const audioDevice = compositeDevices.find(device => device.kind === "audioinput");
  const videoDevice = compositeDevices.find(device => device.kind === "videoinput");
  const stream = await navigator
    .mediaDevices
    .getUserMedia({
      audio: {
        deviceId: audioDevice.deviceId
      },
      video: {
        deviceId: videoDevice.deviceId,
        width: 1920,
        height: 1080
      }
    });
  const video = document.querySelector('video');
  video.srcObject = stream;
  video.play();
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

  // Hide menu
  let hidingTimer = 0;
  document.addEventListener('mousemove', () => {
    menu.classList.remove('hide');
    clearTimeout(hidingTimer);
    hidingTimer = setTimeout(() => {
      menu.classList.add('hide');
    }, 3000);
  })
}

main();
attachEvents();
navigator.serviceWorker.register('/sw.js');