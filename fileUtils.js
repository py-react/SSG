const fs  = require('fs/promises');

exports.ensureDir = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

exports.writeFile = async (filePath, content) => {
  await fs.writeFile(filePath, content);
};