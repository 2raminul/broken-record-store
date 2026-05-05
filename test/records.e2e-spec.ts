import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { createTestApp, closeTestApp } from "./helpers/setup-test-app";
import { makeRecord } from "./helpers/make-record";
import {
  RecordFormat,
  RecordCategory,
} from "../src/core/records/schemas/record.enum";

describe("Records (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe("POST /api/v1/records", () => {
    it("creates a record and returns 201", async () => {
      const dto = makeRecord();
      const res = await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(dto)
        .expect(201);

      expect(res.body).toMatchObject({
        artist: dto.artist,
        album: dto.album,
        price: dto.price,
        qty: dto.qty,
        format: dto.format,
        category: dto.category,
        tracklist: [],
      });
      expect(res.body.id).toBeDefined();
    });

    it("returns 409 on duplicate artist+album+format", async () => {
      const dto = makeRecord({
        artist: "Dup Artist",
        album: "Dup Album",
        format: RecordFormat.CD,
      });
      await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(dto)
        .expect(201);
      await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(dto)
        .expect(409);
    });

    it("returns 400 on invalid body", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/records")
        .send({ artist: "Only artist" })
        .expect(400);
    });

    it("returns 400 for invalid uuid mbid", async () => {
      const dto = makeRecord({ mbid: "not-a-uuid" });
      await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(dto)
        .expect(400);
    });
  });

  describe("GET /api/v1/records", () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(
          makeRecord({
            artist: "Filter Test",
            album: "Vinyl Only",
            format: RecordFormat.VINYL,
            category: RecordCategory.INDIE,
          }),
        );
      await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(
          makeRecord({
            artist: "Filter Test",
            album: "CD Only",
            format: RecordFormat.CD,
            category: RecordCategory.JAZZ,
          }),
        );
    });

    it("returns paginated results", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/records?page=1&limit=5")
        .expect(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("meta");
      expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
    });

    it("filters by format", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/records?format=Vinyl&artist=Filter Test")
        .expect(200);
      expect(res.body.data.every((r: any) => r.format === "Vinyl")).toBe(true);
    });

    it("filters by category", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/records?category=Jazz&artist=Filter Test")
        .expect(200);
      expect(res.body.data.every((r: any) => r.category === "Jazz")).toBe(true);
    });

    it("returns 400 for invalid format enum", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/records?format=Wax")
        .expect(400);
    });
  });

  describe("PUT /api/v1/records/:id", () => {
    let recordId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(
          makeRecord({
            artist: "Update Test",
            album: "Update Album",
            format: RecordFormat.CASSETTE,
          }),
        );
      recordId = res.body.id;
    });

    it("updates a record field", async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/records/${recordId}`)
        .send({ price: 99 })
        .expect(200);
      expect(res.body.price).toBe(99);
    });

    it("returns 404 for unknown id", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/records/64a1f2b3c4d5e6f7a8b9c0d9")
        .send({ price: 10 })
        .expect(404);
    });

    it("returns 400 for invalid ObjectId", async () => {
      await request(app.getHttpServer())
        .put("/api/v1/records/not-an-id")
        .send({ price: 10 })
        .expect(400);
    });
  });

  describe("GET /api/v1/records/:id", () => {
    let recordId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/records")
        .send(
          makeRecord({
            artist: "GetOne Test",
            album: "GetOne Album",
            format: RecordFormat.DIGITAL,
          }),
        );
      recordId = res.body.id;
    });

    it("returns the record", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/records/${recordId}`)
        .expect(200);
      expect(res.body.artist).toBe("GetOne Test");
    });

    it("returns 404 for unknown id", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/records/64a1f2b3c4d5e6f7a8b9c0d9")
        .expect(404);
    });
  });
});
