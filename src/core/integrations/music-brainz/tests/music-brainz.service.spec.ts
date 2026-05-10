import { Test, TestingModule } from "@nestjs/testing";
import { MusicBrainzService } from "../music-brainz.service";
import { MusicBrainzClient } from "../music-brainz.client";
import * as fs from "fs";
import * as path from "path";

const abbeyRoadXml = fs.readFileSync(
  path.join(__dirname, "../__fixtures__/abbey-road.xml"),
  "utf-8",
);

describe("MusicBrainzService", () => {
  let service: MusicBrainzService;
  let client: jest.Mocked<MusicBrainzClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MusicBrainzService,
        {
          provide: MusicBrainzClient,
          useValue: { getReleaseXml: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(MusicBrainzService);
    client = module.get(MusicBrainzClient);
  });

  it("parses a valid XML response into a tracklist", async () => {
    client.getReleaseXml.mockResolvedValue(abbeyRoadXml);
    const tracks = await service.getTracklist(
      "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
    );

    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toEqual({
      position: "1",
      title: "Come Together",
      length: "4:19",
    });
    expect(tracks[1]).toEqual({
      position: "2",
      title: "Something",
      length: "3:02",
    });
  });

  it("returns [] when client returns null (404 or network error)", async () => {
    client.getReleaseXml.mockResolvedValue(null);
    const tracks = await service.getTracklist("bad-mbid");
    expect(tracks).toEqual([]);
  });

  it("returns [] when XML is malformed", async () => {
    client.getReleaseXml.mockResolvedValue("<invalid>xml");
    const tracks = await service.getTracklist("bad-xml-mbid");
    expect(tracks).toEqual([]);
  });
});
