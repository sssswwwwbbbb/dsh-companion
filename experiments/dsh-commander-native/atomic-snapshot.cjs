const fs = require('node:fs');

function writeSnapshot(filename, value) {
  const temporary = filename + '.' + process.pid + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value), {mode: 0o600});
  fs.renameSync(temporary, filename);
}

module.exports = {writeSnapshot};
