import { createContext, useContext, useEffect, useState } from "react";
import { ID, Models, Query } from "react-native-appwrite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  account,
  databases,
  DATABASE_ID,
  USER_PROFILES_TABLE_ID,
} from "./appwrite";

const SESSION_KEY = "@shaped_session";

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  isLoadingUser: boolean;
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<string | null>;
  signIn: (emailOrUsername: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );

  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    // Check for persisted session on app start
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if we have a session marker
      const hasSession = await AsyncStorage.getItem(SESSION_KEY);
      if (hasSession) {
        // Try to restore the session
        await getUser();
      } else {
        setIsLoadingUser(false);
      }
    } catch (error) {
      console.log("Initialize auth error:", error);
      setIsLoadingUser(false);
    }
  };

  const getUser = async () => {
    try {
      const session = await account.get();
      // Store session marker for persistence
      await AsyncStorage.setItem(SESSION_KEY, "active");
      setUser(session);
    } catch (error) {
      // Clear session marker if unable to get user
      await AsyncStorage.removeItem(SESSION_KEY);
      console.log(
        "getUser error:",
        error instanceof Error ? error.message : error
      );
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // Check if username already exists
      const existingUsers = await databases.listDocuments(
        DATABASE_ID,
        USER_PROFILES_TABLE_ID,
        [Query.equal("username", username)]
      );

      if (existingUsers.documents.length > 0) {
        return "Username already taken.";
      }

      // Create Appwrite account with username as the name
      const newAccount = await account.create(
        ID.unique(),
        email,
        password,
        username
      );

      // Create user profile for username lookup
      await databases.createDocument(
        DATABASE_ID,
        USER_PROFILES_TABLE_ID,
        ID.unique(),
        {
          user_id: newAccount.$id,
          username: username,
          email: email,
        }
      );

      // Create session
      try {
        await account.createEmailPasswordSession(email, password);
      } catch (sessionError) {
        // Session might already exist, that's ok
      }
      const session = await account.get();
      // Store session marker for persistence
      await AsyncStorage.setItem(SESSION_KEY, "active");
      setUser(session);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return "An unknown error occurred during sign up.";
    }
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      let email = emailOrUsername;

      // Check if input is username instead of email
      if (!emailOrUsername.includes("@")) {
        // Look up email by username
        const userProfiles = await databases.listDocuments(
          DATABASE_ID,
          USER_PROFILES_TABLE_ID,
          [Query.equal("username", emailOrUsername)]
        );

        if (userProfiles.documents.length === 0) {
          return "Invalid username or password.";
        }

        email = userProfiles.documents[0].email;
      }

      // Try to create session with email
      try {
        await account.createEmailPasswordSession(email, password);
      } catch (sessionError) {
        // Session might already exist, that's ok
      }
      const session = await account.get();
      // Store session marker for persistence
      await AsyncStorage.setItem(SESSION_KEY, "active");
      setUser(session);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return "An unknown error occurred during sign in.";
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession("current");
      // Clear session marker on logout
      await AsyncStorage.removeItem(SESSION_KEY);
      setUser(null);
    } catch (error) {
      console.log("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoadingUser, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
