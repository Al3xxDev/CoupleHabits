import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

        // 5. Send Email (Gmail first, then Resend)
        try {
            if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
                // Gmail (Free, unlimited recipients)
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_APP_PASSWORD,
                    },
                });

                await transporter.sendMail({
                    from: process.env.GMAIL_USER, // Simplified sender
                    to: email,
                    subject: `Your Login Code: ${code}`, // DEBUG: Put code in subject
                    text: `Your login code is: ${code}`, // Text fallback
                    html: `<div style="font-family: sans-serif; padding: 20px;">
                            <h2>Welcome back!</h2>
                            <p>Your login code is:</p>
                            <h1 style="font-size: 32px; letter-spacing: 5px;">${code}</h1>
                            <p>This code expires in 10 minutes.</p>
                           </div>`,
                });
                console.log(`[Send-OTP] Sent via Gmail to ${email}`);

            } else if (resend) {
                // Resend (Requires verified domain for external emails on free tier)
                const { error: resendError } = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'CoupleHabits <onboarding@resend.dev>',
                    to: email,
                    subject: 'Your Login Code',
                    html: `<p>Your code is <strong>${code}</strong></p>`
                });

                if (resendError) {
                    console.warn('[Send-OTP] Resend Error:', resendError.message);
                } else {
                    console.log(`[Send-OTP] Sent via Resend to ${email}`);
                }
            } else {
                console.warn('[Send-OTP] No email provider configured. Check server logs for code.');
            }

        } catch (emailError: any) {
            console.error('[Send-OTP] Email failed:', emailError);
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
