import * as dotenv from 'dotenv';
dotenv.config();

import * as mongoose from 'mongoose';
import { Record, RecordSchema } from './src/api/schemas/record.schema';
import * as fs from 'fs';
import * as readline from 'readline';

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) {
  console.error('MONGO_URL is not set in .env');
  process.exit(1);
}

async function setupDatabase() {
  try {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      'Do you want to clean up the existing records collection? (Y/N): ',
      async (answer) => {
        rl.close();

        const data = JSON.parse(fs.readFileSync('data.json', 'utf-8')) as unknown[];
        const recordModel: mongoose.Model<Record> = mongoose.model<Record>(
          'Record',
          RecordSchema,
        );

        await mongoose.connect(MONGO_URL!);

        if (answer.toLowerCase() === 'y') {
          await recordModel.deleteMany({});
          console.log('Existing collection cleaned up.');
        }

        const records = await recordModel.insertMany(data);
        console.log(`Inserted ${records.length} records successfully!`);

        await mongoose.disconnect();
      },
    );
  } catch (error) {
    console.error('Error setting up the database:', error);
    await mongoose.disconnect();
  }
}

setupDatabase();
