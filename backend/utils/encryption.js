const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn("WARNING: ENCRYPTION_KEY not set. Sensitive data will be stored without encryption.");
    return null;
  }
  return crypto.createHash("sha256").update(key).digest();
}

function encrypt(text) {
  const key = getEncryptionKey();
  if (!key) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(ciphertext) {
  const key = getEncryptionKey();
  if (!key) return ciphertext;

  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext; // Not encrypted

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}

const SENSITIVE_PATHS = [
  ["imap", "password"],
  ["smtp", "password"],
  ["caldav", "password"],
];

function encryptSettings(settings) {
  if (!settings || typeof settings !== "object") return settings;
  const result = JSON.parse(JSON.stringify(settings));
  for (const [section, field] of SENSITIVE_PATHS) {
    if (result[section] && result[section][field]) {
      result[section][field] = encrypt(result[section][field]);
    }
  }
  return result;
}

function decryptSettings(settings) {
  if (!settings || typeof settings !== "object") return settings;
  const result = JSON.parse(JSON.stringify(settings));
  for (const [section, field] of SENSITIVE_PATHS) {
    if (result[section] && result[section][field]) {
      try {
        result[section][field] = decrypt(result[section][field]);
      } catch {
        // If decryption fails, return as-is
      }
    }
  }
  return result;
}

module.exports = { encrypt, decrypt, encryptSettings, decryptSettings };
