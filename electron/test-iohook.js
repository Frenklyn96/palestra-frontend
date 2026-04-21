/**
 * STANDALONE TEST - iohook-napi
 *
 * Test standalone della libreria iohook-napi per verificare
 * che funzioni correttamente sul sistema prima di integrare in Electron.
 *
 * COME USARE:
 * 1. npm install iohook-napi
 * 2. node electron/test-iohook.js
 * 3. Premi alcuni tasti e ENTER
 * 4. Scansiona un QR code
 * 5. Ctrl+C per uscire
 *
 * IMPORTANTE: Questo è NodeJS puro, NON Electron
 */

const ioHook = require("uiohook-napi");

console.log("===========================================");
console.log("🧪 uiohook-napi Standalone Test");
console.log("===========================================");
console.log("Platform:", process.platform);
console.log("Node version:", process.version);
console.log("");
console.log("📝 Instructions:");
console.log("- Type some characters slowly (human speed)");
console.log("- Press ENTER");
console.log("- Scan a QR code with your scanner");
console.log("- Press Ctrl+C to exit");
console.log("");
console.log("🎯 Listening for keyboard input...");
console.log("===========================================\n");

let buffer = "";
let lastKeyTime = 0;
const CHAR_TIMEOUT = 100; // ms - scanner is faster than this

// Track statistics
let stats = {
  totalKeys: 0,
  totalScans: 0,
  humanInputs: 0,
  scannerInputs: 0,
};

/**
 * Handler per keypress (caratteri)
 */
ioHook.on("keypress", (event) => {
  stats.totalKeys++;

  const now = Date.now();
  const timeDelta = now - lastKeyTime;

  // Se troppo tempo tra caratteri, è input umano (reset buffer)
  if (timeDelta > CHAR_TIMEOUT && buffer.length > 0) {
    console.log(`[Human Input Detected] "${buffer}" (${timeDelta}ms gap)`);
    stats.humanInputs++;
    buffer = "";
  }

  // Aggiungi carattere al buffer
  const char = String.fromCharCode(event.keychar);
  buffer += char;
  lastKeyTime = now;

  // Debug (commenta per meno verbosità)
  // console.log(`Key: "${char}" | Buffer: "${buffer}" | Delta: ${timeDelta}ms`);
});

/**
 * Handler per keydown (tasti speciali)
 */
ioHook.on("keydown", (event) => {
  // ENTER = keycode 28
  if (event.keycode === 28 || event.rawcode === 13) {
    onEnterPressed();
  }

  // ESC = keycode 1 (opzionale: esci)
  if (event.keycode === 1) {
    console.log("\n[ESC] Exiting...");
    cleanup();
  }
});

/**
 * Gestione ENTER (fine scansione)
 */
function onEnterPressed() {
  if (!buffer || buffer.trim().length === 0) {
    return;
  }

  const code = buffer.trim();
  const now = Date.now();
  const timeSinceFirstChar = now - lastKeyTime;

  // Determina se è scanner o umano basandosi su pattern
  const avgTimePerChar = timeSinceFirstChar / code.length;
  const isScanner = avgTimePerChar < CHAR_TIMEOUT;

  stats.totalScans++;

  if (isScanner) {
    stats.scannerInputs++;
    console.log("\n✅ [SCANNER DETECTED]");
    console.log(`   Code: "${code}"`);
    console.log(`   Length: ${code.length}`);
    console.log(`   Avg time/char: ${avgTimePerChar.toFixed(1)}ms`);
    console.log("");
  } else {
    stats.humanInputs++;
    console.log("\n👤 [HUMAN INPUT]");
    console.log(`   Text: "${code}"`);
    console.log(`   Length: ${code.length}`);
    console.log("");
  }

  buffer = "";
}

/**
 * Cleanup e statistiche
 */
function cleanup() {
  console.log("\n===========================================");
  console.log("📊 Test Statistics:");
  console.log("===========================================");
  console.log(`Total keys pressed: ${stats.totalKeys}`);
  console.log(`Total ENTER presses: ${stats.totalScans}`);
  console.log(`Scanner inputs: ${stats.scannerInputs}`);
  console.log(`Human inputs: ${stats.humanInputs}`);
  console.log("===========================================\n");

  // Stop iohook
  ioHook.stop();

  // Exit
  process.exit(0);
}

/**
 * Gestione errori
 */
ioHook.on("error", (error) => {
  console.error("❌ iohook error:", error);
  console.error("\nPossible issues:");

  if (process.platform === "darwin") {
    console.error("- macOS: Grant Accessibility permissions");
    console.error(
      "  System Preferences > Security & Privacy > Privacy > Accessibility",
    );
  } else if (process.platform === "linux") {
    console.error("- Linux: May require sudo or udev configuration");
    console.error("  Try running with: sudo node electron/test-iohook.js");
  } else if (process.platform === "win32") {
    console.error("- Windows: Ensure no other keyboard hooks are active");
    console.error("- Try running as Administrator");
  }

  cleanup();
});

/**
 * Gestione Ctrl+C
 */
process.on("SIGINT", () => {
  console.log("\n[Ctrl+C] Interrupted by user");
  cleanup();
});

/**
 * Avvia iohook
 */
try {
  ioHook.start();
  console.log("✅ iohook started successfully\n");
} catch (error) {
  console.error("❌ Failed to start iohook:", error);
  console.error("\nTroubleshooting:");
  console.error("1. Reinstall: npm install iohook-napi --force");
  console.error("2. Check platform compatibility");
  console.error("3. Install build tools (Windows: windows-build-tools)");
  process.exit(1);
}

/**
 * Test periodico (ogni 30 secondi mostra stats)
 */
setInterval(() => {
  console.log(
    `\n[Stats] Keys: ${stats.totalKeys} | Scans: ${stats.scannerInputs} | Human: ${stats.humanInputs}`,
  );
}, 30000);
