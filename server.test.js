import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { createServer as createAppServer } from "./server.js";

let temporaryDirectory;
let dataFile;
let server;
let baseUrl;

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "zanziturk-test-"));
  dataFile = path.join(temporaryDirectory, "reservations.json");
  server = createAppServer({ dataFile });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(temporaryDirectory, { recursive: true, force: true });
});

test("serves the restaurant site from the backend", async () => {
  const response = await fetch(baseUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /Zanzi/);
});

test("valid reservation is saved and returned with a pending status", async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Guest", email: "guest@example.com", date: "2099-10-20", guests: "4" })
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.reservation.name, "Test Guest");
  assert.equal(result.reservation.guests, "4");
  assert.equal(result.reservation.status, "pending");

  const stored = JSON.parse(await readFile(dataFile, "utf8"));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, result.reservation.id);
});

test("rejects invalid reservation details without saving them", async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A", email: "not-an-email", date: "2020-99-99", guests: "88" })
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.match(result.error, /Name must be/);
  assert.equal(JSON.parse(await readFile(dataFile, "utf8")).length, 1);
});

test("does not expose the private reservation store as a public file", async () => {
  const response = await fetch(`${baseUrl}/data/reservations.json`);
  assert.equal(response.status, 404);
});