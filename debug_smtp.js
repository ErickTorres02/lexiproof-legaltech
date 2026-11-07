const tls = require('tls');
const net = require('net');

function debugSmtp(user, pass) {
    const socket = tls.connect(465, 'smtp.gmail.com', { rejectUnauthorized: false }, () => {
        console.log('Connected to smtp.gmail.com:465 TLS');
    });

    socket.on('data', (d) => {
        const text = d.toString();
        console.log('<< SERVER:', text.trim());
        if (text.startsWith('220')) {
            console.log('>> EHLO localhost');
            socket.write('EHLO localhost\r\n');
        } else if (text.startsWith('250') && text.includes('AUTH')) {
            console.log('>> AUTH LOGIN');
            socket.write('AUTH LOGIN\r\n');
        } else if (text.startsWith('334') && text.includes('VXNlcm5hbWU6')) { // Username:
            console.log('>> Sending Username:', user);
            socket.write(Buffer.from(user.trim()).toString('base64') + '\r\n');
        } else if (text.startsWith('334') && text.includes('UGFzc3dvcmQ6')) { // Password:
            console.log('>> Sending Password (16 chars)');
            socket.write(Buffer.from(pass.replace(/\s+/g, '').trim()).toString('base64') + '\r\n');
        } else if (text.startsWith('235')) {
            console.log('🎉 AUTHENTICATION SUCCESSFUL!');
            socket.write('QUIT\r\n');
        } else if (text.startsWith('535')) {
            console.log('❌ AUTH FAILED (535)');
            socket.end();
        }
    });

    socket.on('error', (e) => console.error('Socket error:', e.message));
}

debugSmtp('erickdejesustorres02@gmail.com', 'ksyusnybgubqbfep');
