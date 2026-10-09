import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
const app = createApp("test-secret-only-not-for-production-123456789");
let db: MongoMemoryServer;
before(async () => {
  db = await MongoMemoryServer.create();
  await mongoose.connect(db.getUri());
  await mongoose.connection.syncIndexes();
});
after(async () => {
  await mongoose.disconnect();
  await db?.stop();
});
test("registration, login, isolation, validation and task lifecycle", async () => {
  const a = await request(app)
    .post("/auth/register")
    .send({ email: "A@example.com", password: "password123" })
    .expect(201);
  assert.equal(a.body.user.email, "a@example.com");
  assert.ok(a.body.token);
  assert.equal(a.body.user.passwordHash, undefined);
  await request(app)
    .post("/auth/register")
    .send({ email: "a@example.com", password: "password123" })
    .expect(409);
  await request(app)
    .post("/auth/login")
    .send({ email: "a@example.com", password: "wrongpass" })
    .expect(401);
  await request(app)
    .post("/auth/login")
    .send({ email: "A@example.com", password: "password123" })
    .expect(200);
  const b = await request(app)
    .post("/auth/register")
    .send({ email: "b@example.com", password: "password123" })
    .expect(201);
  const authA = { Authorization: `Bearer ${a.body.token}` },
    authB = { Authorization: `Bearer ${b.body.token}` };
  await request(app).get("/tasks").expect(401);
  await request(app)
    .get("/tasks")
    .set("Authorization", "Bearer invalid")
    .expect(401);
  const input = {
    title: "Submit assignment",
    description: "Review the app",
    scheduledAt: "2026-10-09T10:00:00.000Z",
    deadline: "2026-10-10T10:00:00.000Z",
    priority: "high",
    category: "Study",
  };
  await request(app)
    .post("/tasks")
    .set(authA)
    .send({ ...input, title: " " })
    .expect(400);
  await request(app)
    .post("/tasks")
    .set(authA)
    .send({ ...input, deadline: "2026-10-08T10:00:00.000Z" })
    .expect(400);
  await request(app)
    .post("/tasks")
    .set(authA)
    .send({ ...input, owner: b.body.user.id })
    .expect(400);
  const created = await request(app)
    .post("/tasks")
    .set(authA)
    .send(input)
    .expect(201);
  const id = created.body._id;
  assert.equal(created.body.completed, false);
  assert.equal((await request(app).get("/tasks").set(authA)).body.length, 1);
  assert.equal((await request(app).get("/tasks").set(authB)).body.length, 0);
  await request(app)
    .patch(`/tasks/${id}`)
    .set(authB)
    .send({ completed: true })
    .expect(404);
  await request(app).delete(`/tasks/${id}`).set(authB).expect(404);
  await request(app)
    .patch(`/tasks/${id}`)
    .set(authA)
    .send({ completed: true, owner: b.body.user.id })
    .expect(400);
  assert.equal(
    (
      await request(app)
        .patch(`/tasks/${id}`)
        .set(authA)
        .send({ completed: true })
        .expect(200)
    ).body.completed,
    true
  );
  assert.equal(
    (
      await request(app)
        .patch(`/tasks/${id}`)
        .set(authA)
        .send({ completed: false })
        .expect(200)
    ).body.completed,
    false
  );
  await request(app).delete("/tasks/not-an-id").set(authA).expect(400);
  await request(app).delete(`/tasks/${id}`).set(authA).expect(204);
  assert.equal((await request(app).get("/tasks").set(authA)).body.length, 0);
});
