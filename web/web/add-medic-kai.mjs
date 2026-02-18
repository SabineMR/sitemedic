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

async function addMedicKai() {
  try {
    // Step 1: Find Apex Safety Group org
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', 'apex')
      .single()

    if (orgError || !org) {
      console.error('Could not find Apex Safety Group (slug=apex):', orgError)
      process.exit(1)
    }

    console.log(`Found org: ${org.name} (${org.id})`)

    // Step 2: Create or update auth user
    const email = 'firstcontactsolutions.intl@gmail.com'
    let userId

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: 'medic',
        org_id: org.id,
        org_slug: org.slug
      },
      user_metadata: {
        role: 'medic',
        full_name: 'Kai Aufmkolk',
        org_id: org.id
      }
    })

    if (authError && authError.code === 'email_exists') {
      console.log('User already exists, updating metadata...')

      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) {
        console.error('List users error:', listError)
        return
      }

      const existingUser = users.find(u => u.email === email)
      if (!existingUser) {
        console.error('Could not find existing user', email)
        return
      }

      userId = existingUser.id

      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          role: 'medic',
          org_id: org.id,
          org_slug: org.slug
        },
        user_metadata: {
          role: 'medic',
          full_name: 'Kai Aufmkolk',
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

    // Step 3: Upsert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        org_id: org.id,
        email,
        full_name: 'Kai Aufmkolk',
        role: 'medic'
      })
      .select()

    if (profileError) {
      console.error('Profile error:', profileError)
      return
    }

    console.log('Profile created/updated')

    // Step 4: Check if medic record already exists, then insert or update
    const { data: existingMedic } = await supabase
      .from('medics')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    const medicData = {
      user_id: userId,
      org_id: org.id,
      first_name: 'Kai',
      last_name: 'Aufmkolk',
      email,
      phone: '+44 7584 639688',
      home_address: '',
      home_postcode: '',
      has_confined_space_cert: false,
      has_trauma_cert: true,
      employment_status: 'self_employed',
      star_rating: 4.70,
      available_for_work: true
    }

    let medicError
    if (existingMedic) {
      const { error } = await supabase
        .from('medics')
        .update(medicData)
        .eq('id', existingMedic.id)
      medicError = error
    } else {
      const { error } = await supabase
        .from('medics')
        .insert(medicData)
      medicError = error
    }

    if (medicError) {
      console.error('Medic error:', medicError)
      return
    }

    console.log('Medic record created/updated')
    console.log('')
    console.log('Medic added successfully:')
    console.log('  Name:           Kai Aufmkolk')
    console.log('  Email:          firstcontactsolutions.intl@gmail.com')
    console.log('  Phone:          +44 7584 639688')
    console.log('  Classification: Paramedic (10 years experience)')
    console.log('  Role:           medic')
    console.log(`  Org:            ${org.name} (slug: ${org.slug})`)
    console.log('  Login password: password123')
  } catch (err) {
    console.error('Error:', err)
  }
}

addMedicKai()
