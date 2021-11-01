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

main();
navigator.serviceWorker.register('/sw.js');