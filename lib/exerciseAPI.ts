import axios from "axios";

// Free wger.de API - no authentication required
const API_BASE_URL = "https://wger.de/api/v2";

export interface ExerciseSearchResult {
  id: string;
  name: string;
  category: string;
  equipment: string[];
  muscles: string[];
  muscles_secondary: string[];
  description: string;
  gifUrl?: string;
  bodyPart?: string;
  target?: string;
}

// Basic exercises fallback (if API fails)
export const BASIC_EXERCISES: ExerciseSearchResult[] = [
  {
    id: "basic_1",
    name: "Bench Press",
    category: "chest",
    equipment: ["barbell"],
    muscles: ["chest"],
    muscles_secondary: ["triceps", "shoulders"],
    description: "Lie on bench, lower barbell to chest, press up"
  },
  {
    id: "basic_2",
    name: "Squat",
    category: "legs",
    equipment: ["barbell"],
    muscles: ["quadriceps", "glutes"],
    muscles_secondary: ["hamstrings", "core"],
    description: "Bar on back, squat down keeping back straight"
  },
  {
    id: "basic_3",
    name: "Deadlift",
    category: "back",
    equipment: ["barbell"],
    muscles: ["back", "glutes", "hamstrings"],
    muscles_secondary: ["core", "forearms"],
    description: "Lift barbell from ground to standing position"
  },
  {
    id: "basic_4",
    name: "Pull-ups",
    category: "back",
    equipment: ["bodyweight"],
    muscles: ["lats", "back"],
    muscles_secondary: ["biceps", "forearms"],
    description: "Hang from bar, pull body up until chin over bar"
  },
  {
    id: "basic_5",
    name: "Overhead Press",
    category: "shoulders",
    equipment: ["barbell"],
    muscles: ["shoulders"],
    muscles_secondary: ["triceps", "core"],
    description: "Press barbell from shoulders to overhead"
  },
  {
    id: "basic_6",
    name: "Barbell Row",
    category: "back",
    equipment: ["barbell"],
    muscles: ["back", "lats"],
    muscles_secondary: ["biceps", "core"],
    description: "Bend over, pull barbell to lower chest"
  },
  {
    id: "basic_7",
    name: "Dumbbell Curl",
    category: "arms",
    equipment: ["dumbbell"],
    muscles: ["biceps"],
    muscles_secondary: ["forearms"],
    description: "Curl dumbbells from sides to shoulders"
  },
  {
    id: "basic_8",
    name: "Tricep Dips",
    category: "arms",
    equipment: ["bodyweight"],
    muscles: ["triceps"],
    muscles_secondary: ["chest", "shoulders"],
    description: "Lower and raise body using parallel bars"
  },
  {
    id: "basic_9",
    name: "Leg Press",
    category: "legs",
    equipment: ["machine"],
    muscles: ["quadriceps", "glutes"],
    muscles_secondary: ["hamstrings"],
    description: "Push platform away with legs"
  },
  {
    id: "basic_10",
    name: "Plank",
    category: "core",
    equipment: ["bodyweight"],
    muscles: ["core", "abs"],
    muscles_secondary: ["shoulders"],
    description: "Hold body straight in push-up position"
  }
];

