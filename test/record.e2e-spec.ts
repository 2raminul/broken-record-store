import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { createTestApp, closeTestApp } from "./helpers/setup-test-app";
import { RecordFormat, RecordCategory } from "../src/api/schemas/record.enum";

describe("RecordController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it("should create a new record", async () => {
    const createRecordDto = {
      artist: "The Beatles",
      album: "Abbey Road",
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    const response = await request(app.getHttpServer())
      .post("/api/v1/records")
      .send(createRecordDto)
      .expect(201);

    expect(response.body).toHaveProperty("artist", "The Beatles");
    expect(response.body).toHaveProperty("album", "Abbey Road");
    expect(response.body.id).toBeDefined();
  });

  it("should create a new record and fetch it with filters", async () => {
    const createRecordDto = {
      artist: "The Fake Band",
      album: "Fake Album",
      price: 25,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/records")
      .send(createRecordDto)
      .expect(201);

    expect(createResponse.body.id).toBeDefined();

    const response = await request(app.getHttpServer())
      .get("/api/v1/records?artist=The Fake Band")
      .expect(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0]).toHaveProperty("artist", "The Fake Band");
  });
});
