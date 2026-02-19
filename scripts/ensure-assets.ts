import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { resolve, extname } from "path";
import { execSync } from "child_process";

const ASSETS_DIR = resolve(process.cwd(), "attached_assets");

const PLACEHOLDER_1PX_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
    "Nl7BcQAAAABJRU5ErkJggg==",
  "base64"
);

const PLACEHOLDER_1PX_JPG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH" +
    "BwYIDAoMCwsKCwsLDA4SEA8OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBT/2wBDAQME" +
    "BAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU" +
    "FBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/" +
    "EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAA" +
    "AAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=",
  "base64"
);

const REFERENCED_ASSETS = [
  "powerplungelogo_1767907611722.png",
  "powerplungeicon_1770929882628.png",
  "power_plunge_1hp_chiller_mockup_1767902865789.png",
  "power_plunge_portable_tub_mockup_1767902865790.png",
  "hero_1767910221674.jpg",
];

function ensureAssets(): void {
  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
    console.log("[ensure-assets] Created attached_assets/ directory");
  }

  let created = 0;
  for (const filename of REFERENCED_ASSETS) {
    const filePath = resolve(ASSETS_DIR, filename);
    if (!existsSync(filePath)) {
      const ext = extname(filename).toLowerCase();
      const placeholder =
        ext === ".jpg" || ext === ".jpeg"
          ? PLACEHOLDER_1PX_JPG
          : PLACEHOLDER_1PX_PNG;
      writeFileSync(filePath, placeholder);
      created++;
      console.log(`[ensure-assets] Created placeholder: ${filename}`);
    }
  }

  if (created === 0) {
    console.log("[ensure-assets] All referenced assets already exist");
  } else {
    console.log(
      `[ensure-assets] Created ${created} placeholder asset(s). Replace with real images for full UI.`
    );
  }
}

ensureAssets();
