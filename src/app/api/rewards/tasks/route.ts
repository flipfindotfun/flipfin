import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

const TASKS = [
  {
    id: "first_deposit_100",
    title: "First Deposit 100 USD",
    description: "Deposit at least 100 USD worth of SOL in your wallet",
    points: 200,
    type: "one-time",
  },
    {
      id: "connect_x",
      title: "Connect X to Wallet",
      description: "Link your X account to your wallet",
      points: 150,
      type: "one-time",
    },
      {
        id: "yapping_post",
        title: "Yapping System",
        description: "Post about Flip tagging @flipfindotfun on X",
        points: 0, // Points are awarded per post based on quality
        type: "recurring",
      },
  {
    id: "volume_1k",
    title: "1,000 USD Volume",
    description: "Achieve a total trading volume of $1,000",
    points: 500,
    type: "one-time",
  },
  {
    id: "volume_10k",
    title: "10,000 USD Volume",
    description: "Achieve a total trading volume of $10,000",
    points: 2000,
    type: "one-time",
  },
  {
    id: "volume_50k",
    title: "50,000 USD Volume",
    description: "Achieve a total trading volume of $50,000",
    points: 10000,
    type: "one-time",
  },
  {
    id: "volume_100k",
    title: "100,000 USD Volume",
    description: "Achieve a total trading volume of $100,000",
    points: 25000,
    type: "one-time",
  }
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
  }

  try {
    // Get completed tasks
    const { data: completedTasks } = await supabase
      .from("user_tasks")
      .select("task_id, points_awarded")
      .eq("wallet_address", wallet);

    // Get user profile for X handle, X points and Volume
    const { data: profile } = await supabase
      .from("profiles")
      .select("twitter_handle, twitter_points, claimed_twitter_points, total_volume")
      .eq("wallet_address", wallet)
      .single();

    const tasksWithStatus = await Promise.all(TASKS.map(async task => {
      const completion = completedTasks?.find(ct => ct.task_id === task.id);
      let currentValue = 0;
      let targetValue = 0;

      if (task.id === "first_deposit_100") {
        try {
          const balance = await connection.getBalance(new PublicKey(wallet));
          const solBalance = balance / LAMPORTS_PER_SOL;
          const solPrice = await getSolPrice();
          currentValue = solBalance * solPrice;
          targetValue = 100;
        } catch (e) {
          currentValue = 0;
          targetValue = 100;
        }
      } else if (task.id.startsWith("volume_")) {
        targetValue = parseInt(task.id.split("_")[1].replace("k", "000"));
        currentValue = profile?.total_volume || 0;
      }

      return {
        ...task,
        completed: !!completion,
        points_awarded: completion?.points_awarded || 0,
        status: completion ? "completed" : "pending",
        current_value: currentValue,
        target_value: targetValue
      };
    }));

    return NextResponse.json({
      tasks: tasksWithStatus,
      twitter_handle: profile?.twitter_handle || null,
      twitter_points: profile?.twitter_points || 0,
      claimed_twitter_points: profile?.claimed_twitter_points || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getSolPrice() {
  try {
    const res = await fetch("https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112");
    const data = await res.json();
    return data.data["So11111111111111111111111111111111111111112"]?.price || 150;
  } catch (error) {
    return 150; // Fallback
  }
}

export async function POST(request: NextRequest) {
  const { wallet, taskId } = await request.json();

  if (!wallet || !taskId) {
    return NextResponse.json({ error: "Missing wallet or taskId" }, { status: 400 });
  }

  try {
    // Check if already completed
    const { data: existing } = await supabase
      .from("user_tasks")
      .select("*")
      .eq("wallet_address", wallet)
      .eq("task_id", taskId)
      .single();

    if (existing && taskId !== "yapping_post") {
      return NextResponse.json({ error: "Task already completed" }, { status: 400 });
    }

    let pointsToAward = 0;
    let success = false;
    let message = "";

    if (taskId === "first_deposit_100") {
      const balance = await connection.getBalance(new PublicKey(wallet));
      const solBalance = balance / LAMPORTS_PER_SOL;
      const solPrice = await getSolPrice();
      const usdBalance = solBalance * solPrice;

      if (usdBalance >= 100) {
        pointsToAward = 200;
        success = true;
        message = "Successfully verified 100 USD deposit!";
      } else {
        return NextResponse.json({ error: `Insufficient balance. Current: $${usdBalance.toFixed(2)}` }, { status: 400 });
      }
    } else if (taskId === "connect_x") {
      // This should usually be handled by a separate OAuth callback, 
      // but we can verify if the profile has a twitter_handle
      const { data: profile } = await supabase
        .from("profiles")
        .select("twitter_handle")
        .eq("wallet_address", wallet)
        .single();

      if (profile?.twitter_handle) {
        pointsToAward = 150;
        success = true;
        message = "X connection verified!";
        } else {
          return NextResponse.json({ error: "Please connect your X account first" }, { status: 400 });
        }
      } else if (taskId.startsWith("volume_")) {
        const targetVolume = parseInt(taskId.split("_")[1].replace("k", "000"));
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_volume")
          .eq("wallet_address", wallet)
          .single();

        const currentVolume = profile?.total_volume || 0;
        if (currentVolume >= targetVolume) {
          const task = TASKS.find(t => t.id === taskId);
          pointsToAward = task?.points || 0;
          success = true;
          message = `Successfully verified $${targetVolume.toLocaleString()} volume!`;
        } else {
          return NextResponse.json({ 
            error: `Insufficient volume. Required: $${targetVolume.toLocaleString()}, Current: $${Math.floor(currentVolume).toLocaleString()}` 
          }, { status: 400 });
        }
      }


    if (success && pointsToAward > 0) {
      // Record task completion
      await supabase.from("user_tasks").insert({
        wallet_address: wallet,
        task_id: taskId,
        points_awarded: pointsToAward
      });

      // Award points to profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("wallet_address", wallet)
        .single();

      const newTotal = (profile?.total_points || 0) + pointsToAward;

      await supabase
        .from("profiles")
        .update({ total_points: newTotal })
        .eq("wallet_address", wallet);

      // Record transaction
      await supabase.from("points_transactions").insert({
        wallet_address: wallet,
        amount: pointsToAward,
        type: "reward_task",
        description: `Completed task: ${taskId}`
      });

      return NextResponse.json({ message, points: pointsToAward });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
