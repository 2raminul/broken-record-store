/**
 * Seed local MongoDB from MusicBrainz public API.
 * Respects the 1 req/sec rate limit.
 */

import { MongoClient } from 'mongodb';

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME   = 'records';
const MB_BASE   = 'https://musicbrainz.org/ws/2';
const UA        = 'BrokenRecordStore/1.0.0 (dev@broken-record-store.com)';

// tag → category mapping
const GENRE_SEARCHES = [
  { tag: 'rock',        category: 'Rock' },
  { tag: 'jazz',        category: 'Jazz' },
  { tag: 'hip-hop',     category: 'Hip-Hop' },
  { tag: 'classical',   category: 'Classical' },
  { tag: 'pop',         category: 'Pop' },
  { tag: 'alternative', category: 'Alternative' },
  { tag: 'indie',       category: 'Indie' },
];

// MusicBrainz medium format → our enum
const FORMAT_MAP = {
  'Vinyl':          'Vinyl',
  '12" Vinyl':      'Vinyl',
  '7" Vinyl':       'Vinyl',
  '10" Vinyl':      'Vinyl',
  'CD':             'CD',
  'Enhanced CD':    'CD',
  'CD-R':           'CD',
  'Cassette':       'Cassette',
  'Digital Media':  'Digital',
};
const FORMATS = Object.values(FORMAT_MAP);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function mbFetch(path) {
  const url = `${MB_BASE}${path}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`MB ${res.status}: ${url}`);
  return res.json();
}

async function searchReleases(tag, limit = 25, offset = 0) {
  const query = encodeURIComponent(`tag:${tag} AND status:official`);
  const data = await mbFetch(
    `/release?query=${query}&limit=${limit}&offset=${offset}&fmt=json`,
  );
  return data.releases ?? [];
}

async function getTracklist(mbid) {
  await sleep(1100); // respect rate limit
  try {
    const data = await mbFetch(`/release/${mbid}?inc=recordings&fmt=json`);
    const tracks = [];
    for (const medium of data.media ?? []) {
      for (const track of medium.tracks ?? []) {
        tracks.push({
          position: String(track.position ?? track.number ?? ''),
          title:    track.title ?? track.recording?.title ?? '',
          length:   track.length ? formatMs(track.length) : undefined,
        });
      }
    }
    return tracks;
  } catch {
    return [];
  }
}

function formatMs(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function pickFormat(release) {
  const raw = release.media?.[0]?.format ?? '';
  return FORMAT_MAP[raw] ?? null;
}

function randomPrice() {
  return parseFloat((Math.random() * 30 + 5).toFixed(2));
}

function randomQty() {
  return Math.floor(Math.random() * 50 + 1);
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const col = client.db(DB_NAME).collection('records');

  // Ensure unique index matches the app's constraint
  await col.createIndex({ artist: 1, album: 1, format: 1 }, { unique: true });

  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const { tag, category } of GENRE_SEARCHES) {
    console.log(`\n── Searching tag: ${tag} (category: ${category})`);

    let releases;
    try {
      await sleep(1100);
      releases = await searchReleases(tag, 25);
    } catch (err) {
      console.warn(`  Search failed: ${err.message}`);
      continue;
    }

    console.log(`  Found ${releases.length} releases`);

    for (const rel of releases) {
      const format = pickFormat(rel);
      if (!format) { totalSkipped++; continue; }

      const artist = rel['artist-credit']?.[0]?.artist?.name ?? rel['artist-credit']?.[0]?.name;
      const album  = rel.title;
      const mbid   = rel.id;

      if (!artist || !album || !mbid) { totalSkipped++; continue; }

      // Fetch tracklist (rate-limited inside)
      process.stdout.write(`  ${artist} — ${album} [${format}] … `);
      const tracklist = await getTracklist(mbid);

      const doc = {
        artist,
        album,
        price:    randomPrice(),
        qty:      randomQty(),
        format,
        category,
        mbid,
        tracklist,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await col.insertOne(doc);
        totalInserted++;
        console.log(`✓ (${tracklist.length} tracks)`);
      } catch (err) {
        if (err.code === 11000) {
          totalSkipped++;
          console.log('skip (duplicate)');
        } else {
          console.warn(`ERR: ${err.message}`);
        }
      }
    }
  }

  const finalCount = await col.countDocuments();
  console.log(`\n✅ Done — inserted: ${totalInserted}, skipped: ${totalSkipped}`);
  console.log(`📦 Total records in DB: ${finalCount}`);
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
