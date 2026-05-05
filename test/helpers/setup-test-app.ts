import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { AppModule } from "../../src/app.module";
import { customizeApp } from "../../src/app.customizer";

let mongod: MongoMemoryReplSet;

export async function createTestApp(): Promise<{
  app: INestApplication;
  mongoUri: string;
}> {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  const mongoUri = mongod.getUri();

  process.env.MONGO_URL = mongoUri;
  process.env.REDIS_URL = "";
  process.env.NODE_ENV = "test";
  process.env.MUSICBRAINZ_USER_AGENT = "TestApp/1.0.0 (test@test.com)";

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(MongooseModule)
    .useModule(MongooseModule.forRoot(mongoUri))
    .compile();

  const app = moduleFixture.createNestApplication();
  customizeApp(app);
  await app.init();

  return { app, mongoUri };
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
  if (mongod) await mongod.stop();
}
