const { Keyboard } = require("grammy");
const questions = require("../questions.json");

async function formFlow(conversation, ctx) {
  // Инициализация session через внешнее хранилище
  const session = await conversation.external((ctx) => {
    ctx.session ??= {};
    ctx.session.step ??= 0;
    ctx.session.answers ??= {};
    return { ...ctx.session };
  });
  
  let step = session.step;
  let answers = session.answers;
  
  while (step < questions.length) {
    const q = questions[step];
    let keyboard = null;
    
    if (q.type === "buttons" && Array.isArray(q.options)) {
      const rows = [];
      for (let i = 0; i < q.options.length; i += 2) {
        rows.push(q.options.slice(i, i + 2));
      }
      if (step > 0) rows.push(["⬅️ Назад"]);
      rows.push(["✅ Готово"]);
      keyboard = new Keyboard(rows).resized();
    }
    
    await ctx.reply(
      `🧩 Шаг ${step + 1} из ${questions.length}\n<b>${escapeHTML(q.question)}</b>`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard || { remove_keyboard: true },
      }
    );
    
    const res = await conversation.waitFor("message:text");
    const text = res.message.text.trim();
    
    // Обработка "Готово"
    if (text === "✅ Готово") {
      await ctx.reply("📝", {
        reply_markup: { remove_keyboard: true },
      });
      break;
    }
    
    // Обработка "Назад"
    if (text === "⬅️ Назад" && step > 0) {
      step--;
      continue;
    }
    
    if (q.type === "buttons" && !q.options.includes(text)) {
      await res.reply("Пожалуйста, выберите один из предложенных вариантов.");
      continue;
    }
    
    answers[q.key] = text;
    step++;
  }
  
  // Сохраняем прогресс или финальные ответы
  await conversation.external((ctx) => {
    ctx.session.step = step < questions.length ? step : -1;
    ctx.session.answers = step < questions.length ? answers : {};
  });
  
  if (step < questions.length) {
    await ctx.reply("✅ Прогресс сохранён. Вы можете продолжить позже.");
  } else {
    let result = "<b>Ваши ответы:</b>\n";
    for (const q of questions) {
      result += `\n<b>${escapeHTML(q.question)}</b>\n${answers[q.key] ?? "—"}\n`;
    }
    await ctx.reply(result, {
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true },
    });
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = { formFlow };