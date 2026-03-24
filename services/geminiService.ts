import { auth } from '../firebase';
import type { FileContent, ModelName, LinkedFile, ExamCategory } from '../types';

const getAiClient = () => {
  return {
    models: {
      generateContent: async (params: any) => {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        
        const baseUrl = 'https://geminiproxy-wzp4zunxda-uc.a.run.app';
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
          },
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(`API Proxy Error [${response.status}]: ${errorMsg}`);
        }
        
        const data = await response.json();
        
        // Polyfill the .text getter matching the SDK behavior
        Object.defineProperty(data, 'text', {
          get: function() {
            return this.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
          }
        });
        
        return data;
      }
    }
  };
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
  } catch (error: any) {
    console.error("AI Search Criteria Error:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      return "⚠️ **API 사용량 한도 초과 (Quota Exceeded)**\n\n현재 설정된 무료 API 키의 검색 한도를 초과했습니다. 잠시 후(1분 뒤) 다시 시도하거나, [Google AI Studio](https://aistudio.google.com/)에서 결제 등록이 된 새 API 키로 교체해 주세요. (또는 수동으로 이 공간에 기준을 붙여넣으셔도 됩니다.)";
    }
    return "채점 기준을 검색하는 중 오류가 발생했습니다. 수동으로 입력해 주세요.";
  }
}


export async function requestEvaluationReport(
  commonData: { category: ExamCategory; university: string; examYear: string; problemType: string; scoringCriteria: string; model: ModelName; problemMaterials: LinkedFile[]; scoringMaterials: LinkedFile[] },
  studentData: { name: string; solutionFiles: File[]; reportTemplate: string },
  generationDate: string
): Promise<{ htmlReport: string, rawReport: string, extractedData: any }> {
  const examLabel = commonData.category === 'essay' ? '수리논술' : '약술형 고사';
  const examInfo = `${commonData.university} ${commonData.examYear} ${commonData.problemType}`.trim();

  // 병렬로 파일 데이터 로드
  const [allReferenceParts, studentSolutionParts] = await Promise.all([
    Promise.all(commonData.problemMaterials.concat(commonData.scoringMaterials).map(l => linkedFileToGenerativePart(l))),
    Promise.all(studentData.solutionFiles.map(file => linkedFileToGenerativePart({ name: file.name, file })))
  ]);

  const essayInstructions = `Detailed logical steps and mathematical reasoning are paramount. Focus on the flow of the essay.`;
  const simpleInstructions = `Focus on key results, essential keywords, and correct final answers. Short-answer exams value accuracy in core steps.`;

  const requestBody = {
    examLabel,
    examInfo,
    scoringCriteria: commonData.scoringCriteria,
    essayInstructions: commonData.category === 'essay' ? essayInstructions : simpleInstructions,
    reportTemplate: studentData.reportTemplate,
    referenceParts: allReferenceParts,
    studentParts: studentSolutionParts,
    model: commonData.model,
    studentName: studentData.name,
    generationDate
  };

  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const baseUrl = 'https://generateevaluationreport-wzp4zunxda-uc.a.run.app';
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    let parsedMsg = errorMsg;
    try {
        const errorJson = JSON.parse(errorMsg);
        parsedMsg = errorJson.error || errorMsg;
    } catch (e) {}
    throw new Error(`API Proxy Error [${response.status}]: ${parsedMsg}`);
  }

  const result = await response.json();
  
  if (result.htmlReport?.includes("분석 오류") || result.htmlReport?.includes("학생 답안지를 판독할 수 없거나")) {
    throw new Error(result.htmlReport);
  }

  return result;
}
