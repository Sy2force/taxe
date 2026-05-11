import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../lib/api';

interface SavedData {
  exerciseDocument: any;
  lawsDocument: any;
  savedAnswers: any[];
  allDocuments: any[];
}

interface SavedDataContextType {
  savedData: SavedData;
  reloadSavedData: () => Promise<void>;
}

const SavedDataContext = createContext<SavedDataContextType | undefined>(undefined);

export function SavedDataProvider({ children }: { children: ReactNode }) {
  const [savedData, setSavedData] = useState<SavedData>({
    exerciseDocument: null,
    lawsDocument: null,
    savedAnswers: [],
    allDocuments: []
  });

  const reloadSavedData = async () => {
    try {
      const [exerciseDoc, lawsDoc, answers, docs] = await Promise.all([
        api.getExerciseDocument(),
        api.getLawsDocument(),
        api.getSavedAnswers(),
        api.getAllSavedDocuments()
      ]);
      setSavedData({
        exerciseDocument: exerciseDoc,
        lawsDocument: lawsDoc,
        savedAnswers: answers,
        allDocuments: docs
      });
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  useEffect(() => {
    reloadSavedData();
  }, []);

  return (
    <SavedDataContext.Provider value={{ savedData, reloadSavedData }}>
      {children}
    </SavedDataContext.Provider>
  );
}

export function useSavedData() {
  const context = useContext(SavedDataContext);
  if (context === undefined) {
    throw new Error('useSavedData must be used within a SavedDataProvider');
  }
  return context;
}
