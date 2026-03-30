import assert from "node:assert/strict";

function normalizePlan(plan) {
  const raw = String(plan || "free").toLowerCase();
  if (["basic", "pro", "csc", "free"].includes(raw)) return raw;
  return "free";
}

function planLimitFor(plan) {
  const normalized = normalizePlan(plan);
  if (normalized === "basic") return 3;
  if (normalized === "pro") return 100;
  if (normalized === "csc") return Number.POSITIVE_INFINITY;
  return 1;
}

function plantStatusValue(plant) {
  const raw = plant?.status ? String(plant.status).toLowerCase() : "";
  if (["active", "ended", "archived", "deleted"].includes(raw)) return raw;
  if (plant?.archived === true) return "archived";
  if (plant?.is_active === true) return "active";
  return "ended";
}

assert.equal(normalizePlan("PRO"), "pro");
assert.equal(normalizePlan("weird"), "free");
assert.equal(planLimitFor("free"), 1);
assert.equal(planLimitFor("basic"), 3);
assert.equal(planLimitFor("pro"), 100);
assert.equal(planLimitFor("csc"), Number.POSITIVE_INFINITY);
assert.equal(plantStatusValue({ status: "ended", archived: true, is_active: true }), "ended");
assert.equal(plantStatusValue({ archived: true }), "archived");
assert.equal(plantStatusValue({ is_active: true }), "active");
assert.equal(plantStatusValue({}), "ended");

console.log("desktop-ui smoke status tests passed");
