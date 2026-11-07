const tls = require('tls');

const variants = [
    'erickdejesustorres02@gmail.com',
    'erickdejesustorres@gmail.com',
    'ericktorres02@gmail.com',
    'ericktorres@gmail.com',
    'erickdejesus@gmail.com'
];

async function checkAccount(email, pass) {
    return new Promise((resolve) => {
        const socket = tls.connect(465, 'smtp.gmail.com', { rejectUnauthorized: false }, () => {});
        let authenticated = false;

        socket.on('data', (d) => {
            const text = d.toString();
            if (text.startsWith('220')) {
                socket.write('EHLO localhost\r\n');
            } else if (text.startsWith('250') && text.includes('AUTH')) {
                socket.write('AUTH LOGIN\r\n');
            } else if (text.startsWith('334') && text.includes('VXNlcm5hbWU6')) {
                socket.write(Buffer.from(email.trim()).toString('base64') + '\r\n');
            } else if (text.startsWith('334') && text.includes('UGFzc3dvcmQ6')) {
                socket.write(Buffer.from(pass.replace(/\s+/g, '').trim()).toString('base64') + '\r\n');
            } else if (text.startsWith('235')) {
                authenticated = true;
                socket.write('QUIT\r\n');
                resolve({ email, ok: true });
            } else if (text.startsWith('535')) {
                socket.end();
                resolve({ email, ok: false });
            }
        });

        socket.on('error', () => resolve({ email, ok: false }));
        setTimeout(() => { socket.destroy(); resolve({ email, ok: false }); }, 6000);
    });
}

async function run() {
    for (const v of variants) {
        const res = await checkAccount(v, 'ksyusnybgubqbfep');
        console.log(`Checking ${v} -> ${res.ok ? '✅ AUTENTICADO EXITOSO' : '❌ BadCredentials'}`);
        if (res.ok) break;
    }
}

run();
