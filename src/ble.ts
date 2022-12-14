const serviceUuid = "45561481-c28a-43f8-8349-6ffec180c4b5";
const characteristicUuid = "45561481-c28a-43f8-8349-6ffec180c4b5";

type ConnectOptions = {
  onerror: () => void;
  onreconnect: () => void;
};

let globalCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let globalOptions: ConnectOptions | null = null;
let globalHeatbeatInterval: number | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function start(options: ConnectOptions): Promise<boolean> {
  globalOptions = null;
  console.log("start");
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: "BLEHID-Bridge" }],
    optionalServices: [serviceUuid],
  });
  if (device === undefined) return false;
  const characteristic = await connect(device);
  if (characteristic === null) return false;
  globalCharacteristic = characteristic;
  globalOptions = options;
  ongoing = Promise.resolve();
  globalHeatbeatInterval = setInterval(sendHeartbeat, 2000);
  transmit([0, 0, 0, 0, 0, 0, 0]);
  return true;
}

function stop() {
  if (!globalCharacteristic) return;
  clearInterval(globalHeatbeatInterval!);
  globalCharacteristic.service.device.gatt?.disconnect();
  globalCharacteristic = null;
  globalHeatbeatInterval = null;
}

const pressed: Array<number> = [];

function promiseSource(fn: () => Promise<void>): Promise<void> {
  return new Promise(async (resolve) => {
    await fn();
    resolve(undefined);
  });
}

let ongoing = Promise.resolve();

async function connect(device: BluetoothDevice) {
  for (let i = 0; i < 10; ++i) {
    console.log("connecting");
    try {
      const server = await device.gatt?.connect();
      if (!server) throw new Error("Cound not connect to device");
      const service = await server.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(
        characteristicUuid
      );
      console.log("connected");
      return characteristic;
    } catch (e: any) {
      console.log("ERROR: " + e.message);
    }
    await sleep(333);
  }
  return null;
}

function transmit(payload: number[]) {
  // fill up to 7 bytes
  while (payload.length < 7) {
    payload.push(0);
  }
  const current = ongoing;
  ongoing = promiseSource(async () => {
    if (!globalCharacteristic) return;
    await current;
    try {
      await globalCharacteristic.writeValueWithoutResponse(
        new Uint8Array(payload)
      );
    } catch (e: any) {
      if ((e.name === "NetworkError")) {
        console.log("try to reconnect");
        globalOptions?.onreconnect();
        const device = globalCharacteristic.service.device;
        if (!(await connect(device))) {
          globalOptions?.onerror();
        } else {
          transmit(payload);
        }
      }
    }
  });
}

function sendHeartbeat() {
  transmit([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
}

function processKeyDown(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat) return;
  const hidKey = translate(event.code);
  if (hidKey === undefined) return;
  if (isModifier(event.code) === false) {
    pressed.push(hidKey);
  }
  if (pressed.length > 6) {
    pressed.shift();
  }
  const modifier = translateModifier(event);
  transmit([modifier, ...pressed]);
}

function processKeyUp(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
  const hidKey = translate(event.code);
  if (hidKey === undefined) return;
  const index = pressed.indexOf(hidKey);
  if (index > -1) {
    pressed.splice(index, 1);
  }
  const modifier = translateModifier(event);
  transmit([modifier, ...pressed]);
}
