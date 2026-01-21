import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use Service Role Key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code required' }, { status: 400 });
        }

        // 1. Find Code in DB
        const { data: record, error: findError } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('code', code)
            .single();

        if (findError || !record) {
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
        }

        // 2. Check Expiry
        if (new Date(record.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Code expired' }, { status: 400 });
        }

        // 3. Burn Code (Delete)
        await supabase.from('verification_codes').delete().eq('id', record.id);

        // 4. Fetch User Profile to return
        // We will return the fully mapped user object so client can hydrate immediately
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        // Map snake_case to camelCase (basic) or let frontend map it.
        // Let's return raw and let SyncEngine map it if possible, or manual map here.
        // Similar to SyncEngine.mapUserFromRemote
        const mappedUser = {
            id: user.id,
            fullName: user.full_name,
            displayName: user.display_name,
            email: user.email,
            avatarUrl: user.avatar_url,
            gender: user.gender,
            dateOfBirth: user.date_of_birth,
            onboardingCompleted: user.onboarding_completed,
            coupleId: user.couple_id || null, // Keep this for legacy/mixed schema support
            createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now()
        };

        // 5. If coupleId is null, try to find it in 'couples' table (Schema mismatch handling)
        if (!mappedUser.coupleId) {
            const { data: couple } = await supabase
                .from('couples')
                .select('id')
                .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
                .maybeSingle();

            if (couple) {
                mappedUser.coupleId = couple.id;
            }
        }

        return NextResponse.json({ success: true, user: mappedUser });

    } catch (err: any) {
        console.error('Verify API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
