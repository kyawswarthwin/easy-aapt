'use strict';

const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const mime = require('mime-types');
const yauzl = require('yauzl');

function packageInfo(filePath) {
  return new Promise((resolve, reject) => {
    const aapt = path.join(__dirname, 'bin', os.platform(), 'aapt');
    exec(`"${aapt}" d badging "${filePath}"`, (err, stdout, stderr) => {
      const error = err || stderr;
      if (error) {
        reject(error);
      } else {
        const pkg = stdout.match(/package: name='(.*?)' versionCode='(.*?)' versionName='(.*?)'/);
        const sdkVer = stdout.match(/sdkVersion:'(.*?)'/);
        const app = stdout.match(/application: label='(.*?)' icon='(.*?)'/);
        getIcon(filePath, app[2])
          .then(data => {
            resolve({
              name: app[1],
              icon: data,
              packageName: pkg[1],
              versionCode: Number(pkg[2]),
              versionName: pkg[3],
              requiredSdk: Number(sdkVer[1])
            });
          })
          .catch(reject);
      }
    });
  });
}

function getIcon(filePath, fileName) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
      } else {
        zipfile.readEntry();
        zipfile.on('entry', entry => {
          if (entry.fileName === fileName) {
            zipfile.openReadStream(entry, (err, stream) => {
              if (err) {
                reject(err);
              } else {
                const buf = [];
                stream.on('data', chunk => {
                  buf.push(chunk);
                });
                stream.on('end', () => {
                  const mediaType = mime.lookup(fileName);
                  const base64 = Buffer.concat(buf).toString('base64');
                  resolve(`data:${mediaType};base64,${base64}`);
                });
              }
            });
          }
          zipfile.readEntry();
        });
      }
    });
  });
}

module.exports = packageInfo;
