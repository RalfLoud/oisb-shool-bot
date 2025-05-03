// index.js (updated - session logic largely unchanged)
const { Bot, session, MemorySessionStorage } = require("grammy");
require("dotenv").config();
const { conversations, createConversation } = require("@grammyjs/conversations");
const { setupAdmin } = require("./admin");
const { formFlow } = require("./conversations/formFlow");
const bot = new Bot(process.env.BOT_TOKEN);
const port = process.env.PORT || 4000
// Middleware сессии (RAM storage)

bot.use(session({
  initial: () => ({ step: -1, answers: {} }),  // начальные значения новой сессии
  storage: new MemorySessionStorage()          // хранение в оперативной памяти
}));
// Подключаем conversations и регистрируем нашу беседу

bot.use(conversations());
bot.use(createConversation(formFlow));
// Команда /start – начало или продолжение анкеты

bot.api.setMyCommands([
  { command: "start", description: "Начать анкету" },
  { command: "admin", description: "Админ-панель" },
  { command: "whoami", description: "Узнать свой ID" }
]);


bot.command("start", async (ctx) => {
  if (ctx.session.step !== undefined && ctx.session.step >= 0) {
    // Если есть незавершённая анкета, предлагаем продолжить или начать заново
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
    // Если анкета не начиналась или уже завершена – начинаем новую
    ctx.session.step = 0;
    ctx.session.answers = {};
    await ctx.reply("Давайте начнём новую анкету.");
    await ctx.conversation.enter("formFlow");
  }
});

// Обработка нажатий на кнопки "Продолжить" или "Перезапустить"
bot.on("callback_query:data", async (ctx) => {
  const action = ctx.callbackQuery.data;
  if (action === "continue_form") {
    // Продолжить заполнение с сохраненного шага
    await ctx.answerCallbackQuery();  // убираем "часики" на кнопке
    await ctx.reply("Продолжаем заполнение анкеты с того места, где вы остановились...");
    await ctx.conversation.enter("formFlow");
  } else if (action === "restart_form") {
    // Сбросить прогресс и начать анкету заново
    await ctx.answerCallbackQuery();
    ctx.session.step = 0;
    ctx.session.answers = {};
    await ctx.reply("Анкета начата заново. Заполните её с начала:");
    await ctx.conversation.enter("formFlow");
  }
});

bot.command("whoami", async (ctx) => {
  const user = ctx.from;
  await ctx.reply(`🧾 Информация о тебе:
ID: <code>${user.id}</code>
Имя: ${user.first_name}
Username: @${user.username || "нет"}
`, { parse_mode: "HTML" });
});

setupAdmin(bot);
// Запуск бота (long polling)
bot.start();