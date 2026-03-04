
import type { FormData, ModelName } from './types';

export const AVAILABLE_MODELS: readonly ModelName[] = [
  'gemini-2.5-flash', 
  'gemini-2.5-pro', 
  'gemini-3-flash-preview', 
  'gemini-3-pro-preview'
];

const getInitialModel = (): ModelName => {
  try {
    const savedModel = localStorage.getItem('preferredAiModel');
    if (savedModel && (AVAILABLE_MODELS as readonly string[]).includes(savedModel)) {
      return savedModel as ModelName;
    }
  } catch (error) {
    console.error("Failed to read preferred model from localStorage:", error);
  }
  return 'gemini-3-flash-preview';
};

const getInitialScoringCriteria = (): string => {
  try {
    const savedCriteria = localStorage.getItem('scoringCriteria_autosave');
    return savedCriteria || '';
  } catch (error) {
    console.error("Failed to read auto-saved scoring criteria from localStorage:", error);
    return '';
  }
};

export const initialFormData: FormData = {
  category: 'essay', // 기본값: 수리논술
  university: '',
  examYear: '',
  problemType: '',
  scoringCriteria: getInitialScoringCriteria(),
  problemMaterials: [],
  scoringMaterials: [],
  students: [],
  model: getInitialModel(),
};
