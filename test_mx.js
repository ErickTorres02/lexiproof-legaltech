const dns = require('dns');
const net = require('net');

dns.resolveMx('gmail.com', (err, addresses) => {
    if (err) {
        console.error('DNS MX error:', err);
        return;
    }
    console.log('Gmail MX servers:', addresses);
});
