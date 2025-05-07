
const { makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada. Reconectando...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ BOT CONECTADO');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (text?.toLowerCase() === 'hola') {
      await sock.sendMessage(sender, { text: 'Hola, soy el bot de Mxpremiumtv. ¿En qué puedo ayudarte?' });
    }
  });
}

startBot();
