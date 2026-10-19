#!/usr/bin/env bash
# Sealed-build legacy-Node test leg (Travis). Runs the FULL mocha suite on a
# pre-1.0 Node (default 0.3.8), which has no prebuilt binary and no usable npm.
#
# Prerequisites (done by .travis.yml on a node_js '10' base):
#   - yarn install --frozen-lockfile && yarn grunt clean build  (lib/ built by Node 10)
#   - apt packages gcc-4.8 g++-4.8 python2.7 (old V8 miscompiles with gcc >= 4.9)
#
# Steps:
#   1. Compile node-v$SEAL_LEGACY_NODE from source (cached in $HOME/node-legacy).
#   2. Transpile test/**/*.js to ES5/CommonJS with the repo's own babel config
#      into a scratch tree next to a copy of lib/, so ../../lib/... still resolves.
#   3. Install mocha 1.x + chai 3.x (last lines that load on V8 3.1) into that
#      scratch tree with the modern npm -- package.json / yarn.lock are untouched.
#   4. Run every test file under the legacy node with the spec reporter.
set -euo pipefail

LEGACY_VERSION="${SEAL_LEGACY_NODE:-0.3.8}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LEGACY_PREFIX="${LEGACY_NODE_PREFIX:-$HOME/node-legacy/$LEGACY_VERSION}"
SCRATCH="${LEGACY_SCRATCH:-/tmp/diff-legacy-tests}"
LEGACY_NODE="$LEGACY_PREFIX/bin/node"

# Tests that cannot pass on V8 3.1 because of an engine limitation of the
# unpatched library itself (not of the test harness). Matched against mocha's
# full test title and inverted, so everything else runs. Keep this list narrow.
EXCLUDES=(
  # V8 3.1 treats RegExp objects as callable (typeof /foo/ === 'function'), so
  # JSON.stringify drops {a: /foo/} to '{}' instead of '{"a":{}}' -- the default
  # (no custom replacer) assertion of this test cannot hold on that engine.
  'diff/json #canonicalize should accept a custom JSON.stringify() replacer function'
  # src/patch/reverse.js calls String.prototype.startsWith (ES2015), which V8 3.1 lacks.
  'patch/reverse #reversePatch should output a patch that is the inverse of the provided patch'
  'patch/reverse #reversePatch should support taking an array of structured patches, as output by parsePatch'
)

# ---------------------------------------------------------------------------
# 1. Legacy node binary
# ---------------------------------------------------------------------------
if [ ! -x "$LEGACY_NODE" ]; then
  echo "==> Building node v$LEGACY_VERSION into $LEGACY_PREFIX"
  # waf/scons need python 2 as `python`; V8's scons picks up plain `g++`
  # (env.Detect), so pin every compiler name to gcc 4.8 first on PATH.
  # Prefer the apt binaries in /usr/bin over pyenv shims (Travis's `python`
  # is a pyenv python3 shim, which breaks waf).
  TOOLCHAIN="$HOME/legacy-toolchain"
  mkdir -p "$TOOLCHAIN"
  for tool in python2.7 gcc-4.8 g++-4.8; do
    if [ ! -x "/usr/bin/$tool" ]; then
      echo "/usr/bin/$tool is missing (install gcc-4.8 g++-4.8 python2.7)" >&2
      exit 1
    fi
  done
  ln -sf /usr/bin/python2.7 "$TOOLCHAIN/python"
  ln -sf /usr/bin/gcc-4.8 "$TOOLCHAIN/gcc"
  ln -sf /usr/bin/gcc-4.8 "$TOOLCHAIN/cc"
  ln -sf /usr/bin/g++-4.8 "$TOOLCHAIN/g++"
  ln -sf /usr/bin/g++-4.8 "$TOOLCHAIN/c++"
  SRC_DIR="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/v$LEGACY_VERSION/node-v$LEGACY_VERSION.tar.gz" | tar xz -C "$SRC_DIR"
  BUILD_LOG=/tmp/node-legacy-build.log
  # V8 emits a flood of warnings; keep them out of the job log (Travis caps logs at 4MB).
  ( cd "$SRC_DIR/node-v$LEGACY_VERSION" \
    && export PATH="$TOOLCHAIN:$PATH" CC=gcc-4.8 CXX=g++-4.8 \
    && ./configure --prefix="$LEGACY_PREFIX" --without-ssl \
    && make \
    && make install ) > "$BUILD_LOG" 2>&1 || { tail -60 "$BUILD_LOG"; exit 1; }
  rm -rf "$SRC_DIR"
