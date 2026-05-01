import { NextResponse } from "next/server";
import { clerkClient } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await clerkClient();
    const userList = await client.users.getUserList({
      limit: 100,
      orderBy: "-created_at",
    });

    const users = userList?.data || [];
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch users", users: [] },
      { status: 500 }
    );
  }
}
