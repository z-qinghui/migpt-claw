import { promises as fs } from "node:fs";
import { join } from "node:path";
function getDataDir(subdir) {
  const baseDir = join(process.cwd(), ".migpt");
  if (subdir) {
    return join(baseDir, subdir);
  }
  return baseDir;
}
async function readJSON(filename) {
  try {
    const filepath = join(getDataDir(), filename);
    const content = await fs.readFile(filepath, "utf-8");
    return JSON.parse(content);
  } catch {
    return void 0;
  }
}
async function writeJSON(filename, data) {
  try {
    const dir = getDataDir();
    await fs.mkdir(dir, { recursive: true });
    const filepath = join(dir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("\u274C \u5199\u5165\u6587\u4EF6\u5931\u8D25:", err.message);
  }
}
async function fileExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}
async function readFile(filepath) {
  return fs.readFile(filepath);
}
async function writeFile(filepath, content) {
  const dir = join(filepath, "..");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filepath, content);
}
export {
  fileExists,
  getDataDir,
  readFile,
  readJSON,
  writeFile,
  writeJSON
};
//# sourceMappingURL=io.js.map