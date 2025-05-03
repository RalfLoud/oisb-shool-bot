function formatAnswersHTML(answers, questions) {
  let output = "<b>Результаты:</b>\n";
  for (const q of questions) {
    const a = answers[q.key] || "—";
    output += `\n<b>${q.question}</b>\n${a}\n`;
  }
  return output;
}
module.exports = { formatAnswersHTML };