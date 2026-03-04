"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateStudentSolution = void 0;
const functions = require("firebase-functions");
const genai_1 = require("@google/genai");
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Uses environment variable
exports.evaluateStudentSolution = functions.https.onCall(async (data, context) => {
    // Authentication check: Ensure the user is logged in
    // if (!context.auth) {
    //   throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    // }
    const { studentData, formData, examInfo } = data;
    try {
        // 1. Construct the prompt with context from GCS materials (URLs or text)
        // 2. Instruct the model strictly on how to grade
        // Combine the user's specific context with the operational JSON instructions
        const prompt = `
      You are an expert AI assistant specializing in South Korean university entrance exams (수리논술/약술형 고사).
      Find the official scoring criteria, model answers, or detailed solution steps for the following exam: "[${examInfo}]".
      Evaluate the student's solution based on these criteria and key solution points in Korean. Be as specific as possible.

      Additional Criteria Provided: ${formData.scoringCriteria}
      Student Solution Links (Process these): ${studentData.solutionFiles.map((f) => f.url).join(', ')}

      Output ONLY a valid JSON object matching this schema. All text MUST be in Korean markdown format.
      {
        "totalScore": number (총점),
        "strengths": string (강점 분석 요약),
        "weaknesses": string (약점 및 개선점 요약),
        "htmlReportSnippet": string (A styled HTML div summarizing the detailed result and scoring criteria in Korean)
      }
    `;
        // 3. Call Gemini with Deterministic constraints (Solving Consistency Issue)
        const response = await ai.models.generateContent({
            model: formData.model || "gemini-2.5-pro",
            contents: prompt,
            config: {
                temperature: 0.0, // Strict, deterministic output
                responseMimeType: "application/json" // Force structural JSON compliance
            }
        });
        const resultText = response.text; // The new @google/genai SDK uses a property, not a method.
        if (!resultText) {
            throw new Error("No text returned from Gemini.");
        }
        // 4. Parse the strictly formatted JSON
        const parsedResult = JSON.parse(resultText);
        // 5. Build the final report data
        const generationDate = new Date().toLocaleString("ko-KR");
        const finalReport = {
            htmlContent: parsedResult.htmlReportSnippet,
            studentEmail: studentData.email,
            studentName: studentData.name,
            examInfo: examInfo,
            generationDate: generationDate,
            score: parsedResult.totalScore,
            analysis: { strengths: parsedResult.strengths, weaknesses: parsedResult.weaknesses }
        };
        // (Optional) Here, you would also securely save `finalReport` directly to Firestore
        // before returning it to the client, preventing any loss if the browser tab closes.
        return finalReport;
    }
    catch (error) {
        console.error("Evaluation Error:", error);
        throw new functions.https.HttpsError("internal", "Failed to evaluate student solution.");
    }
});
//# sourceMappingURL=index.js.map