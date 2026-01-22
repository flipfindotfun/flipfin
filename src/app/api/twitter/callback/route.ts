import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This is the wallet address
  const error = searchParams.get("error");

  const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://flipfin.fun";

    if (error || !code || !state || !codeVerifier) {
      console.error("Twitter callback error:", { error, code, state, hasVerifier: !!codeVerifier });
      return NextResponse.redirect(`${baseUrl}/rewards?error=twitter_auth_failed`);
    }

    try {
      const client = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      });

      const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: `${baseUrl}/api/twitter/callback`,
      });


    // Get user info
    const { data: user } = await loggedClient.v2.me();

      if (user) {
        // Update profile in Supabase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            twitter_handle: user.username,
            twitter_id: user.id
          })
          .eq("wallet_address", state);

        if (updateError) {
          console.error("Error updating profile with Twitter handle:", updateError);
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://flipfin.fun'}/rewards?error=profile_update_failed`);
        }

        // Check if connect_x task is already completed
        const { data: existingTask } = await supabase
          .from("user_tasks")
          .select("*")
          .eq("wallet_address", state)
          .eq("task_id", "connect_x")
          .single();

        if (!existingTask) {
          const pointsToAward = 150;
          
          // Record task completion
          await supabase.from("user_tasks").insert({
            wallet_address: state,
            task_id: "connect_x",
            points_awarded: pointsToAward
          });

          // Award points to profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("total_points")
            .eq("wallet_address", state)
            .single();

          const newTotal = (profile?.total_points || 0) + pointsToAward;

          await supabase
            .from("profiles")
            .update({ total_points: newTotal })
            .eq("wallet_address", state);

          // Record transaction
          await supabase.from("points_transactions").insert({
            wallet_address: state,
            amount: pointsToAward,
            type: "reward_task",
            description: `Completed task: connect_x`
          });
        }

        // Success! Redirect back to rewards
        const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://flipfin.fun'}/rewards?success=twitter_connected`);
        
        // Clear the verifier cookie
        response.cookies.delete('twitter_code_verifier');
        
        return response;
      }

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://flipfin.fun'}/rewards?error=user_not_found`);
    } catch (err) {
      console.error("Twitter OAuth error:", err);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://flipfin.fun'}/rewards?error=internal_error`);
    }
}
