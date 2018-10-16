const path          = require('path');
const assert        = require('assert');
const {exists}      = require('fs-extra');
let nugget          = require('nugget');
const DecompressZip = require('decompress-zip');
let {execFile}      = require('child_process');
const {promisify}   = require('util');
nugget   = promisify(nugget);
execFile = promisify(execFile);

const ZIP_NAME = 'resource_hacker.zip';
const EXE_NAME = 'ResourceHacker.exe';
// www.angusj.com doesn't support https!
const ZIP_URL  = `http://www.angusj.com/resourcehacker/${ZIP_NAME}`;
const ZIP_PATH = path.join(__dirname, ZIP_NAME);
const EXE_DIR  = path.join(__dirname,'..','.bin');
const EXE_PATH = path.join(EXE_DIR, EXE_NAME);

/**
 * execute ResourceHacker.exe with arguments
 * given. See command-line syntax on website
 * @param {Object} opts {open,save,action,
 *            resource,mask:{type,name,lang}}
 * @see http://www.angusj.com/resourcehacker/
 */
async function executeExe(opts) {
  assert.ok(opts && opts.action, 'action required');
  assert.ok(        opts.open,   'no file to open');

  const args = [
    '-open',   opts.open,
    '-save',   opts.save ||
               opts.open,
    '-action', opts.action,
  ];
  if (opts.resource) {
    args.push('-res', opts.resource);
  }
  let {mask} = opts;
  if (mask) {
    mask = [
      mask.type || '',
      mask.name || '',
      mask.lang || '',
    ];
    args.push('-mask', mask.join());
  }
  args.push('-log', 'NUL');

  await ensureExe();
  await execFile(EXE_PATH, args);
}

/**
 * ensure the presence of ResourceHacker.exe,
 * downloading the distribution zip from the
 * website and extracting the exe if needed
 */
async function ensureExe() {
  if (await exists(EXE_PATH)) {
    return;
  }
  if (!(await exists(ZIP_PATH))) {
    await downloadZip();
  }
  if (!(await exists(ZIP_PATH))) {
    throw new Error(`Cannot download: ${ZIP_URL}`);
  }
  await extractExe();
  if (!(await exists(EXE_PATH))) {
    throw new Error(`Cannot locate: ${EXE_NAME}`);
  }
}

/**
 * download resource_hacker.zip from www.angusj.com
 */
function downloadZip() {
  return nugget(ZIP_URL, {
    target: ZIP_PATH,
    quiet:  true,
  });
}

/**
 * extract ResourceHacker.exe into node_modules/.bin
 */
function extractExe() {
  return new Promise((resolve, reject) => {
    new DecompressZip(ZIP_PATH)
      .on('extract', resolve)
      .on('error',   reject)
      .extract({
        path:   EXE_DIR,
        filter: file => file.filename === EXE_NAME,
      });
  });
}

module.exports = executeExe;
