const https = require('https');

https.get('https://api.ipify.org?format=json', res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log('Public IP / Internet response:', data));
}).on('error', err => console.error('HTTPS Error:', err.message));
