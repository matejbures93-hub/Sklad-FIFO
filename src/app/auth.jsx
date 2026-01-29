import { supabase } from '../services/supabase'
export const getSession=async()=> (await supabase.auth.getSession()).data?.session??null
export const signIn=(email,password)=>supabase.auth.signInWithPassword({email,password})
export const signUp=(email,password)=>supabase.auth.signUp({email,password})
export const signOut=()=>supabase.auth.signOut()