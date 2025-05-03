const fs = require("fs");
const path = require("path");

const ADMINS_PATH = path.join(__dirname, "../admins.json");

function loadAdmins() {
  if (!fs.existsSync(ADMINS_PATH)) return [];
  return JSON.parse(fs.readFileSync(ADMINS_PATH, "utf-8"));
}

function isAdmin(ctx) {
  const admins = loadAdmins();
  return admins.some(admin => admin.id === ctx.from.id);
}

module.exports = { isAdmin };