import asyncio
import threading
import time
import re
import urllib.request
import json
import subprocess
from core.constants import GUID_RE, WM_INPUT, WM_DESTROY, RI_KEY_BREAK, RIDEV_INPUTSINK, RIDEV_REMOVE, RID_INPUT, RIDI_DEVICENAME, RIM_TYPEKEYBOARD, PM_REMOVE, HWND_MESSAGE
from core.enums import ScannerMode
import ctypes
import ctypes.wintypes as wt

class ScannerManager:
    def __init__(self):
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None
        self.device: dict | None = None
        self.mode = ScannerMode.DISABLED
        self.last_scan: dict | None = None
        
        # Callbacks
        self.on_scan_callback = None

    def set_on_scan_callback(self, callback):
        self.on_scan_callback = callback

    def get_last_scan(self, timeout_seconds=30):
        if not self.last_scan:
            return None
        if time.time() - self.last_scan["ts"] > timeout_seconds:
            self.last_scan = None
            return None
        scan = self.last_scan
        self.last_scan = None
        return scan

    def broadcast_scan(self, code: str):
        self.last_scan = {"code": code, "ts": time.time()}
        if self.on_scan_callback:
            self.on_scan_callback(code)

    def normalize_qr(self, raw: str) -> str:
        return raw.strip().replace("'", "-").replace("[", "-")

    def _start_keyboard_scanner(self):
        try:
            import keyboard
        except ImportError:
            print("[QR Scanner] 'keyboard' module not available, skipping global hook.")
            return

        buf: list[str] = []
        last_time = [time.monotonic()]
        CHAR_TIMEOUT = 0.15
        in_scan = [False]

        def on_key(event):
            if event.event_type != "down":
                return in_scan[0]
            now = time.monotonic()
            delta = now - last_time[0]
            last_time[0] = now
            if delta > CHAR_TIMEOUT:
                buf.clear()
                in_scan[0] = False
            if event.name == "enter":
                raw = "".join(buf).strip()
                buf.clear()
                in_scan[0] = False
                if not raw:
                    return False
                code = self.normalize_qr(raw)
                if GUID_RE.match(code):
                    print(f"[QR Scanner] Detected GUID: {code}")
                    self.broadcast_scan(code)
                    return True
                return False
            elif event.name and len(event.name) == 1:
                buf.append(event.name)
                if len(buf) >= 2:
                    in_scan[0] = True
                return in_scan[0]
            return False

        keyboard.hook(on_key, suppress=True)
        print("[QR Scanner] Global keyboard hook active.")
        while not self.stop_event.is_set():
            time.sleep(0.1)
        keyboard.unhook_all()
        print("[QR Scanner] Global keyboard hook removed.")

    def _start_hid_scanner(self, vendor_id, product_id):
        user32  = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        class RAWINPUTDEVICELIST(ctypes.Structure):
            _fields_ = [("hDevice", wt.HANDLE), ("dwType", wt.DWORD)]

        class RAWINPUTDEVICE(ctypes.Structure):
            _fields_ = [
                ("usUsagePage", wt.USHORT),
                ("usUsage",     wt.USHORT),
                ("dwFlags",     wt.DWORD),
                ("hwndTarget",  wt.HWND),
            ]

        class RAWINPUTHEADER(ctypes.Structure):
            _fields_ = [
                ("dwType",  wt.DWORD),
                ("dwSize",  wt.DWORD),
                ("hDevice", wt.HANDLE),
                ("wParam",  wt.WPARAM),
            ]

        class RAWKEYBOARD(ctypes.Structure):
            _fields_ = [
                ("MakeCode",         wt.USHORT),
                ("Flags",            wt.USHORT),
                ("Reserved",         wt.USHORT),
                ("VKey",             wt.USHORT),
                ("Message",          wt.UINT),
                ("ExtraInformation", wt.ULONG),
            ]

        class _INPUT_UNION(ctypes.Union):
            _fields_ = [("keyboard", RAWKEYBOARD), ("_pad", ctypes.c_byte * 64)]

        class RAWINPUT(ctypes.Structure):
            _fields_ = [("header", RAWINPUTHEADER), ("data", _INPUT_UNION)]

        class MSG(ctypes.Structure):
            _fields_ = [
                ("hwnd",    wt.HWND),
                ("message", wt.UINT),
                ("wParam",  wt.WPARAM),
                ("lParam",  wt.LPARAM),
                ("time",    wt.DWORD),
                ("pt",      ctypes.c_long * 2),
            ]

        WNDPROCTYPE = ctypes.WINFUNCTYPE(ctypes.c_long, wt.HWND, wt.UINT, wt.WPARAM, wt.LPARAM)

        class WNDCLASSEX(ctypes.Structure):
            _fields_ = [
                ("cbSize",        wt.UINT), ("style",         wt.UINT),
                ("lpfnWndProc",   WNDPROCTYPE), ("cbClsExtra",    ctypes.c_int),
                ("cbWndExtra",    ctypes.c_int), ("hInstance",     wt.HINSTANCE),
                ("hIcon",         wt.HICON), ("hCursor",       wt.HANDLE),
                ("hbrBackground", wt.HBRUSH), ("lpszMenuName",  wt.LPCWSTR),
                ("lpszClassName", wt.LPCWSTR), ("hIconSm",       wt.HICON),
            ]

        vid_str = f"VID_{vendor_id:04X}"
        pid_str = f"PID_{product_id:04X}"
        _handle_cache: dict = {}

        def _is_target(hdevice) -> bool:
            cached = _handle_cache.get(hdevice)
            if cached is not None: return cached
            sz = wt.UINT(0)
            r = user32.GetRawInputDeviceInfoW(hdevice, RIDI_DEVICENAME, None, ctypes.byref(sz))
            if sz.value == 0:
                _handle_cache[hdevice] = False
                return False
            nbuf = ctypes.create_unicode_buffer(sz.value)
            user32.GetRawInputDeviceInfoW(hdevice, RIDI_DEVICENAME, nbuf, ctypes.byref(sz))
            name = nbuf.value.upper()
            match = vid_str in name and pid_str in name
            _handle_cache[hdevice] = match
            if match: print(f"[QR Scanner] Device confirmed: {nbuf.value}")
            return match

        VK_CHAR = {
            **{i: str(i - 0x30) for i in range(0x30, 0x3A)},
            **{i: chr(i) for i in range(0x41, 0x5B)},
            0xBD: "-", 0xBE: ".", 0xBA: ";", 0xBF: "/", 0xC0: "`", 0xDB: "[", 0xDC: "\\", 0xDD: "]", 0xDE: "'"
        }
        VK_CHAR_SHIFT = {
            0x30: ")", 0x31: "!", 0x32: "@", 0x33: "#", 0x34: "$", 0x35: "%", 0x36: "^", 0x37: "&", 0x38: "*", 0x39: "(",
            **{i: chr(i) for i in range(0x41, 0x5B)},
            0xBD: "_", 0xBE: ">",
        }

        buf: list[str] = []
        shift_down = False
        last_code  = [None]
        last_time  = [0.0]
        DUPLICATE_THRESHOLD = 2.0

        def wnd_proc(hwnd, msg, wparam, lparam):
            nonlocal shift_down
            if msg == WM_INPUT:
                sz = wt.UINT(0)
                user32.GetRawInputData(lparam, RID_INPUT, None, ctypes.byref(sz), ctypes.sizeof(RAWINPUTHEADER))
                if sz.value == 0: return user32.DefWindowProcW(hwnd, msg, wparam, lparam)
                raw_buf = ctypes.create_string_buffer(sz.value)
                if user32.GetRawInputData(lparam, RID_INPUT, raw_buf, ctypes.byref(sz), ctypes.sizeof(RAWINPUTHEADER)) == 0:
                    return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

                raw = ctypes.cast(raw_buf, ctypes.POINTER(RAWINPUT)).contents
                if raw.header.dwType == RIM_TYPEKEYBOARD and _is_target(raw.header.hDevice):
                    kb = raw.data.keyboard
                    vk = kb.VKey
                    is_break = bool(kb.Flags & RI_KEY_BREAK)

                    if vk in (0x10, 0xA0, 0xA1): shift_down = not is_break
                    elif not is_break:
                        if vk == 0x0D:
                            raw_str = "".join(buf).strip()
                            buf.clear()
                            if raw_str:
                                code = self.normalize_qr(raw_str)
                                if GUID_RE.match(code):
                                    now = time.monotonic()
                                    if code != last_code[0] or now - last_time[0] >= DUPLICATE_THRESHOLD:
                                        last_code[0] = code
                                        last_time[0] = now
                                        self.broadcast_scan(code)
                        else:
                            ch = (VK_CHAR_SHIFT if shift_down else VK_CHAR).get(vk)
                            if ch: buf.append(ch)
                return user32.DefWindowProcW(hwnd, msg, wparam, lparam)
            elif msg == WM_DESTROY:
                user32.PostQuitMessage(0)
                return 0
            return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

        wnd_proc_c = WNDPROCTYPE(wnd_proc)

        hinstance  = kernel32.GetModuleHandleW(None)
        class_name = f"QRScannerRawInput_{vendor_id:04x}{product_id:04x}"

        wc = WNDCLASSEX()
        wc.cbSize        = ctypes.sizeof(WNDCLASSEX)
        wc.lpfnWndProc   = wnd_proc_c
        wc.hInstance     = hinstance
        wc.lpszClassName = class_name
        user32.RegisterClassExW(ctypes.byref(wc))

        hwnd = user32.CreateWindowExW(0, class_name, "QRScannerWnd", 0, 0, 0, 0, 0, None, None, hinstance, None)
        if not hwnd:
            user32.UnregisterClassW(class_name, hinstance)
            return

        rid = RAWINPUTDEVICE()
        rid.usUsagePage = 1
        rid.usUsage     = 6
        rid.dwFlags     = RIDEV_INPUTSINK
        rid.hwndTarget  = hwnd

        if not user32.RegisterRawInputDevices(ctypes.byref(rid), 1, ctypes.sizeof(RAWINPUTDEVICE)):
            user32.DestroyWindow(hwnd)
            user32.UnregisterClassW(class_name, hinstance)
            return

        print(f"[QR Scanner] Raw Input attivo — in ascolto su VID={vendor_id:04x} PID={product_id:04x}")

        msg_s = MSG()
        while not self.stop_event.is_set():
            while user32.PeekMessageW(ctypes.byref(msg_s), None, 0, 0, PM_REMOVE):
                user32.TranslateMessage(ctypes.byref(msg_s))
                user32.DispatchMessageW(ctypes.byref(msg_s))
            time.sleep(0.01)

        rid.dwFlags    = RIDEV_REMOVE
        rid.hwndTarget = None
        user32.RegisterRawInputDevices(ctypes.byref(rid), 1, ctypes.sizeof(RAWINPUTDEVICE))
        user32.DestroyWindow(hwnd)
        user32.UnregisterClassW(class_name, hinstance)
        print("[QR Scanner] Raw Input fermato.")

    def restart_scanner(self, vendor_id: int | None = None, product_id: int | None = None, mode: str = "global-hook"):
        with self.lock:
            self.stop_event.set()
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=2.0)
            self.stop_event = threading.Event()
            if vendor_id is not None and product_id is not None:
                self.mode = ScannerMode.HID
                self.thread = threading.Thread(target=self._start_hid_scanner, args=(vendor_id, product_id), daemon=True)
            else:
                self.mode = ScannerMode.GLOBAL_HOOK
                self.thread = threading.Thread(target=self._start_keyboard_scanner, daemon=True)
            self.thread.start()

    def stop_scanner(self):
        with self.lock:
            self.stop_event.set()
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=2.0)
            self.thread = None
            self.mode = ScannerMode.DISABLED
            self.device = None

    def list_input_devices(self):
        import pywinusb.hid as _hid
        result_map: dict[tuple, dict] = {}
        try:
            for d in _hid.HidDeviceFilter().get_devices():
                vid, pid = d.vendor_id, d.product_id
                if vid == 0 and pid == 0: continue
                key = (vid, pid)
                if key in result_map: continue
                product = (d.product_name or "").strip()
                manufacturer = (d.vendor_name or "").strip()
                if manufacturer.startswith("@") or "%" in manufacturer or manufacturer.lower() in ("unknown manufacturer", "unknown"):
                    manufacturer = ""
                if product.startswith("@") or "%" in product:
                    product = ""
                label = " ".join(filter(None, [manufacturer, product])) or f"HID {vid:04x}:{pid:04x}"
                result_map[key] = {
                    "vendorId": vid, "productId": pid,
                    "manufacturer": manufacturer, "product": product,
                    "serialNumber": "", "path": str(getattr(d, "device_path", "")),
                    "usagePage": 0, "usage": 0, "label": label,
                }
        except Exception as e: print(f"[input-devices] pywinusb error: {e}")

        try:
            ps_cmd = "Get-PnpDevice -Class HIDClass -Status OK | Select-Object FriendlyName,DeviceID | ConvertTo-Json -Compress"
            out = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd], capture_output=True, text=True, timeout=12)
            if out.returncode == 0 and out.stdout.strip():
                raw = json.loads(out.stdout)
                if isinstance(raw, dict): raw = [raw]
                for dev in raw:
                    name = (dev.get("FriendlyName") or "").strip()
                    dev_id = dev.get("DeviceID", "")
                    m = re.search(r"VID_([0-9A-Fa-f]{4})&PID_([0-9A-Fa-f]{4})", dev_id)
                    if not m: continue
                    vid, pid = int(m.group(1), 16), int(m.group(2), 16)
                    key = (vid, pid)
                    if key not in result_map:
                        label = name or f"HID {vid:04x}:{pid:04x}"
                        result_map[key] = {
                            "vendorId": vid, "productId": pid, "manufacturer": "", "product": name,
                            "serialNumber": "", "path": dev_id, "usagePage": 0, "usage": 0, "label": label,
                        }
                    else:
                        entry = result_map[key]
                        if name and (not entry["product"] or entry["label"].startswith("HID ")):
                            entry["product"] = name
                            entry["label"] = name
        except Exception as e: print(f"[input-devices] WMI error: {e}")
        
        return sorted(result_map.values(), key=lambda x: x["label"].lower())

