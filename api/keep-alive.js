import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_KEY
    )

    const { error } = await supabase
      .from('zasoby')
      .select('id')
      .limit(1)

    if (error) {
      return res.status(500).json({ ok: false, error: error.message })
    }

    return res.status(200).json({ ok: true, ping: 'supabase' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}