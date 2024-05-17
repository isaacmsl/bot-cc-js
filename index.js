const TelegramBot = require('node-telegram-bot-api');
const { query } = require('./utils/ai');
const logger = require('./utils/logger');
require('dotenv').config();
const express = require('express');

const app = express();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
    if (!msg.text.startsWith('!bot')) 
        return;
    
    const chatId = msg.chat.id;
    const messageText = msg.text;
    
    logger.info(`Received message: ${messageText}`);
    logger.info(`From: ${msg.from.username}`);

    try {
        const answer = await query(messageText);
        if (!answer) throw new Error('A IA não produziu resposta'); 
        logger.info(`Answer: ${answer}`);
        bot.sendMessage(chatId, answer, { parse_mode: 'Markdown' });
    } catch (error) {
        logger.error(error);
        bot.sendMessage(chatId, 'Desculpe, não consigo responder a sua pergunta. Podemos tentar outra vez');
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(process.env.PORT, () => {
    logger.info(`Server running on port ${process.env.PORT}`);
});