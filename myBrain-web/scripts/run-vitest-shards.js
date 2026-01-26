import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitestPath = path.join(rootDir, 'node_modules', 'vitest', 'vitest.mjs');
// Increased from 4 to 8 shards to reduce memory pressure per shard
const shardCount = Number(process.env.VITEST_SHARDS || 8);

if (!Number.isInteger(shardCount) || shardCount < 1) {
  console.error('VITEST_SHARDS must be a positive integer.');
  process.exit(1);
}

const baseArgs = ['--max-old-space-size=8192', vitestPath, '--run'];

let failedShards = 0;
let passedTests = 0;
let failedTests = 0;

for (let index = 1; index <= shardCount; index += 1) {
  console.log(`\n=== Running shard ${index}/${shardCount} ===\n`);
  const shardArg = `--shard=${index}/${shardCount}`;
  const result = spawnSync(process.execPath, [...baseArgs, shardArg], {
    cwd: rootDir,
    stdio: 'inherit',
    // Set UTC timezone for consistent date/time handling across environments
    env: { ...process.env, TZ: 'UTC' },
  });

  if (result.status !== 0) {
    failedShards++;
    console.error(`Shard ${index}/${shardCount} failed with exit code ${result.status}`);
    // Continue to next shard instead of exiting immediately
  }
}

if (failedShards > 0) {
  console.error(`\n${failedShards} shard(s) failed.`);
  process.exit(1);
}

console.log('\nAll shards completed successfully!');
