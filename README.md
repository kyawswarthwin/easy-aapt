# easy-aapt

## Installation

    npm i easy-aapt

## Usage

```js
'use strict';

const packageInfo = require('easy-aapt');

packageInfo('android-debug.apk')
  .then(console.log)
  .catch(console.error);
```
