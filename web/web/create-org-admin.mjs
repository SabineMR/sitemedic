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

async function createOrgAdmin() {
  try {
    // Step 1: Find Apex Safety Solutions org by slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', 'apex')
      .single()

    if (orgError || !org) {
      console.error('Could not find Apex Safety Solutions org (slug=apex):', orgError)
      process.exit(1)
    }

    console.log(`Found org: ${org.name} (${org.id})`)

    // Step 2: Create or update auth user with org_admin role in metadata
    let userId

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'sabine@joinour.build',
      password: 'password123',
      email_confirm: true,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: 'org_admin',
        org_id: org.id,
        org_slug: org.slug
      },
      user_metadata: {
        role: 'org_admin',
        full_name: 'Sabine Resoagli',
        org_id: org.id
      }
    })

    if (authError && authError.code === 'email_exists') {
      // User already exists — find them and update their metadata
      console.log('User already exists, updating role and metadata...')

      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('List users error:', listError)
        return
      }

      const existingUser = users.find(u => u.email === 'sabine@joinour.build')
      if (!existingUser) {
        console.error('Could not find existing user sabine@joinour.build')
        return
      }

      userId = existingUser.id

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          role: 'org_admin',
          org_id: org.id,
          org_slug: org.slug
        },
        user_metadata: {
          role: 'org_admin',
          full_name: 'Sabine Resoagli',
          org_id: org.id
        }
      })

      if (updateError) {
        console.error('Update error:', updateError)
        return
      }

      console.log('Auth user updated:', userId)
    } else if (authError) {
      console.error('Auth error:', authError)
      return
    } else {
      userId = authData.user.id
      console.log('Auth user created:', userId)
    }

    // Step 3: Upsert profile with org_admin role linked to Apex org
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        org_id: org.id,
        email: 'sabine@joinour.build',
        full_name: 'Sabine Resoagli',
        role: 'org_admin'
      })
      .select()

    if (profileError) {
      console.error('Profile error:', profileError)
      return
    }

    console.log('Profile updated')
    console.log('')
    console.log('Org Admin user ready:')
    console.log('  Email:    sabine@joinour.build')
    console.log('  Password: password123')
    console.log('  Role:     org_admin')
    console.log(`  Org:      ${org.name} (slug: ${org.slug})`)
    console.log(`  Org ID:   ${org.id}`)
    console.log('')
    console.log('This user can manage Apex Safety Solutions (clients, medics, bookings, etc.)')
    console.log('but cannot access other orgs or platform-level settings.')
  } catch (err) {
    console.error('Error:', err)
  }
}

createOrgAdmin()
