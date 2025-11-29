import React, { createContext, useContext, useState, useEffect } from "react";
import { databases, DATABASE_ID, USER_SETTINGS_TABLE_ID } from "./appwrite";
import { Query } from "react-native-appwrite";
import { useAuth } from "./auth-context";

type UnitContextType = {
  useMetricUnits: boolean;
  setUseMetricUnits: (value: boolean) => void;
  isLoading: boolean;
};

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [useMetricUnits, setUseMetricUnitsState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        USER_SETTINGS_TABLE_ID,
        [Query.equal("user_id", user!.$id)]
      );

      if (response.documents.length > 0) {
        const settings = response.documents[0];
        setUseMetricUnitsState(settings.use_metric_units ?? true);
      }
    } catch (error) {
      console.log("Error loading user settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUseMetricUnits = (value: boolean) => {
    setUseMetricUnitsState(value);
  };

  return (
    <UnitContext.Provider
      value={{ useMetricUnits, setUseMetricUnits, isLoading }}
    >
      {children}
    </UnitContext.Provider>
  );
}

export function useUnits() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error("useUnits must be used within a UnitProvider");
  }
  return context;
}
