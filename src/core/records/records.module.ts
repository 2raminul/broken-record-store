import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { RecordsRepository } from './records.repository';
import { Record, RecordSchema } from './schemas/record.schema';
import { MusicBrainzModule } from '../integrations/music-brainz/music-brainz.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Record.name, schema: RecordSchema }]),
    MusicBrainzModule,
  ],
  controllers: [RecordsController],
  providers: [RecordsService, RecordsRepository],
  exports: [RecordsService, RecordsRepository],
})
export class RecordsModule {}
