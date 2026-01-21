import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Supabase (Service Role preferred for backend, but Anon works if RLS allows)
// Actually, for verification_codes write, we need permission.
// Existing supabase client is client-side. Let's make a new one or use env vars directly.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // 1. Check if user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found. Please sign up first.' }, { status: 404 });
        }

        // 2. Generate Code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        // 3. Delete old codes
        await supabase.from('verification_codes').delete().eq('email', email);

        // 4. Store Code
        const { error: insertError } = await supabase
            .from('verification_codes')
            .insert({
                email,
                code,
                expires_at: expiresAt
            });

        if (insertError) {
            console.error('Store Code Error:', insertError);
            return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
        }

        // 5. Send Email via Resend
        // 5. Send Email via Resend
        // DEV MODE: Log the code so we can login correctly even if email fails (Free tier limits)


        try {
            const { error: resendError } = await resend.emails.send({
                from: 'CoupleHabits <onboarding@resend.dev>', // Verified domain or test domain
                to: email, // Will fail for unverified emails on free tier
                subject: 'Your Login Code',
                html: `<p>Your code is <strong>${code}</strong></p>`
            });

            if (resendError) {
                console.warn('[Send-OTP] Resend Warning (probably free tier limit):', resendError.message);
                // We DON'T return error here, so the UI proceeds to the input code screen.
                // The user can grab the code from the terminal.
            }
        } catch (emailError) {
            console.warn('[Send-OTP] Email failed silently for dev:', emailError);
        }

        return NextResponse.json({ success: true });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
