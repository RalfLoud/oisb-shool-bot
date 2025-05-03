const { Keyboard } = require("grammy");
const fs = require("fs");
const path = require("path");
const { isAdmin } = require("./helpers/isAdmin");

const QUESTIONS_PATH = path.join(__dirname, "questions.json");

function loadQuestions() {
  return JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8"));
}

function saveQuestions(questions) {
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2), "utf-8");
}

function setupAdmin(bot) {
  bot.command("admin", async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("🚫 У вас нет доступа.");
    ctx.session.adminStep = null;
    await ctx.reply("🔧 Админ-меню:", {
      reply_markup: new Keyboard([
        ["➕ Добавить вопрос", "📋 Список вопросов"],
        ["✏️ Редактировать вопрос", "❌ Удалить вопрос"],
        ["🔙 Выйти"]
      ]).resized(),
    });
  });
  
  bot.hears(["➕ Добавить вопрос", "❌ Удалить вопрос", "✏️ Редактировать вопрос"], async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.reply("🚫 У вас нет доступа.");
    const text = ctx.message.text;
    
    if (text === "➕ Добавить вопрос") {
      ctx.session.adminStep = "add_question_text";
      return await ctx.reply("Введите текст нового вопрос:");
    }
    
    if (text === "❌ Удалить вопрос") {
      ctx.session.adminStep = "delete_question_index";
      return await ctx.reply("Введите номер вопроса для удаления:");
    }
    
    if (text === "✏️ Редактировать вопрос") {
      ctx.session.adminStep = "edit_question_index";
      return await ctx.reply("Введите номер вопроса для редактирования:");
    }
  });
  
  bot.hears("📋 Список вопросов", async (ctx) => {
    const questions = loadQuestions();
    const list = questions.map((q, i) => `${i + 1}. ${q.question} (${q.type})`).join("\n");
    await ctx.reply("<b>Вопросы:</b>\n" + (list || "Нет вопросов."), { parse_mode: "HTML" });
  });
  
  bot.hears("🔙 Выйти", async (ctx) => {
    ctx.session.adminStep = null;
    await ctx.reply("Выход из админ-режима.", { reply_markup: { remove_keyboard: true } });
  });
  
  bot.on("message:text", async (ctx) => {
    const step = ctx.session.adminStep;
    if (!step || !(await isAdmin(ctx))) return;
    
    const text = ctx.message.text;
    
    if (step === "add_question_text") {
      ctx.session.newQuestion = { question: text };
      ctx.session.adminStep = "add_question_type";
      return ctx.reply("Введите тип вопроса: 'text' или 'buttons'");
    }
    
    if (step === "add_question_type") {
      if (!["text", "buttons"].includes(text)) return ctx.reply("Тип должен быть 'text' или 'buttons'");
      ctx.session.newQuestion.type = text;
      
      if (text === "buttons") {
        ctx.session.adminStep = "add_question_options";
        return ctx.reply("Введите варианты кнопок через запятую:");
      } else {
        const questions = loadQuestions();
        questions.push(ctx.session.newQuestion);
        saveQuestions(questions);
        ctx.session.adminStep = null;
        return ctx.reply("✅ Вопрос добавлен.");
      }
    }
    
    if (step === "add_question_options") {
      ctx.session.newQuestion.options = text.split(",").map((o) => o.trim());
      const questions = loadQuestions();
      questions.push(ctx.session.newQuestion);
      saveQuestions(questions);
      ctx.session.adminStep = null;
      return ctx.reply("✅ Вопрос с кнопками добавлен.");
    }
    
    if (step === "delete_question_index") {
      const index = parseInt(text) - 1;
      const questions = loadQuestions();
      if (isNaN(index) || index < 0 || index >= questions.length) return ctx.reply("Неверный номер.");
      questions.splice(index, 1);
      saveQuestions(questions);
      ctx.session.adminStep = null;
      return ctx.reply("✅ Вопрос удалён.");
    }
    
    if (step === "edit_question_index") {
      const index = parseInt(text) - 1;
      const questions = loadQuestions();
      if (isNaN(index) || index < 0 || index >= questions.length) return ctx.reply("Неверный номер.");
      ctx.session.editingIndex = index;
      ctx.session.adminStep = "edit_question_text";
      return ctx.reply("Введите новый текст вопроса:");
    }
    
    if (step === "edit_question_text") {
      const questions = loadQuestions();
      const index = ctx.session.editingIndex;
      questions[index].question = text;
      ctx.session.adminStep = "edit_question_type";
      saveQuestions(questions);
      return ctx.reply("Введите тип вопроса: 'text' или 'buttons'");
    }
    
    if (step === "edit_question_type") {
      if (!["text", "buttons"].includes(text)) return ctx.reply("Тип должен быть 'text' или 'buttons'");
      const questions = loadQuestions();
      const index = ctx.session.editingIndex;
      questions[index].type = text;
      
      if (text === "buttons") {
        ctx.session.adminStep = "edit_question_options";
        saveQuestions(questions);
        return ctx.reply("Введите новые варианты кнопок через запятую:");
      } else {
        delete questions[index].options;
        saveQuestions(questions);
        ctx.session.adminStep = null;
        return ctx.reply("✅ Вопрос обновлён.");
      }
    }
    
    if (step === "edit_question_options") {
      const questions = loadQuestions();
      const index = ctx.session.editingIndex;
      questions[index].options = text.split(",").map((o) => o.trim());
      saveQuestions(questions);
      ctx.session.adminStep = null;
      return ctx.reply("✅ Вопрос обновлён.");
    }
  });
}

module.exports = { setupAdmin };