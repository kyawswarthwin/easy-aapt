'use strict';

const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const mime = require('mime-types');
const yauzl = require('yauzl');

function packageInfo(filePath, aapt = path.join(__dirname, 'bin', os.platform(), 'aapt')) {
  return new Promise(async (resolve, reject) => {
    try {
      const ext = path.extname(filePath).toLowerCase();
      switch (ext) {
        case '.apk':
          resolve(await apkInfo(filePath, aapt));
          break;
        case '.xapk':
          resolve(await xapkInfo(filePath));
          break;
        default:
          throw 'Error: Unsupported File Format';
      }
    } catch (error) {
      reject(error);
    }
  });
}

function apkInfo(filePath, aapt) {
  return new Promise((resolve, reject) => {
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

function xapkInfo(filePath) {
  return new Promise(async (resolve, reject) => {
    try {
      const manifest = await getManifest(filePath);
      const icon = await getIcon(filePath);
      resolve({
        name: manifest.name,
        icon: icon,
        packageName: manifest.package_name,
        versionCode: Number(manifest.version_code),
        versionName: manifest.version_name,
        requiredSdk: Number(manifest.min_sdk_version)
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getManifest(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
      } else {
        zipfile.readEntry();
        zipfile.on('entry', entry => {
          if (entry.fileName === 'manifest.json') {
            zipfile.openReadStream(entry, (err, stream) => {
              if (err) {
                reject(err);
              } else {
                const buf = [];
                stream.on('data', chunk => {
                  buf.push(chunk);
                });
                stream.on('end', () => {
                  const manifest = JSON.parse(Buffer.concat(buf).toString());
                  resolve(manifest);
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

function getIcon(filePath, fileName = 'icon.png') {
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
