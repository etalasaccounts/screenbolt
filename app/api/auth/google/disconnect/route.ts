import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JWTPayload {
  userId: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookie
    const authToken = request.cookies.get("auth-token")?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(authToken, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    // Clear Google tokens from user record
    await db.user.update({
      where: { id: decoded.userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: "Google Drive account disconnected successfully" 
    });

  } catch (error) {
    console.error("Google disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Google Drive account" },
      { status: 500 }
    );
  }
}