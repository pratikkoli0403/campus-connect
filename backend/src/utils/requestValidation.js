function parsePositiveInt(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function clampString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

module.exports = {
  parsePositiveInt,
  clampString,
};
