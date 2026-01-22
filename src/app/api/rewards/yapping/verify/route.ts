import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Mock post fetching - in production, use Twitter API with the Bearer Token
async function fetchUserRecentPosts(twitterHandle: string) {
  // This is a mock. In reality, you'd call https://api.twitter.com/2/tweets/search/recent
    // and filter by "from:handle @flipfinfun"
    return [
      {
        id: "123",
        text: "Just made my first trade on @flipfinfun! The UI is so clean and fast. Best Solana sniper bot out there! 🚀",
        created_at: new Date().toISOString()
      }
    ];
  }
  
  export async function POST(request: NextRequest) {
    const { wallet } = await request.json();
  
    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }
  
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("twitter_handle, twitter_points")
        .eq("wallet_address", wallet)
        .single();
  
      if (!profile?.twitter_handle) {
        return NextResponse.json({ error: "Connect X account first" }, { status: 400 });
      }
  
      // 1. Fetch recent posts from Twitter API (Mocked here)
      const posts = await fetchUserRecentPosts(profile.twitter_handle);
      
      if (posts.length === 0) {
        return NextResponse.json({ error: "No recent posts found tagging @flipfinfun" }, { status: 400 });
      }
  
      // 2. Analyze the "best" post using AI (Groq)
      const postToAnalyze = posts[0].text;
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an AI that evaluates the quality of social media posts about a trading platform called Flip Finance (@flipfinfun). Rate the post on a scale of 0-100 based on positivity, detail, and helpfulness. Short or low-effort posts should receive very low scores (below 30). High-quality, detailed posts with specific feedback or results can reach up to 100. Return ONLY a JSON object: { 'score': number, 'reason': string }"
          },
          {
            role: "user",
            content: `Analyze this post: "${postToAnalyze}"`
          }
        ],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      });
  
      const result = JSON.parse(completion.choices[0].message.content || '{"score": 0}');
      let score = result.score || 0;
  
      // Apply length-based scaling
      const lengthFactor = Math.min(1, postToAnalyze.length / 140);
      score = score * lengthFactor;

      if (score < 20) {
        return NextResponse.json({ error: "Post quality too low or too short", reason: result.reason }, { status: 400 });
      }
  
      // 3. Award X-Points (Lowered as requested)
      const pointsAwarded = Math.floor(score * 0.5); // e.g., 80 score = 40 X-points
      const newTwitterPoints = (profile.twitter_points || 0) + pointsAwarded;

    await supabase
      .from("profiles")
      .update({ twitter_points: newTwitterPoints })
      .eq("wallet_address", wallet);

    // Record the task completion (recurring)
    await supabase.from("user_tasks").insert({
      wallet_address: wallet,
      task_id: "yapping_post",
      points_awarded: pointsAwarded
    });

    return NextResponse.json({ 
      message: `Yapping success! Post score: ${score}/100`, 
      points: pointsAwarded,
      newTotal: newTwitterPoints
    });

  } catch (error: any) {
    console.error("Yapping verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
