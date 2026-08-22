import { NextRequest } from "next/server";
import { z } from "zod";

import { AuthService } from "@/lib/services/auth.service";
import { ValidationError, ConflictError } from "@/lib/shared/errors";
import { ok, handleApiError, fail } from "@/lib/shared/api-response";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(64),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid input",
        "VALIDATION_ERROR",
        400
      );
    }

    const user = await AuthService.signupWithWorkspace({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name || "",
    });

    return ok(
      {
        message: "Account created",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          active_workspace: user.activeWorkspaceId,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(error.message, error.code, error.status);
    }
    if (error instanceof ConflictError) {
      return fail(error.message, error.code, error.status);
    }
    return handleApiError(error, "POST /api/auth/signup");
  }
}
