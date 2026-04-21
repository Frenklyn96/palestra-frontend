from enum import Enum

class ScannerMode(str, Enum):
    DISABLED = "disabled"
    GLOBAL_HOOK = "global-hook"
    HID = "hid"

class WsEventType(str, Enum):
    QR_SCAN = "qr_scan"
    QR_PROCESSED = "qr_processed"
    COUNT_UPDATE = "count_update"