fi
echo "==> Legacy node: $("$LEGACY_NODE" --version)"

# ---------------------------------------------------------------------------
# 2. ES5 copy of the test suite next to the built lib/
# ---------------------------------------------------------------------------
if [ ! -f "$REPO/lib/index.js" ]; then
  echo "lib/ is missing -- run 'yarn grunt clean build' first" >&2
  exit 1
fi
rm -rf "${SCRATCH:?}/test" "${SCRATCH:?}/lib"
mkdir -p "$SCRATCH"
cp -R "$REPO/lib" "$SCRATCH/lib"
( cd "$REPO" && node_modules/.bin/babel test --ignore 'test/legacy-node/**' --out-dir "$SCRATCH/test" )

# ---------------------------------------------------------------------------
# 3. Test harness that still loads on V8 3.1 (installed by the modern npm)
# ---------------------------------------------------------------------------
if [ ! -f "$SCRATCH/node_modules/mocha/package.json" ]; then
  echo '{"name":"diff-legacy-tests","private":true}' > "$SCRATCH/package.json"
  ( cd "$SCRATCH" && npm install --no-save --no-package-lock --no-audit --no-fund \
      mocha@1.21.5 chai@3.5.0 )
fi
# node 0.3 resolves bare requires only through NODE_PATH, as <name>, <name>.js
# or <name>/index.js -- no node_modules walk-up and no package.json "main".
# Give every installed package a <name>.js forwarder to its real entry point.
STUBS="$SCRATCH/legacy_path"
rm -rf "$STUBS"
node - "$SCRATCH/node_modules" "$STUBS" <<'JS'
var fs = require('fs');
var path = require('path');
var nm = process.argv[2];
var out = process.argv[3];
fs.mkdirSync(out);
fs.readdirSync(nm).forEach(function(name) {
  if (name.charAt(0) === '.' || name.charAt(0) === '@') { return; }
  var main = require.resolve(path.join(nm, name));
  fs.writeFileSync(path.join(out, name + '.js'),
    'module.exports = require(' + JSON.stringify(main) + ');\n');
});
JS

# ---------------------------------------------------------------------------
# 4. Run the suite
# ---------------------------------------------------------------------------
cat > "$SCRATCH/run-mocha.js" <<'JS'
var fs = require('fs');
var path = require('path');
// Shims for APIs that landed after node 0.3 and that mocha 1.x touches.
if (!path.sep) { path.sep = '/'; }
// mocha/lib/mocha.js does module.paths.push(...); node 0.3 modules have no
// .paths (nothing reads it there), so give them an inert array.
if (!module.paths) { module.constructor.prototype.paths = []; }

var testDir = process.argv[2];
var resultFile = process.argv[3];
var grep = process.argv[4];

var Mocha = require('mocha');
var mocha = new Mocha({ reporter: 'spec', ui: 'bdd', timeout: 10000 });
if (grep) {
  mocha.grep(new RegExp(grep));
  mocha.invert();
}

function walk(dir) {
  fs.readdirSync(dir).sort().forEach(function(name) {
    var file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) {
      walk(file);
    } else if (/\.js$/.test(name)) {
      mocha.addFile(file);
    }
  });
}
walk(testDir);

mocha.run(function(failures) {
  // Old node drops buffered stdout on process.exit(); report via a file
  // and let the process end on its own.
  fs.writeFileSync(resultFile, String(failures));
});
JS

GREP=""
if [ "${#EXCLUDES[@]}" -gt 0 ]; then
  echo "==> Excluded on node v$LEGACY_VERSION (engine limitation of the unpatched library):"
  for t in "${EXCLUDES[@]}"; do
    echo "    - $t"
    esc="$(printf '%s' "$t" | sed 's/[][\\.^$*+?(){}|/]/\\&/g')"
    GREP="${GREP:+$GREP|}^${esc}\$"
  done
fi

RESULT="$SCRATCH/result.txt"
rm -f "$RESULT"
cd "$SCRATCH"
NODE_PATH="$STUBS" "$LEGACY_NODE" "$SCRATCH/run-mocha.js" "$SCRATCH/test" "$RESULT" "$GREP" | cat

if [ ! -f "$RESULT" ]; then
  echo "mocha did not complete under node v$LEGACY_VERSION" >&2
  exit 1
fi
FAILURES="$(cat "$RESULT")"
echo "==> node v$LEGACY_VERSION: $FAILURES failing"
[ "$FAILURES" = "0" ]
