import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string, retries = 3) => {
    let isRetrying = false;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 means zero rows were found. The signup trigger might still be running.
        if (error.code === 'PGRST116') {
          if (retries > 0) {
            isRetrying = true;
            await new Promise((resolve) => setTimeout(resolve, 500));
            return fetchUserProfile(userId, retries - 1);
          } else {
            console.error('CRITICAL: User has auth session but no profile row. Logging out.');
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            return;
          }
        }
        throw error;
      }
      setUser(data as User);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      if (!isRetrying) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        fetchUserProfile(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s) {
        if (event === 'TOKEN_REFRESHED') return;
        setLoading(true);
        await fetchUserProfile(s.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
  };

  // Creates the auth.users record and the corresponding public.users profile row
  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    if (!data.user) throw new Error('Sign-up did not return a user');
    // Profile row is created by the on_auth_user_created trigger (migration 002)
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
