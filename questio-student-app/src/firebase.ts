import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs, where, startAfter } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBs0rVgZPmH5ngL0Z90fZHytl4Ekurg_0E",
    authDomain: "questio-ai-b2b.firebaseapp.com",
    projectId: "questio-ai-b2b",
    storageBucket: "questio-ai-b2b.firebasestorage.app",
    messagingSenderId: "321541018701",
    appId: "1:321541018701:web:23eca04b49e688392f3804",
    measurementId: "G-25F8B2M1JT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Data Types
export interface QuestionData {
    id: string;
    assetId: string;
    university: string;
    year: string;
    category: string;
    title: string;
    tags: string[];
    questionLink?: string;
    solutionLink?: string;
    createdAt?: any;
}

export const getQuestions = async (lastDoc?: any, pageSize = 20, filterUniversity?: string): Promise<{ data: QuestionData[], lastDoc: any }> => {
    try {
        const questionsRef = collection(db, "questions");
        let q = query(questionsRef, orderBy("createdAt", "desc"));

        if (filterUniversity) {
            // Note: In a production app with complex tags, array-contains might be better.
            // Using precise exact match for university for now.
            q = query(questionsRef, where("university", "==", filterUniversity), orderBy("createdAt", "desc"));
        }

        if (lastDoc) {
            q = query(q, startAfter(lastDoc), limit(pageSize));
        } else {
            q = query(q, limit(pageSize));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionData));
        const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

        return { data, lastDoc: newLastDoc };
    } catch (error) {
        console.error("Error fetching questions:", error);
        return { data: [], lastDoc: null };
    }
};
