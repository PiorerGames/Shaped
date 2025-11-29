import { createContext, useContext, useState, ReactNode } from "react";
import { ExerciseSearchResult } from "@/lib/exerciseAPI";

interface ExerciseSelectionContextType {
  selectedExercise: ExerciseSearchResult | null;
  setSelectedExercise: (exercise: ExerciseSearchResult | null) => void;
}

const ExerciseSelectionContext = createContext<
  ExerciseSelectionContextType | undefined
>(undefined);

export function ExerciseSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseSearchResult | null>(null);

  return (
    <ExerciseSelectionContext.Provider
      value={{ selectedExercise, setSelectedExercise }}
    >
      {children}
    </ExerciseSelectionContext.Provider>
  );
}

export function useExerciseSelection() {
  const context = useContext(ExerciseSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useExerciseSelection must be used within an ExerciseSelectionProvider"
    );
  }
  return context;
}
