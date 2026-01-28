import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const { data: proposals, error } = await supabase
      .from("proposals")
      .select(`
        *,
        votes (
          choice,
          weight
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const processedProposals = proposals.map((p: any) => {
      const voteCounts: Record<string, number> = {};
      let totalWeight = 0;

      p.votes?.forEach((v: any) => {
        voteCounts[v.choice] = (voteCounts[v.choice] || 0) + Number(v.weight);
        totalWeight += Number(v.weight);
      });

      return {
        ...p,
        voteCounts,
        totalWeight,
        vote_count: p.votes?.length || 0
      };
    });

    return NextResponse.json(processedProposals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
