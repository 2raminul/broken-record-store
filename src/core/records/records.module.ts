import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { RecordsRepository } from './records.repository';
import { Record, RecordSchema } from './schemas/record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Record.name, schema: RecordSchema }]),
  ],
  controllers: [RecordsController],
  providers: [RecordsService, RecordsRepository],
  exports: [RecordsService, RecordsRepository],
})
export class RecordsModule {}
