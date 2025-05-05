const { Bot, session, MemorySessionStorage } = require("grammy");
require("dotenv").config();
const { conversations, createConversation } = require("@grammyjs/conversations");
const { setupAdmin } = require("./admin");
const { formFlow } = require("./conversations/formFlow");

const bot = new Bot(process.env.BOT_TOKEN);
const port = process.env.PORT || 4000;

// Middleware сессии (RAM storage)
bot.use(session({
  initial: () => ({ step: -1, answers: {}, started: false }),  // добавлен флаг started
  storage: new MemorySessionStorage()
}));

// Подключаем conversations и регистрируем беседу
bot.use(conversations());
bot.use(createConversation(formFlow));

// Регистрируем команды для Telegram
bot.api.setMyCommands([
  { command: "start", description: "Начать анкету" },
  { command: "anketa", description: "Запустить анкету" },
  { command: "admin", description: "Админ-панель" },
  { command: "whoami", description: "Узнать свой ID" }
]);

// Приветствие
function sendWelcome(ctx) {
  ctx.session.started = true;
  return ctx.reply(
    ` Добро пожаловать в бота Школы Саперов Батальона имени генерала Д.М. Карбышева, <b>${ctx.from.first_name}</b>!
Чтобы заполнить анкету на вступление отправь команду <b>/anketa</b>.
По любым вопросам ты можешь связаться с нами по телефону: +7 ххх ххх хх хх или задать вопрос куратору @Куратор`,
    {
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true }
    }
  );
}

// Команда /start
bot.command("start", async (ctx) => {
  if (!ctx.session.started) await sendWelcome(ctx);
  else await ctx.reply("Вы уже начали. Используйте /anketa для прохождения анкеты.");
});

// Команда анкеты
bot.command("anketa", async (ctx) => {
  if (ctx.session.step !== undefined && ctx.session.step >= 0) {
    await ctx.reply(
      "У вас есть незавершённая анкета. Хотите продолжить или начать заново?",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "▶️ Продолжить", callback_data: "continue_form" }],
            [{ text: "🔄 Перезапустить", callback_data: "restart_form" }]
          ]
        }
      }
    );
  } else {
    ctx.session.step = 0;
    ctx.session.answers = {};
    await ctx.reply("Давайте начнём новую анкету.");
    await ctx.conversation.enter("formFlow");
  }
});

// Кнопки: Продолжить / Перезапустить
bot.on("callback_query:data", async (ctx) => {
  const action = ctx.callbackQuery.data;
  await ctx.answerCallbackQuery();
  
  if (action === "continue_form") {
    await ctx.reply("Продолжаем заполнение анкеты с того места, где вы остановились...");
    await ctx.conversation.enter("formFlow");
  } else if (action === "restart_form") {
    ctx.session.step = 0;
    ctx.session.answers = {};
    await ctx.reply("Анкета начата заново. Заполните её с начала:");
    await ctx.conversation.enter("formFlow");
  }
});

// Команда /whoami
bot.command("whoami", async (ctx) => {
  const user = ctx.from;
  await ctx.reply(`🧾 Информация о тебе:
ID: <code>${user.id}</code>
Имя: ${user.first_name}
Username: @${user.username || "нет"}`, { parse_mode: "HTML" });
});
setupAdmin(bot);
// Приветствие на любое первое сообщение
bot.on("message", async (ctx) => {
  if (!ctx.session.started) {
    await sendWelcome(ctx);
  }
});

// Админка


// Запуск бота
bot.start();