import * as functions from "firebase-functions";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); // Uses environment variable

export const evaluateStudentSolution = functions.https.onCall(async (data, context) => {
  // Authentication check: Ensure the user is logged in
  // if (!context.auth) {
  //   throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  // }

  const { studentData, formData, examInfo } = data;

  try {
    // 1. Construct the prompt with context from GCS materials (URLs or text)
    // 2. Instruct the model strictly on how to grade

    const prompt = `
      You are an expert Math logic evaluator.
      Grade the following student solution based on the provided criteria.

      Exam Context: ${examInfo}
      Criteria: ${formData.scoringCriteria}
      Student Solution Links (Process these): ${studentData.solutionFiles.map((f: any) => f.url).join(', ')}

      Output ONLY a valid JSON object matching this schema:
      {
        "totalScore": number,
        "strengths": string,
        "weaknesses": string,
        "htmlReportSnippet": string (A styled HTML div summarizing the result)
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

    const resultText = response.text();
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

  } catch (error) {
    console.error("Evaluation Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to evaluate student solution.");
  }
});
