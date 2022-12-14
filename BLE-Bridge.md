BLE-Bridge
====

This is BLE-Bridge for HID keyboard device. Transmit your keyboard input into target device via BLE.

## BLE Protocol

### BLE Service

* Service UUID: `45561481-c28a-43f8-8349-6ffec180c4b5`

### BLE Characteristic

* Characteristic UUID: `45561482-c28a-43f8-8349-6ffec180c4b5`

Accepts 7 bytes data from client.

First 1byte is modifier key same as HID report.
Rest 6bytes are keycodes same as HID report.

```
| Modifier | Keycode | Keycode | Keycode | Keycode | Keycode | Keycode |
```

Packet starts with 0xff is ignored for heartbeat purpose.

```
| 0xFF | any | any | any | any | any | any |
```