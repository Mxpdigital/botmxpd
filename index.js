
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const fs = require('fs');
const qrcode = require('qrcode');
const { makeInMemoryStore } = require('@whiskeysockets/baileys');
const { join } = require('path');

// Autenticación
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

const app = express();
const PORT = process.env.PORT || 3000;

// QR image path
const QR_IMAGE_PATH = join(__dirname, 'public', 'qr.png');
fs.mkdirSync('public', { recursive: true });

// Crear servidor Express para mostrar el QR
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.send('<h1>Escanea el código QR</h1><img src="/qr.png" />');
});
app.listen(PORT, () => console.log(`Servidor web corriendo en http://localhost:${PORT}`));

// Crear conexión
async function startSock() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            await qrcode.toFile(QR_IMAGE_PATH, qr);
            console.log('Código QR actualizado y guardado en qr.png');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada. ¿Reconectar?', shouldReconnect);
            if (shouldReconnect) {
                startSock();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot conectado a WhatsApp');
        }
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('messages.upsert', async (msg) => {
        const m = msg.messages[0];
        if (!m.message || m.key.fromMe) return;

        const text = m.message.conversation?.toLowerCase() || '';
        let response = 'No entendí tu mensaje 🤖. Puedes preguntar por precios, canales o soporte.';

        if (text.includes('hola') || text.includes('buenas')) {
            response = '¡Hola! Bienvenido a Mxpremiumtv 🙌';
        } else if (text.includes('precio')) {
            response = 'Nuestros precios son: $10 al mes, $25 por tres meses, $40 por seis meses.';
        } else if (text.includes('canales')) {
            response = 'Contamos con más de 200 canales en vivo de deportes, entretenimiento, cine y más.';
        } else if (text.includes('soporte')) {
            response = 'Puedes contactar a nuestro soporte enviando un mensaje a este mismo número.';
        }

        await sock.sendMessage(m.key.remoteJid, { text: response });
    });
}

startSock();
