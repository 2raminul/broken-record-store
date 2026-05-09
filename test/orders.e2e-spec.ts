import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { createTestApp, closeTestApp } from "./helpers/setup-test-app";
import { makeRecord } from "./helpers/make-record";
import { RecordFormat } from "../src/core/records/schemas/record.enum";

describe("Orders (e2e)", () => {
  let app: INestApplication;
  let recordId: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());

    const res = await request(app.getHttpServer())
      .post("/api/v1/records")
      .send(
        makeRecord({
          artist: "Order Test",
          album: "Order Album",
          format: RecordFormat.VINYL,
          qty: 5,
        }),
      );
    recordId = res.body.id;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe("POST /api/v1/orders", () => {
    it("creates an order and decrements record stock", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/orders")
        .send({ recordId, qty: 2 })
        .expect(201);

      expect(res.body).toMatchObject({
        recordId,
        qty: 2,
        total: 40,
        status: "CONFIRMED",
      });

      const recordRes = await request(app.getHttpServer()).get(
        `/api/v1/records/${recordId}`,
      );
      expect(recordRes.body.qty).toBe(3);
    });

    it("returns 422 when stock is insufficient", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/orders")
        .send({ recordId, qty: 999 })
        .expect(422);
    });

    it("returns 404 for unknown record", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/orders")
        .send({ recordId: "64a1f2b3c4d5e6f7a8b9c0d9", qty: 1 })
        .expect(404);
    });

    it("returns 400 for qty <= 0", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/orders")
        .send({ recordId, qty: 0 })
        .expect(400);
    });

    it("returns 400 for invalid recordId", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/orders")
        .send({ recordId: "not-an-id", qty: 1 })
        .expect(400);
    });
  });

  describe("GET /api/v1/orders", () => {
    it("returns paginated results with correct response shape", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/orders")
        .expect(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("paginationMetadata");
      expect(res.body.paginationMetadata).toHaveProperty(
        "totalItemsAcrossAllPages",
      );
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("respects limit", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/orders?offset=0&limit=1")
        .expect(200);
      expect(res.body.data.length).toBe(1);
      expect(
        res.body.paginationMetadata.totalItemsAcrossAllPages,
      ).toBeGreaterThanOrEqual(1);
    });

    it("filters by recordId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders?recordId=${recordId}`)
        .expect(200);
      expect(res.body.data.every((o: any) => o.recordId === recordId)).toBe(
        true,
      );
    });
  });

  describe("GET /api/v1/orders/:id", () => {
    let orderId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/orders")
        .send({ recordId, qty: 1 });
      orderId = res.body.id;
    });

    it("returns the order by id", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .expect(200);
      expect(res.body.id).toBe(orderId);
    });

    it("returns 404 for unknown id", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/orders/64a1f2b3c4d5e6f7a8b9c0d9")
        .expect(404);
    });
  });
});