export async function searchExercises(query: string): Promise<ExerciseSearchResult[]> {
  try {
    // First check basic exercises for quick matches
    const basicMatches = BASIC_EXERCISES.filter(ex =>
      ex.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!query.trim()) {
      return BASIC_EXERCISES;
    }

    // Search in wger.de API
    const response = await axios.get(`${API_BASE_URL}/exercise/search/`, {
      params: {
        term: query,
        language: 2 // English
      },
      headers: {
        "Accept": "application/json"
      },
      timeout: 8000
    });

    if (response.data && response.data.suggestions) {
      const exercises: ExerciseSearchResult[] = response.data.suggestions.map((ex: any) => {
        const category = mapWgerCategory(ex.data.category);
        return {
          id: ex.data.id.toString(),
          name: ex.value,
          category: category,
          equipment: ex.data.equipment || [],
          muscles: ex.data.muscles || [],
          muscles_secondary: ex.data.muscles_secondary || [],
          description: ex.data.description || ""
        };
      });

      // Combine basic exercises with API results, avoid duplicates
      const apiExerciseNames = new Set(exercises.map(e => e.name.toLowerCase()));
      const uniqueBasic = basicMatches.filter(e => !apiExerciseNames.has(e.name.toLowerCase()));
      
      return [...uniqueBasic, ...exercises];
    }

    return basicMatches;
  } catch (error) {
    console.error("Exercise search error:", error);
    // Return filtered basic exercises on error
    return BASIC_EXERCISES.filter(ex =>
      ex.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export async function getExercisesByCategory(category: string): Promise<ExerciseSearchResult[]> {
  try {
    const basicMatches = BASIC_EXERCISES.filter(ex => ex.category === category);

    // Map our category to wger category ID
    const wgerCategory = mapCategoryToWgerCategory(category);
    if (!wgerCategory) {
      return basicMatches;
    }

    const response = await axios.get(`${API_BASE_URL}/exercise/`, {
      params: {
        category: wgerCategory,
        language: 2, // English
        limit: 50
      },
      headers: {
        "Accept": "application/json"
      },
      timeout: 8000
    });

    if (response.data && response.data.results) {
      const exercises: ExerciseSearchResult[] = response.data.results
        .filter((ex: any) => ex.name && ex.name.trim())
        .map((ex: any) => ({
          id: ex.id.toString(),
          name: ex.name,
          category: category,
          equipment: ex.equipment?.map((e: any) => e.name) || [],
          muscles: ex.muscles?.map((m: any) => m.name) || [],
          muscles_secondary: ex.muscles_secondary?.map((m: any) => m.name) || [],
          description: ex.description || ""
        }));

      // Avoid duplicates
      const apiExerciseNames = new Set(exercises.map(e => e.name.toLowerCase()));
      const uniqueBasic = basicMatches.filter(e => !apiExerciseNames.has(e.name.toLowerCase()));
      
      return [...uniqueBasic, ...exercises];
    }

    return basicMatches;
  } catch (error) {
    console.error("Get exercises by category error:", error);
    return BASIC_EXERCISES.filter(ex => ex.category === category);
  }
}

// Helper function to map our categories to wger category IDs
function mapCategoryToWgerCategory(category: string): number | null {
  const mapping: { [key: string]: number } = {
    arms: 8,      // Arms
    legs: 9,      // Legs
    abs: 10,      // Abs (core)
    core: 10,     // Abs (core)
    chest: 11,    // Chest
    back: 12,     // Back
    shoulders: 13 // Shoulders
  };
  return mapping[category] || null;
}

// Helper function to map wger category to our categories
function mapWgerCategory(wgerCategory: any): string {
  if (typeof wgerCategory === 'number') {
    const mapping: { [key: number]: string } = {
      8: "arms",
      9: "legs",
      10: "core",
      11: "chest",
      12: "back",
      13: "shoulders"
    };
    return mapping[wgerCategory] || "other";
  }
  return "other";
}

export async function getExercisesByMuscle(muscleGroup: string): Promise<ExerciseSearchResult[]> {
  try {
    const basicMatches = BASIC_EXERCISES.filter(ex => 
      ex.muscles.some(m => m.toLowerCase().includes(muscleGroup.toLowerCase())) ||
      ex.muscles_secondary.some(m => m.toLowerCase().includes(muscleGroup.toLowerCase()))
    );

    // Map muscle group to wger muscle ID
    const wgerMuscle = mapMuscleToWgerMuscle(muscleGroup);
    if (!wgerMuscle) {
      return basicMatches;
    }

    const response = await axios.get(`${API_BASE_URL}/exercise/`, {
      params: {
        muscles: wgerMuscle,
        language: 2, // English
        limit: 50
      },
      headers: {
        "Accept": "application/json"
      },
      timeout: 8000
    });

    if (response.data && response.data.results) {
      const exercises: ExerciseSearchResult[] = response.data.results
        .filter((ex: any) => ex.name && ex.name.trim())
        .map((ex: any) => {
          const category = mapWgerCategory(ex.category);
          return {
            id: ex.id.toString(),
            name: ex.name,
            category: category,
            equipment: ex.equipment?.map((e: any) => e.name) || [],
            muscles: ex.muscles?.map((m: any) => m.name) || [],
            muscles_secondary: ex.muscles_secondary?.map((m: any) => m.name) || [],
            description: ex.description || ""
          };
        });

      // Avoid duplicates
      const apiExerciseNames = new Set(exercises.map(e => e.name.toLowerCase()));
      const uniqueBasic = basicMatches.filter(e => !apiExerciseNames.has(e.name.toLowerCase()));
      
      return [...uniqueBasic, ...exercises];
    }

    return basicMatches;
  } catch (error) {
    console.error("Get exercises by muscle error:", error);
    return BASIC_EXERCISES.filter(ex => 
      ex.muscles.some(m => m.toLowerCase().includes(muscleGroup.toLowerCase())) ||
      ex.muscles_secondary.some(m => m.toLowerCase().includes(muscleGroup.toLowerCase()))
    );
  }
}

// Helper function to map muscle groups to wger muscle IDs
function mapMuscleToWgerMuscle(muscle: string): number | null {
  const mapping: { [key: string]: number } = {
    biceps: 1,
    abs: 6,
    core: 6,
    calves: 7,
    shoulders: 2,
    chest: 4,
    lats: 12,
    back: 12,
    glutes: 8,
    hamstrings: 11,
    quadriceps: 10,
    triceps: 5,
    traps: 9,
    forearms: 13
  };
  return mapping[muscle.toLowerCase()] || null;
}

export const EXERCISE_CATEGORIES = [
  { id: "chest", name: "Chest", icon: "💪" },
  { id: "back", name: "Back", icon: "🔙" },
  { id: "legs", name: "Legs", icon: "🦵" },
  { id: "shoulders", name: "Shoulders", icon: "💪" },
  { id: "arms", name: "Arms", icon: "💪" },
  { id: "core", name: "Core", icon: "⚡" },
  { id: "cardio", name: "Cardio", icon: "❤️" },
  { id: "other", name: "Other", icon: "🏋️" }
];

export const MUSCLE_GROUPS = [
  { id: "chest", name: "Chest", icon: "💪" },
  { id: "back", name: "Back", icon: "🔙" },
  { id: "lats", name: "Lats", icon: "🔙" },
  { id: "quadriceps", name: "Quads", icon: "🦵" },
  { id: "hamstrings", name: "Hamstrings", icon: "🦵" },
  { id: "glutes", name: "Glutes", icon: "🍑" },
  { id: "calves", name: "Calves", icon: "🦵" },
  { id: "shoulders", name: "Shoulders", icon: "💪" },
  { id: "biceps", name: "Biceps", icon: "💪" },
  { id: "triceps", name: "Triceps", icon: "💪" },
  { id: "forearms", name: "Forearms", icon: "💪" },
  { id: "abs", name: "Abs", icon: "⚡" },
  { id: "core", name: "Core", icon: "⚡" },
  { id: "traps", name: "Traps", icon: "💪" }
];

export const CARDIO_ACTIVITIES = [
  { id: "running", name: "Running", hasDistance: true },
  { id: "cycling", name: "Cycling", hasDistance: true },
  { id: "swimming", name: "Swimming", hasDistance: true },
  { id: "walking", name: "Walking", hasDistance: true },
  { id: "rowing", name: "Rowing", hasDistance: true },
  { id: "elliptical", name: "Elliptical", hasDistance: false },
  { id: "stairmaster", name: "Stair Master", hasDistance: false },
  { id: "jump_rope", name: "Jump Rope", hasDistance: false },
  { id: "hiking", name: "Hiking", hasDistance: true },
  { id: "boxing", name: "Boxing", hasDistance: false },
  { id: "dancing", name: "Dancing", hasDistance: false },
  { id: "yoga", name: "Yoga", hasDistance: false },
  { id: "pilates", name: "Pilates", hasDistance: false },
  { id: "aerobics", name: "Aerobics", hasDistance: false },
  { id: "spinning", name: "Spinning", hasDistance: false },
  { id: "basketball", name: "Basketball", hasDistance: false },
  { id: "soccer", name: "Soccer", hasDistance: false },
  { id: "tennis", name: "Tennis", hasDistance: false },
  { id: "kickboxing", name: "Kickboxing", hasDistance: false },
  { id: "crossfit", name: "CrossFit", hasDistance: false },
  { id: "other", name: "Other Cardio", hasDistance: false },
];
