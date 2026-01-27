import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "flipfin-admin-secret-key-2024"
);

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "system";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const level = searchParams.get("level");

  try {
    if (type === "system") {
      let query = supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (level && level !== "all") {
        query = query.eq("level", level);
      }

      const { data, error } = await query;
      if (error) throw error;

      return NextResponse.json({ logs: data || [], type: "system" });
    }

    if (type === "api") {
      const { data, error } = await supabase
        .from("api_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return NextResponse.json({ logs: data || [], type: "api" });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("Logs fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { level, message, metadata, source } = await request.json();

    const { error } = await supabase.from("system_logs").insert({
      level: level || "info",
      message,
      metadata,
      source,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "system";
  const olderThanDays = parseInt(searchParams.get("days") || "7");

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    if (type === "system") {
      const { error } = await supabase
        .from("system_logs")
        .delete()
        .lt("created_at", cutoffDate.toISOString());
      if (error) throw error;
    } else if (type === "api") {
      const { error } = await supabase
        .from("api_logs")
        .delete()
        .lt("created_at", cutoffDate.toISOString());
      if (error) throw error;
    }

    return NextResponse.json({ success: true, cleared: type });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
