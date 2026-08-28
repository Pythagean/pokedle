import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_pokemon_id, avatar_bg_color, avatar_zoom, avatar_offset_x, avatar_offset_y')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signUp(email, password, displayName) {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName || null } },
    });
  }

  async function signInWithMagicLink(email) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateDisplayName(name) {
    if (!user) return { error: new Error('Not logged in') };
    const trimmed = name.trim().slice(0, 12);
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, display_name: trimmed, updated_at: new Date().toISOString() });
    if (!error) setProfile(p => ({ ...(p ?? {}), display_name: trimmed }));
    return { error };
  }

  async function updateAvatar(pokemonId, bgColor, zoom, offsetX, offsetY) {
    if (!user) return { error: new Error('Not logged in') };
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        avatar_pokemon_id: pokemonId || null,
        avatar_bg_color: bgColor || null,
        avatar_zoom: zoom ?? 1,
        avatar_offset_x: offsetX ?? 0,
        avatar_offset_y: offsetY ?? 0,
        updated_at: new Date().toISOString(),
      });
    if (!error) setProfile(p => ({ ...(p ?? {}), avatar_pokemon_id: pokemonId || null, avatar_bg_color: bgColor || null, avatar_zoom: zoom ?? 1, avatar_offset_x: offsetX ?? 0, avatar_offset_y: offsetY ?? 0 }));
    return { error };
  }

  // The name to display / use as player name — profile beats user_metadata beats email prefix
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    (user?.email ? user.email.split('@')[0] : null);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, displayName, signIn, signUp, signInWithMagicLink, signOut, updateDisplayName, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
