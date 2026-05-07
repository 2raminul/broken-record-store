/**
 * Bulk-seeds 100,000 synthetic records into MongoDB.
 * No external API calls — completes in seconds.
 */

import { MongoClient } from 'mongodb';

const MONGO_URL  = 'mongodb://localhost:27017';
const DB_NAME    = 'records';
const BATCH_SIZE = 1000;
const TARGET     = 100_000;

const FORMATS    = ['Vinyl', 'CD', 'Cassette', 'Digital'];
const CATEGORIES = ['Rock', 'Jazz', 'Hip-Hop', 'Classical', 'Pop', 'Alternative', 'Indie'];

const ARTIST_PREFIXES = ['The', 'DJ', 'MC', 'Sir', 'Lady', 'Young', 'Old', 'Great', 'Dark', 'Blue'];
const FIRST_WORDS     = ['Thunder', 'Shadow', 'Crystal', 'Velvet', 'Neon', 'Golden', 'Silver', 'Iron',
                         'Cosmic', 'Electric', 'Wild', 'Broken', 'Lonely', 'Midnight', 'Burning',
                         'Silent', 'Hollow', 'Rising', 'Fallen', 'Wicked'];
const SECOND_WORDS    = ['Road', 'Wave', 'Storm', 'Echo', 'Dream', 'Fire', 'Rain', 'Sky', 'Moon',
                         'Star', 'River', 'Wind', 'Light', 'Stone', 'Heart', 'Soul', 'Mind',
                         'Ghost', 'Signal', 'Drift'];
const ALBUM_ADJECTIVES = ['Eternal', 'Broken', 'Golden', 'Electric', 'Silent', 'Burning', 'Rising',
                           'Fallen', 'Hidden', 'Lost', 'Dark', 'Bright', 'Deep', 'Wild', 'Strange',
                           'Cold', 'Warm', 'Loud', 'Soft', 'Heavy'];
const ALBUM_NOUNS      = ['Echoes', 'Waves', 'Dreams', 'Fires', 'Storms', 'Roads', 'Nights', 'Days',
                           'Years', 'Hearts', 'Souls', 'Minds', 'Walls', 'Gates', 'Bridges', 'Skies',
                           'Oceans', 'Mountains', 'Valleys', 'Shadows'];

function artistName(i) {
  // 5 000 unique artists: prefix (10) × first (20) × second (20) / some = 4 000, top up with index
  const p = ARTIST_PREFIXES[i % ARTIST_PREFIXES.length];
  const f = FIRST_WORDS[Math.floor(i / ARTIST_PREFIXES.length) % FIRST_WORDS.length];
  const s = SECOND_WORDS[Math.floor(i / (ARTIST_PREFIXES.length * FIRST_WORDS.length)) % SECOND_WORDS.length];
  const suffix = Math.floor(i / (ARTIST_PREFIXES.length * FIRST_WORDS.length * SECOND_WORDS.length));
  return suffix > 0 ? `${p} ${f} ${s} ${suffix}` : `${p} ${f} ${s}`;
}

function albumName(j) {
  const a = ALBUM_ADJECTIVES[j % ALBUM_ADJECTIVES.length];
  const n = ALBUM_NOUNS[Math.floor(j / ALBUM_ADJECTIVES.length) % ALBUM_NOUNS.length];
  const suffix = Math.floor(j / (ALBUM_ADJECTIVES.length * ALBUM_NOUNS.length));
  return suffix > 0 ? `${a} ${n} Vol. ${suffix + 1}` : `${a} ${n}`;
}

function randomPrice() {
  return parseFloat((Math.random() * 45 + 5).toFixed(2));
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const col = client.db(DB_NAME).collection('records');

  // Ensure the same unique index the app uses
  await col.createIndex({ artist: 1, album: 1, format: 1 }, { unique: true });

  const existing = await col.countDocuments();
  console.log(`Existing records: ${existing}`);

  const toInsert = Math.max(0, TARGET - existing);
  if (toInsert === 0) {
    console.log('Already at 100k — nothing to do.');
    await client.close();
    return;
  }

  console.log(`Inserting ${toInsert.toLocaleString()} records in batches of ${BATCH_SIZE}…\n`);

  let inserted = 0;
  let skipped  = 0;
  const batches = Math.ceil(toInsert / BATCH_SIZE);
  const start   = Date.now();

  // We generate using a flat index offset so artist/album/format combinations
  // are always unique: 5 000 artists × 5 albums × 4 formats = 100 000 exactly.
  // artistIdx = floor(i / 20), albumIdx = floor((i%20)/4), formatIdx = i%4
  const offset = existing; // skip already-inserted slots

  for (let b = 0; b < batches; b++) {
    const docs = [];
    const batchStart = offset + b * BATCH_SIZE;
    const batchEnd   = Math.min(batchStart + BATCH_SIZE, offset + toInsert);

    for (let i = batchStart; i < batchEnd; i++) {
      const artistIdx = Math.floor(i / 20);
      const albumIdx  = Math.floor((i % 20) / 4);
      const formatIdx = i % 4;

      docs.push({
        artist:    artistName(artistIdx),
        album:     albumName(albumIdx),
        price:     randomPrice(),
        qty:       Math.floor(Math.random() * 100 + 1),
        format:    FORMATS[formatIdx],
        category:  CATEGORIES[i % CATEGORIES.length],
        tracklist: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    try {
      const res = await col.insertMany(docs, { ordered: false });
      inserted += res.insertedCount;
    } catch (err) {
      // ordered:false keeps going on duplicate key errors
      inserted += err.result?.nInserted ?? 0;
      skipped  += docs.length - (err.result?.nInserted ?? 0);
    }

    const pct      = (((b + 1) / batches) * 100).toFixed(1);
    const elapsed  = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`\r  Batch ${b + 1}/${batches} — ${pct}% — ${inserted.toLocaleString()} inserted — ${elapsed}s`);
  }

  const total = await col.countDocuments();
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n\n✅ Done in ${elapsed}s`);
  console.log(`   Inserted : ${inserted.toLocaleString()}`);
  console.log(`   Skipped  : ${skipped.toLocaleString()} (duplicates)`);
  console.log(`   Total DB : ${total.toLocaleString()} records`);
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
