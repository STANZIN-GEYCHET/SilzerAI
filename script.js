

import {
  getDocument,
  GlobalWorkerOptions
} from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";


GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const GEMINI_API_KEY = "const GEMINI_API_KEY = "AQ.Ab8RN6It0LH8dCw3kYwKqzK_RVP5Zw8L7rgH4bt4muQOIljvlw";
const uploadButton =
  document.getElementById("uploadButton");

const pdfInput =
  document.getElementById("pdfInput");

const bookStatus =
  document.getElementById("bookStatus");

const searchButton =
  document.getElementById("searchButton");

const questionInput =
  document.getElementById("questionInput");

const searchResults =
  document.getElementById("searchResults");

const micButton =
  document.getElementById("micButton");


/* =========================
   PDF UPLOAD
========================= */

uploadButton.addEventListener(
  "click",
  () => {
    pdfInput.click();
  }
);


/* =========================
   READ PDF
========================= */

pdfInput.addEventListener(
  "change",
  async () => {

    const file =
      pdfInput.files[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {

      alert(
        "Please select a PDF textbook."
      );

      pdfInput.value = "";

      return;
    }

    uploadButton.textContent =
      "Reading textbook...";

    bookStatus.textContent =
      "Reading your textbook...";


    try {

      const data =
        new Uint8Array(
          await file.arrayBuffer()
        );


      const pdf =
        await getDocument({
          data: data
        }).promise;


      let fullText = "";


      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {

        const page =
          await pdf.getPage(
            pageNumber
          );


        const content =
          await page.getTextContent();


        const pageText =
          content.items
            .map(
              item => item.str || ""
            )
            .join(" ");


        fullText +=
          pageText + "\n\n";
      }


      window.textbookText =
        fullText;


      uploadButton.textContent =
        "✓ Textbook loaded";


      bookStatus.textContent =
        "✓ " +
        file.name +
        " • " +
        pdf.numPages +
        " pages";


      alert(
        "Textbook loaded successfully!\n\n" +
        pdf.numPages +
        " pages read."
      );


    } catch (error) {

      console.error(
        "PDF ERROR:",
        error
      );


      uploadButton.textContent =
        "Upload textbook";


      bookStatus.textContent =
        "Couldn't read this PDF";


      alert(
        "SILZER couldn't read this PDF.\n\n" +
        error.message
      );
    }

  }
);


/* =========================
   STRUCTURED TEXTBOOK SEARCH
========================= */

searchButton.addEventListener(
  "click",
  searchWithAI
);


function searchTextbook() {

  const query =
    questionInput.value.trim();


  if (!query) {

    alert("Enter a topic first.");

    return;
  }


  if (!window.textbookText) {

    alert(
      "Please upload a textbook first."
    );

    return;
  }


  const text =
    window.textbookText;


  const words =
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/\s+/)
      .filter(
        word => word.length > 2
      );


  const sections =
    text
      .split(/\n\s*\n/)
      .filter(
        section =>
          section.trim().length > 30
      );


  const matches = [];


  sections.forEach(
    section => {

      const lowerSection =
        section.toLowerCase();

      let score = 0;


      words.forEach(
        word => {

          const count =
            lowerSection
              .split(word)
              .length - 1;

          score += count;

        }
      );


      if (score > 0) {

        matches.push({
          text: section.trim(),
          score: score
        });

      }

    }
  );


  matches.sort(
    (a, b) =>
      b.score - a.score
  );


  searchResults.style.display =
    "block";


  if (matches.length === 0) {

    searchResults.innerHTML = `
      <div class="notes-card">

        <h2>No material found</h2>

        <p>
          SILZER couldn't find material
          related to
          <strong>${query}</strong>
          in this textbook.
        </p>

      </div>
    `;

    return;
  }


  const topResults =
    matches.slice(0, 6);


  /*
    Create structured sections.
  */

  let resultHTML = `

    <div class="notes-card">

      <div class="notes-header">

        <span class="notes-label">
          SILZER NOTES
        </span>

        <h2>
          ${query}
        </h2>

        <p>
          Based on your uploaded textbook
        </p>

      </div>


      <div class="notes-section">

        <h3>
          📖 Relevant textbook material
        </h3>

  `;


  topResults.forEach(
    (result, index) => {

      resultHTML += `

        <div class="textbook-result">

          <div class="result-number">
            ${index + 1}
          </div>

          <div class="result-content">

            <p>
              ${result.text}
            </p>

          </div>

        </div>

      `;

    }
  );


  resultHTML += `

      </div>


      <div class="notes-section">

        <h3>
          📌 Key points
        </h3>

        <ul class="key-points">
  `;


  /*
    Create simple key points
    from the most relevant sentences.
  */

  const allSentences =
    topResults
      .map(result => result.text)
      .join(" ")
      .split(/[.!?]+/)
      .map(
        sentence =>
          sentence.trim()
      )
      .filter(
        sentence =>
          sentence.length > 30
      );


  const keyPoints =
    allSentences.slice(0, 5);


  keyPoints.forEach(
    point => {

      resultHTML += `
        <li>
          ${point}.
        </li>
      `;

    }
  );


  resultHTML += `

        </ul>

      </div>


      <div class="notes-footer">

        <span>
          ${topResults.length}
          relevant sections found
        </span>

      </div>

    </div>

  `;


  searchResults.innerHTML =
    resultHTML;
}
/* =========================
   GEMINI AI
========================= */
async function askGemini(prompt) {

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent";


  for (let attempt = 1; attempt <= 4; attempt++) {

    const response = await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );


    /* =========================
       SUCCESS
    ========================= */

    if (response.ok) {

      const data =
        await response.json();

      return data
        .candidates[0]
        .content
        .parts[0]
        .text;
    }


    const errorText =
      await response.text();


    console.error(
      "Gemini API error:",
      errorText
    );


    /* =========================
       DAILY QUOTA EXCEEDED
    ========================= */

    if (response.status === 429) {

      throw new Error(
        "Today's limit has been reached. " +
        "Please try again after the quota resets."
      );
    }


    /* =========================
       OTHER ERRORS
    ========================= */

    if (response.status !== 503) {

      throw new Error(
        "Gemini API error (" +
        response.status +
        "): " +
        errorText
      );
    }


    /* =========================
       TEMPORARY 503
    ========================= */

    if (attempt < 4) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            2000 * Math.pow(2, attempt - 1)
          )
      );

    }

  }


  throw new Error(
    "Gemini is temporarily unavailable. Please try again later."
  );
}

