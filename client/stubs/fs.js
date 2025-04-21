let fs;

if (typeof window === 'undefined') {
    fs = require('node:fs');
} else {
    fs = {};
}

module.exports = fs;