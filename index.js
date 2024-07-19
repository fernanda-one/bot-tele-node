import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import express from "express";
import TelegramBot from "node-telegram-bot-api";

const app = express();
app.use(express.json());

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: true });

const googleAiToken = process.env.GOOGLE_AI;
const genAI = new GoogleGenerativeAI(googleAiToken);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  systemInstruction:
    "You are a helpful assistant. Please use either Bahasa or English in non-formal text.",
});

// Endpoint untuk menerima pesan dari Telegram
app.post(`/webhook/${botToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Menangani perintah /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Halo! Saya adalah bot Telegram yang terintegrasi dengan Express."
  );
});

bot.onText(/^\/ask(?:\s(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  var message = match[1];

  if (message === "" || !message) {
    return bot.sendMessage(
      chatId,
      "Mohon tuliskan sesuai format, contoh: /ask pertanyaan"
    );
  }

  try {
    const result = await model.generateContent(message);
    const response = await result.response;
    bot.sendMessage(chatId, response.text(), { parse_mode: "Markdown" });
    return;
  } catch (error) {
    console.error("Error:", error);
    bot.sendMessage(chatId, "cannot answer your question!");
    return;
  }
});

bot.onText(/^\/harga(?:\s(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  var type = match[1];

  if (type === null || type === "") {
    return bot.sendMessage(
      chatId,
      "Mohon tuliskan sesuai format, contoh: /harga btc"
    );
  }

  try {
    const response = await axios.get("https://indodax.com/api/summaries", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const reply = response.data;
    const filter = reply.tickers[`${type}_idr`];
    var responseMessage = filter.name + "\r\n";

    responseMessage += "Harga: " + filter.last + "\r\n";
    // responseMessage += 'Beli: ' + filter.buy + '\r\n';
    // responseMessage += 'Jual: ' + filter.sell + '\r\n';
    responseMessage += "Tertinggi 24h: " + filter.high + "\r\n";
    responseMessage += "Terendah 24h: " + filter.low + "\r\n";

    bot.sendMessage(chatId, responseMessage);
    return;
  } catch (error) {
    console.error("Error:", error);
    return;
  }
});

app.listen(3000, () => {
  console.log("Express server is listening on port 3000");
});
