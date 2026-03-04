
import { GoogleGenAI } from "@google/genai";
import type { FileContent, ModelName, LinkedFile, ExamCategory } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Critical Error: API_KEY is missing from the environment.");
    throw new Error("API_KEY environment variable not set");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * URL에서 파일을 가져와 Base64로 변환합니다.
 * FileReader를 사용하여 대용량 파일 처리 시 스택 초과 및 성능 저하를 방지합니다.
 */
async function fetchFileFromUrl(url: string): Promise<FileContent> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          mimeType: blob.type || 'application/pdf',
          data: base64Data,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to fetch file from URL:", url, error);
    throw error;
  }
}

async function linkedFileToGenerativePart(linked: LinkedFile): Promise<FileContent> {
  if (linked.file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ 
          mimeType: linked.file!.type, 
          data: (reader.result as string).split(',')[1] 
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(linked.file!);
    });
  } else if (linked.url) {
    return await fetchFileFromUrl(linked.url);
  }
  throw new Error("Invalid LinkedFile: No file or URL provided");
}

export async function searchScoringCriteria(university: string, year: string, problemType: string, model: ModelName): Promise<string> {
  const ai = getAiClient();
  const examInfo = `${university} ${year} ${problemType}`.trim();
  const prompt = `
    You are an expert AI assistant specializing in South Korean university entrance exams (수리논술/약술형 고사).
    Find the official scoring criteria, model answers, or detailed solution steps for the following exam: "${examInfo}".
    Output ONLY the criteria and key solution points in Korean markdown format. Be as specific as possible.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    let text = response.text?.trim() || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      const uniqueLinks = new Set<string>();
      let sourceText = "\n\n### 참고 자료 (Google Search)\n";
      let hasSources = false;
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title && !uniqueLinks.has(chunk.web.uri)) {
          uniqueLinks.add(chunk.web.uri);
          sourceText += `- [${chunk.web.title}](${chunk.web.uri})\n`;
          hasSources = true;
        }
      });
      if (hasSources) text += sourceText;
    }
    return text;
  } catch (error) {
    console.error("AI Search Criteria Error:", error);
    return "채점 기준을 검색하는 중 오류가 발생했습니다. 수동으로 입력해 주세요.";
  }
}

export async function gradeSolutionAndGenerateFeedback(
  commonData: { category: ExamCategory; university: string; examYear: string; problemType: string; scoringCriteria: string; model: ModelName; problemMaterials: LinkedFile[]; scoringMaterials: LinkedFile[] },
  studentData: { name: string; solutionFiles: File[]; reportTemplate: string }
): Promise<string> {
  const ai = getAiClient();
  const examLabel = commonData.category === 'essay' ? '수리논술' : '약술형 고사';
  
  // 병렬로 파일 데이터 로드
  const [allReferenceParts, studentSolutionParts] = await Promise.all([
    Promise.all(commonData.problemMaterials.concat(commonData.scoringMaterials).map(l => linkedFileToGenerativePart(l))),
    Promise.all(studentData.solutionFiles.map(file => linkedFileToGenerativePart({ name: file.name, file })))
  ]);

  const essayInstructions = `Detailed logical steps and mathematical reasoning are paramount. Focus on the flow of the essay.`;
  const simpleInstructions = `Focus on key results, essential keywords, and correct final answers. Short-answer exams value accuracy in core steps.`;

  const prompt = `
    You are 'Questio AI Engine', a rigorous and highly critical AI professor specializing in university-level ${examLabel} grading. 
    Your task is to evaluate student solutions with extreme precision and zero tolerance for hallucinations.

    # Context:
    - Student: ${studentData.name}
    - Exam Type: ${examLabel}
    - Exam Info: ${commonData.university} ${commonData.examYear} ${commonData.problemType}
    - Scoring Criteria: ${commonData.scoringCriteria}
    ${commonData.category === 'essay' ? essayInstructions : simpleInstructions}
    ${studentData.reportTemplate ? `- Special Instructions: ${studentData.reportTemplate}` : ''}

    # Strict Grading Rules:
    1. **Evidence-Based Only**: Grade ONLY what is explicitly visible in the student's solution images/PDFs. If a problem or a sub-problem is missing, it MUST receive 0 points.
    2. **Strict Deduction**: If the logic is flawed, even if the final answer is correct, deduct points according to the scoring criteria.
    3. **No Assumptions**: Do not assume the student "meant" something if it's not written.
    4. **Verification Step**: Before grading, identify which problems are present in the student's solution. If a problem mentioned in the 'Scoring Criteria' is not found in the 'Student Solution', mark it as 'Not Attempted'.
    5. **Mathematical Precision**: Use LaTeX ($...$) for ALL mathematical notations. 
       - **IMPORTANT**: If you include Korean text inside LaTeX, you MUST wrap it in \\text{...} (e.g., $\\text{한글 수식}$). 
       - **NEVER** write Korean text directly inside LaTeX without \\text{...}.
    6. **Comparison**: Directly compare the student's steps with the 'Scoring/Solution Materials' provided.

    # Output Structure (Korean Markdown):
    ## 1. 문제 식별 및 응시 여부
    (학생이 실제로 푼 문제와 풀지 않은 문제를 리스트업 하세요.)

    ## 2. 총점 (획득점수/만점)
    (응시하지 않은 문제는 0점 처리하여 합산하세요.)

    ## 3. 채점 기준별 상세 점수 (Table format)
    | 문항/기준 | 배점 | 획득 점수 | 감점 사유 및 근거 |
    | :--- | :--- | :--- | :--- |

    ## 4. 문제별 상세 평가
    (강점, 약점, 모범 답안과 구체적인 차이점 기술)

    ## 5. 총평 및 학습 개선 피드백
    (논리적 비약이 있는 부분, 보완해야 할 개념 등을 엄격하게 지적하세요.)
  `;

  const config: any = {};
  if (commonData.model.includes('pro')) config.thinkingConfig = { thinkingBudget: 16000 };
  else config.thinkingConfig = { thinkingBudget: 4000 };

  const response = await ai.models.generateContent({
    model: commonData.model,
    contents: {
      parts: [
        { text: "### SYSTEM INSTRUCTIONS ###\n" + prompt },
        { text: "\n\n### REFERENCE MATERIALS (PROBLEMS & SCORING CRITERIA) ###\n" },
        ...allReferenceParts.map(p => ({ inlineData: p })),
        { text: "\n\n### STUDENT SOLUTION (TO BE GRADED) ###\n" },
        ...studentSolutionParts.map(p => ({ inlineData: p })),
      ],
    },
    config,
  });

  return response.text || "결과를 생성할 수 없습니다.";
}

export async function formatReportToHtml(rawReport: string, commonData: { university: string; examYear: string; problemType: string; model: ModelName }, studentName: string, generationDate: string): Promise<string> {
  const ai = getAiClient();
  const examInfo = `${commonData.university} ${commonData.examYear} ${commonData.problemType}`.trim();
  const prompt = `Convert this math exam evaluation report into a clean, modern Tailwind CSS HTML document. 
  Theme: stone-900 background, stone-300 text.
  Header should include: Exam Info: ${examInfo}, Date: ${generationDate}, Student: ${studentName}.
  Preserve all LaTeX ($...$). 
  **IMPORTANT**: Ensure all Korean text inside LaTeX is correctly formatted with \\text{...} (e.g., $\\text{한글}$) if it isn't already.
  Ensure tables have proper borders and padding.
  \n\nReport Content:\n${rawReport}`;
  
  const response = await ai.models.generateContent({ model: commonData.model, contents: prompt });
  return (response.text || "").replace(/```html|```/g, "").trim();
}

export async function extractReportData(rawReport: string, model: ModelName) {
  const ai = getAiClient();
  const prompt = `Extract evaluation data as JSON. Ensure fields: totalScore (number), maxScore (number), weaknesses (string array), strengths (string array), conceptWeaknesses (array of {concept, category, count, details}), coreCompetencies (object {problemSolving, writingAbility, calculationAccuracy} scores out of 100), criteriaScores (array). 
  Report content:\n${rawReport}`;
  
  try {
    const response = await ai.models.generateContent({ 
      model, 
      contents: prompt, 
      config: { responseMimeType: "application/json" } 
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("JSON Extraction Error:", e);
    return {};
  }
}
