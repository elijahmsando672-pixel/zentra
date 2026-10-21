import { readdirSync, rmSync } from "node:fs";
import path from "node:path";

// Next.js clears its build directory before every build (and once when the dev
// server starts) with next/dist/lib/recursive-delete.js. That helper calls
// fs.readlink() on every entry it is told is a symbolic link. OneDrive stores
// synced files as cloud-placeholder reparse points, which Node reports as
// symbolic links, and readlink() on them fails with EINVAL - aborting the
// build with "EINVAL: invalid argument, readlink '.next/...'".
//
// This performs the same cleanup with fs.rm(), which removes reparse points
// without resolving them. The webpack cache is kept, matching Next's own
// behaviour of excluding the "cache" directory from the cleanup.
const distDir = path.resolve(process.cwd(), ".next");

let entries;
try {
  entries = readdirSync(distDir, { withFileTypes: true });
} catch (error) {
  if (error.code === "ENOENT") {
    process.exit(0);
  }
  throw error;
}

for (const entry of entries) {
  if (entry.name === "cache") continue;
  rmSync(path.join(distDir, entry.name), {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
