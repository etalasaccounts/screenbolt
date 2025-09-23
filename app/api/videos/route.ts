import { getVideos } from "@/lib/db/videos";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVideoTitleWithTimestamp } from "@/lib/video-utils";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server-auth";

// Schema for creating a video
const createVideoSchema = z.object({
  videoUrl: z.string().url("Invalid video URL").optional(),
  userId: z.string().uuid("Invalid user ID"),
  workspaceId: z.string().uuid("Invalid workspace ID"),
  title: z.string().optional(),
  duration: z.number().positive("Duration must be positive").optional(),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
  source: z.enum(["Dropbox", "Local", "Bunny"]).optional(),
  userTimestamp: z.string().optional(), // Add user timestamp field
});

// Schema for updating a video URL
const updateVideoUrlSchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
  videoUrl: z.string().url("Invalid video URL"),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
  source: z.enum(["Dropbox", "Local", "Bunny"]).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not authenticated",
        },
        { status: 401 }
      );
    }

    if (!user.activeWorkspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: "No active workspace found",
        },
        { status: 400 }
      );
    }

    const videos = await getVideos(user.activeWorkspaceId);
    return NextResponse.json(videos);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch videos",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received video creation request body:", body);

    // Validate the request body
    const validatedData = createVideoSchema.parse(body);
    console.log("Validated data:", validatedData);
    console.log("Duration value:", validatedData.duration);

    // Generate title if not provided, using user's timestamp if available
    const title = validatedData.title || generateVideoTitleWithTimestamp();

    // Create the video record in the database
    const video = await db.video.create({
      data: {
        title,
        videoUrl: validatedData.videoUrl || "", // Allow empty string if no URL provided
        thumbnailUrl: validatedData.thumbnailUrl || null, // Add thumbnail URL
        userId: validatedData.userId,
        workspaceId: validatedData.workspaceId,
        duration: validatedData.duration,
        // Use provided source or default to Local for Screenbolt storage
        source: validatedData.source || "Local",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      video,
    });
  } catch (error) {
    console.error("Error creating video:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create video record",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received video update request body:", body);

    // Validate the request body
    const validatedData = updateVideoUrlSchema.parse(body);
    console.log("Validated data:", validatedData);

    // Update the video record in the database
    const video = await db.video.update({
      where: {
        id: validatedData.videoId,
      },
      data: {
        videoUrl: validatedData.videoUrl,
        thumbnailUrl: validatedData.thumbnailUrl || undefined, // Update thumbnail URL if provided
        // Use provided source or default to Local for Screenbolt uploads
        source: validatedData.source || "Local",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log("Video record updated successfully:", video);

    return NextResponse.json({
      success: true,
      video,
    });
  } catch (error) {
    console.error("Error updating video:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update video record",
      },
      { status: 500 }
    );
  }
}
