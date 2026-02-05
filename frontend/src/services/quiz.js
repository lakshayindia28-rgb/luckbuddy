function decodeHtml(html) {
  if (typeof document === "undefined") return html;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  return textarea.value;
}

function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function fetchTriviaQuestion({ signal } = {}) {
  const url = "https://opentdb.com/api.php?amount=1&type=multiple";
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Quiz API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data?.results?.[0];
  if (!raw) throw new Error("Quiz API returned no results");

  const question = decodeHtml(raw.question);
  const correctAnswer = decodeHtml(raw.correct_answer);
  const incorrectAnswers = (raw.incorrect_answers || []).map(decodeHtml);
  const options = shuffleArray([correctAnswer, ...incorrectAnswers]);

  return {
    question,
    options,
    correctAnswer,
    category: decodeHtml(raw.category || ""),
    difficulty: decodeHtml(raw.difficulty || "")
  };
}
