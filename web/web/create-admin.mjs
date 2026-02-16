import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'sabineresoagli@gmail.com',
      password: 'sabineresoagli@gmail.com',
      email_confirm: true
    })

    if (authError) {
      console.error('Auth error:', authError)
      return
    }

    console.log('✓ Auth user created:', authData.user.id)

    // Create profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: 'sabineresoagli@gmail.com',
        full_name: 'Sabine Resoagli',
        role: 'admin'
      })
      .select()

    if (profileError) {
      console.error('Profile error:', profileError)
      return
    }

    console.log('✓ Profile created')
    console.log('\nAdmin user ready:')
    console.log('  Email: sabineresoagli@gmail.com')
    console.log('  Password: sabineresoagli@gmail.com')
    console.log('  Role: admin')
  } catch (err) {
    console.error('Error:', err)
  }
}

createAdminUser()