async function searchWithAI() {

  const query =
    questionInput.value.trim();

  if (!query) {
    alert("Enter a topic first.");
    return;
  }

  if (!window.textbookText) {
    alert("Please upload a textbook first.");
    return;
  }

  searchResults.style.display = "block";

  searchResults.innerHTML = `
    <div class="notes-card">
      <h2>Thinking...</h2>
      <p>SILZER is studying your textbook.</p>
    </div>
  `;


  try {

 const words =
  query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2);


const sections =
  window.textbookText
    .split(/\n\s*\n/)
    .filter(
      section =>
        section.trim().length > 40
    );


const relevantSections = [];


sections.forEach(section => {

  const lowerSection =
    section.toLowerCase();

  let score = 0;

  words.forEach(word => {

    const count =
      lowerSection
        .split(word)
        .length - 1;

    score += count;

  });


  if (score > 0) {

    relevantSections.push({
      text: section.trim(),
      score: score
    });

  }

});


relevantSections.sort(
  (a, b) =>
    b.score - a.score
);


const textbookMaterial =
  relevantSections
    .slice(0, 8)
    .map(section => section.text)
    .join("\n\n")
    .slice(0, 30000);


const prompt = `
You are SILZER, an AI study assistant for a Class 11 student.

The student asked:

${query}

Use the following relevant material from the student's
uploaded textbook as your main source:

TEXTBOOK MATERIAL:
${textbookMaterial}

Give a clear and organized explanation suitable for Class 11.

Formatting rules:
- Use simple headings.
- Use normal numbered lists when needed.
- Do not use Markdown symbols such as **, *, #, ##, or backticks.
- Do not use decorative symbols or emojis.
- Keep mathematical symbols such as =, +, −, ×, ÷ when necessary.
- Keep the language simple and easy to understand.
- Do not make the answer unnecessarily long.

Your answer MUST follow this exact structure:

SIMPLE EXPLANATION
Explain the topic in simple Class 11 language.

KEY CONCEPTS
List the most important concepts.

IMPORTANT POINTS
Give the points a student should remember.

FORMULA
Give important formulas only if they are relevant.

EXAMPLE
Give one simple example if useful.

Do not add extra sections unless they are genuinely necessary.

Use the textbook material as the main source.
Do not invent textbook-specific information.
`;


    const answer =
      await askGemini(prompt);


searchResults.innerHTML = `
  <div class="notes-card">

    <div class="notes-header">

      <span class="notes-label">
        SILZER AI NOTES
      </span>

      <h2>
        ${query}
      </h2>

      <p>
        Based on your uploaded textbook
      </p>

    </div>


    <div class="notes-section">

      <h3>
        Explanation
      </h3>

      <div class="ai-answer">
  ${answer
    .replace(
      /SIMPLE EXPLANATION/g,
      '<div class="ai-heading">Simple explanation</div>'
    )
    .replace(
      /KEY CONCEPTS/g,
      '<div class="ai-heading">Key concepts</div>'
    )
    .replace(
      /IMPORTANT POINTS/g,
      '<div class="ai-heading">Important points</div>'
    )
    .replace(
      /FORMULA/g,
      '<div class="ai-heading">Formula</div>'
    )
    .replace(
      /EXAMPLE/g,
      '<div class="ai-heading">Example</div>'
    )
    .replace(/\n/g, "<br>")}
</div>

    </div>
<div class="ai-actions">

  <button
    class="ai-action-button"
    id="simplifyButton"
  >
    Simplify
  </button>


<button
  class="ai-action-button"
  id="revisionButton"
>
  Revision notes
</button>

</div>

    <div class="notes-footer">

      SILZER • AI-generated study notes

    </div>

  </div>
`;
const simplifyButton =
  document.getElementById(
    "simplifyButton"
  );


simplifyButton.addEventListener(
  "click",
  async () => {

    simplifyButton.textContent =
      "Simplifying...";

    try {

      const simplified =
        await askGemini(`
Simplify the following study notes
for a Class 11 student.

Keep the important information,
formulas, and meaning.

Use very simple language.

Do not use Markdown symbols,
decorative symbols, or emojis.

NOTES:

${answer}
`);


      const answerBox =
        document.querySelector(
          ".ai-answer"
        );


      answerBox.innerHTML =
        simplified.replace(
          /\n/g,
          "<br>"
        );


      simplifyButton.textContent =
        "Simplified ✓";

    } catch (error) {

      console.error(error);

      simplifyButton.textContent =
        "Simplify";

      alert(
        error.message
      );

    }

  }
);

    const revisionButton =
  document.getElementById(
    "revisionButton"
  );

revisionButton.addEventListener(
  "click",
  async () => {

    revisionButton.textContent =
      "Creating...";

    try {

      const revision =
        await askGemini(`
Create short revision notes from
the following Class 11 study notes.

Include only the most important:

- concepts
- definitions
- formulas
- facts
- points to remember

Make the notes quick to revise.

Use simple language.

Do not use Markdown symbols,
decorative symbols, or emojis.

NOTES:

${answer}
`);

      const answerBox =
        document.querySelector(
          ".ai-answer"
        );

      answerBox.innerHTML =
        revision.replace(
          /\n/g,
          "<br>"
        );

      revisionButton.textContent =
        "Revision notes ✓";

    } catch (error) {

      console.error(error);

      revisionButton.textContent =
        "Revision notes";

      alert(
        error.message
      );

    }

  }
);

    
} catch (error) {

  console.error(error);

  searchResults.innerHTML = `
    <div class="notes-card">

      <h2>
        Gemini error
      </h2>

      <p style="word-break: break-word;">
        ${error.message}
      </p>

    </div>
  `;
  }
}

/* =========================
   VOICE INPUT
========================= */

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (!SpeechRecognition) {

  micButton.addEventListener(
    "click",
    () => {

      alert(
        "Voice input is not supported in this browser."
      );

    }
  );

} else {

  const recognition =
    new SpeechRecognition();


  recognition.lang = "en-IN";

  recognition.continuous = false;

  recognition.interimResults = false;


  micButton.addEventListener(
    "click",
    () => {

      try {

        recognition.start();

        micButton.textContent = "🗣️";

      } catch (error) {

        console.log(error);

      }

    }
  );


  recognition.onresult =
    (event) => {

      const text =
        event.results[0][0].transcript;

      questionInput.value =
        text;

    };


  recognition.onend =
    () => {

      micButton.textContent = "🎙";

    };


  recognition.onerror =
    (event) => {

      console.error(
        "Speech recognition:",
        event.error
      );

      micButton.textContent = "🎙";


      if (event.error === "not-allowed") {

        alert(
          "Microphone permission was denied. " +
          "Please allow microphone access for SILZER."
        );

      }

    };

}
