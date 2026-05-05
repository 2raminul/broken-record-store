import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RecordFormat, RecordCategory } from './record.enum';

export interface Track {
  title: string;
  position: string;
  length?: string;
}

@Schema({ timestamps: true })
export class Record extends Document {
  @Prop({ required: true })
  artist!: string;

  @Prop({ required: true })
  album!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 0 })
  qty!: number;

  @Prop({ enum: RecordFormat, required: true })
  format!: RecordFormat;

  @Prop({ enum: RecordCategory, required: true })
  category!: RecordCategory;

  @Prop({ required: false })
  mbid?: string;

  @Prop({ type: [{ title: String, position: String, length: String }], default: [] })
  tracklist!: Track[];
}

export const RecordSchema = SchemaFactory.createForClass(Record);

// Unique identity: artist + album + format
RecordSchema.index({ artist: 1, album: 1, format: 1 }, { unique: true });

// Search & filter performance indexes
RecordSchema.index({ format: 1 });
RecordSchema.index({ category: 1 });
RecordSchema.index({ artist: 'text', album: 'text' });
