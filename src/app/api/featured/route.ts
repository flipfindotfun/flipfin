import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "flipfin-admin-secret-key-2024"
);

async function isAdmin(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) return false;
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminMode = searchParams.get("admin") === "true";
    
    let query = supabase
      .from("featured_tokens")
      .select("*");

    if (adminMode) {
      if (!(await isAdmin(req))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      query = query.order("created_at", { ascending: false });
    } else {
      query = query
        .eq("status", "active")
        .gt("featured_until", new Date().toISOString())
        .order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token_address, symbol, name, logo_url, duration_hours, status = "active" } = body;

    if (!token_address || !symbol || !duration_hours) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let featured_until = null;
    let starts_at = null;

    if (status === "active") {
      starts_at = new Date().toISOString();
      featured_until = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
    }

    const { data, error } = await supabase
      .from("featured_tokens")
      .insert({
        token_address,
        symbol,
        name,
        logo_url,
        duration_hours,
        featured_until,
        starts_at,
        status
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "ID and action are required" }, { status: 400 });
    }

    if (action === "activate") {
      const { data: token, error: fetchError } = await supabase
        .from("featured_tokens")
        .select("duration_hours")
        .eq("id", id)
        .single();

      if (fetchError || !token) throw new Error("Token not found");

      const starts_at = new Date().toISOString();
      const featured_until = new Date(Date.now() + (token.duration_hours || 12) * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from("featured_tokens")
        .update({
          status: "active",
          starts_at,
          featured_until
        })
        .eq("id", id);

      if (updateError) throw updateError;
    } else if (action === "deactivate") {
      const { error: updateError } = await supabase
        .from("featured_tokens")
        .update({
          status: "expired",
          featured_until: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("featured_tokens")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
