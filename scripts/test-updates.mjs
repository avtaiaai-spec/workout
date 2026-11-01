import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const root = process.cwd(),
  temporary = mkdtempSync(join(tmpdir(), "workout-upgrades-"));
function run(command, args, options = {}) {
  execFileSync(command, args, { cwd: root, stdio: "inherit", ...options });
}
function historical(ref, name) {
  const source = join(temporary, name + "-source");
  mkdirSync(source);
  const archive = join(temporary, name + ".tar");
  run("git", ["archive", "--format=tar", "--output", archive, ref]);
  run("tar", ["-xf", archive, "-C", source]);
  symlinkSync(join(root, "node_modules"), join(source, "node_modules"), "dir");
  return source;
}
function build(source, name, version) {
  const output = join(temporary, name);
  run(
    process.execPath,
    [
      join(root, "node_modules/vite/bin/vite.js"),
      "build",
      "--outDir",
      output,
      "--emptyOutDir",
    ],
    {
      cwd: source,
      env: {
        ...process.env,
        VITE_BASE_PATH: "/workout/",
        WORKOUT_BUILD_ID: version,
      },
    },
  );
  return output;
}
try {
  const releases = {
    legacy: build(historical("f382211", "legacy"), "legacy", "legacy"),
    waiting: build(historical("29f827f", "waiting"), "waiting", "waiting"),
    first: build(root, "first", "upgrade-one"),
    second: build(root, "second", "upgrade-two"),
  };
  run(
    process.execPath,
    [
      join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "updates.spec.ts",
    ],
    {
      env: {
        ...process.env,
        UPGRADE_TEST: "1",
        UPGRADE_RELEASES: JSON.stringify(releases),
      },
    },
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
