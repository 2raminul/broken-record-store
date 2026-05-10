import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MusicBrainzClient } from './music-brainz.client';
import { MusicBrainzService } from './music-brainz.service';

@Module({
  imports: [HttpModule],
  providers: [MusicBrainzClient, MusicBrainzService],
  exports: [MusicBrainzService],
})
export class MusicBrainzModule {}
