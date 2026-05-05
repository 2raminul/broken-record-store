import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { MusicBrainzClient } from './music-brainz.client';
import { Track } from '../../records/schemas/record.schema';

@Injectable()
export class MusicBrainzService {
  private readonly logger = new Logger(MusicBrainzService.name);
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  constructor(private readonly client: MusicBrainzClient) {}

  async getTracklist(mbid: string): Promise<Track[]> {
    try {
      const xml = await this.client.getReleaseXml(mbid);
      if (!xml) return [];
      return this.parseTracklist(xml);
    } catch (err) {
      this.logger.warn({ err, mbid }, 'MusicBrainz: failed to parse tracklist, using empty');
      return [];
    }
  }

  private parseTracklist(xml: string): Track[] {
    const parsed = this.xmlParser.parse(xml) as Record<string, unknown>;
    const tracks: Track[] = [];

    try {
      const release = (parsed['metadata'] as any)?.['release'];
      const mediumList = release?.['medium-list']?.['medium'];
      const mediums = Array.isArray(mediumList) ? mediumList : mediumList ? [mediumList] : [];

      for (const medium of mediums) {
        const trackList = medium?.['track-list']?.['track'];
        const rawTracks = Array.isArray(trackList) ? trackList : trackList ? [trackList] : [];

        for (const t of rawTracks) {
          const recording = t?.recording;
          tracks.push({
            position: String(t?.position ?? ''),
            title: String(recording?.title ?? t?.title ?? ''),
            length: t?.length ? this.formatDuration(Number(t.length)) : undefined,
          });
        }
      }
    } catch (err) {
      this.logger.warn({ err }, 'MusicBrainz: error traversing XML structure');
    }

    return tracks;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
