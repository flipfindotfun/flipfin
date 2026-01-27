import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TwitterApi } from "twitter-api-v2";
import Groq from "groq-sdk";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const groq = new Groq({
  apiKey: (process.env.GROQ_API_KEY || "").trim()
});

// Function to fetch recent posts from Twitter API using twitter-api-v2
async function fetchUserRecentPosts(twitterHandle: string) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    console.error("Missing TWITTER_BEARER_TOKEN");
    return [];
  }

    try {
      const client = new TwitterApi(bearerToken);
      const readOnlyClient = client.readOnly;
  
      // Search for tweets from the user mentioning @flipfindotfun
      // twitter-api-v2 handles encoding and common search errors
      const query = `from:${twitterHandle} @flipfindotfun`;
      
      const searchResult = await readOnlyClient.v2.search(query, {
        "tweet.fields": ["created_at", "text"],
        max_results: 10,
      });
  
      return searchResult.data.data || [];
    } catch (error: any) {
      console.error("Error fetching tweets with twitter-api-v2:", error);
      // If it's a 401 Unauthorized, it's an invalid bearer token
      if (error.code === 401 || error.status === 401) {
        throw new Error("X API: Invalid Bearer Token (API Key)");
      }
      // If it's a 400 error from Twitter, it means the query or token is invalid
      if (error.code === 400 || error.status === 400) {
        throw new Error(`X API Error: ${error.data?.detail || "Invalid Request"}`);
      }
      return [];
    }
}
  
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = body;
  
    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }
  
    const { data: profile } = await supabase
      .from("profiles")
      .select("twitter_handle, twitter_points, last_yapping_at")
      .eq("wallet_address", wallet)
      .single();
  
    if (!profile?.twitter_handle) {
      return NextResponse.json({ error: "Connect X account first" }, { status: 400 });
    }

    // Check cooldown (24 hours)
    if (profile.last_yapping_at) {
      const lastYapping = new Date(profile.last_yapping_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastYapping.getTime()) / (1000 * 60 * 60);
      if (diffHours < 24) {
        return NextResponse.json({ 
          error: "Cooldown active", 
          message: `You can only claim yapping points once every 24 hours. Try again in ${Math.ceil(24 - diffHours)}h.` 
        }, { status: 400 });
      }
    }

    // 1. Fetch recent posts from Twitter API
    let posts = [];
    try {
      posts = await fetchUserRecentPosts(profile.twitter_handle);
    } catch (twitterError: any) {
      return NextResponse.json({ error: twitterError.message }, { status: 400 });
    }
    
    if (posts.length === 0) {
      return NextResponse.json({ error: "No recent posts found tagging @flipfindotfun" }, { status: 400 });
    }

    // 2. Analyze the "best" post using AI (Groq)
    const postToAnalyze = posts[0].text;
    
    let completion;
    try {
      completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an AI that evaluates the quality of social media posts about a trading platform called Flip Finance (@flipfindotfun). Rate the post on a scale of 0-100 based on positivity, detail, and helpfulness. Short or low-effort posts should receive very low scores (below 30). High-quality, detailed posts with specific feedback or results can reach up to 100. Return ONLY a JSON object: { 'score': number, 'reason': string }"
          },
          {
            role: "user",
            content: `Analyze this post: "${postToAnalyze}"`
          }
        ],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      });
    } catch (groqError: any) {
      console.error("Groq API Error:", groqError);
      if (groqError.status === 401 || groqError.message?.toLowerCase().includes("api key")) {
        return NextResponse.json({ error: "AI API: Invalid API Key (GROQ_API_KEY)" }, { status: 500 });
      }
      throw groqError;
    }

    const result = JSON.parse(completion.choices[0].message.content || '{"score": 0}');
    let score = result.score || 0;

    // Apply length-based scaling
    const lengthFactor = Math.min(1, postToAnalyze.length / 140);
    score = score * lengthFactor;

    if (score < 20) {
      return NextResponse.json({ error: "Post quality too low or too short", reason: result.reason }, { status: 400 });
    }

    // 3. Award X-Points
    const pointsAwarded = Math.floor(score * 0.5); // e.g., 80 score = 40 X-points
    const newTwitterPoints = (profile.twitter_points || 0) + pointsAwarded;

    await supabase
      .from("profiles")
      .update({ 
        twitter_points: newTwitterPoints,
        last_yapping_at: new Date().toISOString()
      })
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
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

