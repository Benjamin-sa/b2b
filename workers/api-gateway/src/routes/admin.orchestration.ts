/**
 * Admin Orchestration Routes
 *
 * Handles admin operations for user management
 * Uses service bindings for direct worker-to-worker communication
 */

import { Hono } from "hono";
import type { Env } from "../types";
import type { EmailQueueMessage } from "../../../shared-types/email-queue";
import invoicesRoutes from "./admin/invoices.routes";

const adminOrchestration = new Hono<{ Bindings: Env }>();

// Type definitions for admin operations
interface User {
  id: string;
  email: string;
  role: string;
  company_name: string;
  first_name: string;
  last_name: string;
  phone?: string;
  btw_number?: string;
  stripe_customer_id?: string;
  is_active: number;
  is_verified: number;
  created_at: string;
  updated_at: string;
}

interface UsersListResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * GET /admin/users
 * List all users with pagination and search
 * Simple proxy - no orchestration needed
 */
adminOrchestration.get("/users", async (c) => {
  try {
    const url = new URL(c.req.url);
    const queryString = url.search;

    console.log("🎯 [Gateway] Fetching users list with params:", queryString);


    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(`http://internal/admin/users${queryString}`, {
      method: "GET",
      headers,
    });

    const response = await c.env.AUTH_SERVICE.fetch(request);

    if (!response.ok) {
      console.error("❌ [Gateway] Failed to fetch users:", response.status);
      return response;
    }

    console.log("✅ [Gateway] Users list fetched successfully");
    return response;
  } catch (error: any) {
    console.error("❌ [Gateway] Error fetching users:", error);
    return c.json(
      {
        error: "OrchestrationError",
        code: "gateway/fetch-users-failed",
        message: error.message || "Failed to fetch users",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * GET /admin/users/:userId
 * Get user details by ID
 * Simple proxy - no orchestration needed
 */
adminOrchestration.get("/users/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    console.log("🎯 [Gateway] Fetching user details for:", userId);


    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(`http://internal/admin/users/${userId}`, {
      method: "GET",
      headers,
    });

    const response = await c.env.AUTH_SERVICE.fetch(request);

    if (!response.ok) {
      console.error(
        "❌ [Gateway] Failed to fetch user details:",
        response.status
      );
      return response;
    }

    console.log("✅ [Gateway] User details fetched successfully");
    return response;
  } catch (error: any) {
    console.error("❌ [Gateway] Error fetching user details:", error);
    return c.json(
      {
        error: "OrchestrationError",
        code: "gateway/fetch-user-failed",
        message: error.message || "Failed to fetch user details",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * PUT /admin/users/:userId
 * Update user details
 * Simple proxy - no orchestration needed
 */
adminOrchestration.put("/users/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const clonedRequest = c.req.raw.clone();

    console.log("🎯 [Gateway] Updating user:", userId);


    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(`http://internal/admin/users/${userId}`, {
      method: "PUT",
      headers,
      body: clonedRequest.body,
    });

    const response = await c.env.AUTH_SERVICE.fetch(request);

    if (!response.ok) {
      console.error("❌ [Gateway] Failed to update user:", response.status);
      return response;
    }

    console.log("✅ [Gateway] User updated successfully");
    return response;
  } catch (error: any) {
    console.error("❌ [Gateway] Error updating user:", error);
    return c.json(
      {
        error: "OrchestrationError",
        code: "gateway/update-user-failed",
        message: error.message || "Failed to update user",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /admin/users/:userId/verify
 * Verify/approve a user account
 * Orchestrates: User Verification + Verification Email
 *
 * Flow:
 * 1. Verify user in database (BLOCKING - critical)
 * 2. Send verification confirmation email via QUEUE (NON-BLOCKING)
 * 3. Return success to frontend
 */
adminOrchestration.post("/users/:userId/verify", async (c) => {
  try {
    const userId = c.req.param("userId");

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    console.log("🎯 [Gateway] Orchestrating user verification for:", userId);

    // Step 1: Verify user (BLOCKING)
    const authRequest = new Request(
      `http://internal/admin/users/${userId}/verify`,
      {
        method: "POST",
        headers,
      }
    );

    const authResponse = await c.env.AUTH_SERVICE.fetch(authRequest);

    if (!authResponse.ok) {
      console.error(
        "❌ [Gateway] User verification failed:",
        authResponse.status
      );
      return authResponse;
    }

    const verificationResult = (await authResponse.json()) as {
      message: string;
      user: User;
    };
    console.log("✅ [Gateway] User verified:", verificationResult.user.email);

    // Step 2: Send verification confirmation email via QUEUE (NON-BLOCKING)
    console.log(
      "📧 [Gateway] Queuing verification email for:",
      verificationResult.user.email
    );

    const emailMessage: EmailQueueMessage = {
      type: "account-verified",
      email: verificationResult.user.email,
      firstName: verificationResult.user.first_name,
      companyName: verificationResult.user.company_name,
      timestamp: new Date().toISOString(),
    };

    try {
      await c.env.EMAIL_QUEUE.send(emailMessage);
      console.log("✅ [Gateway] Verification email queued successfully");
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error(
        "⚠️  [Gateway] Failed to queue verification email:",
        emailError
      );
    }

    // Step 3: Send Telegram notification (NON-BLOCKING)
    console.log(
      "📱 [Gateway] Sending Telegram notification for user verification"
    );

    try {
      const telegramMessage = `
✅ <b>User Verified</b>

👤 <b>User:</b> ${verificationResult.user.first_name} ${
        verificationResult.user.last_name
      }
🏢 <b>Company:</b> ${verificationResult.user.company_name}
📧 <b>Email:</b> ${verificationResult.user.email}
${
  verificationResult.user.phone
    ? `📞 <b>Phone:</b> ${verificationResult.user.phone}`
    : ""
}
${
  verificationResult.user.btw_number
    ? `🔖 <b>VAT:</b> ${verificationResult.user.btw_number}`
    : ""
}

<i>User has been verified and notified via email.</i>
      `.trim();

      const telegramRequest = new Request(
        "https://dummy/notifications/custom",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Token": c.env.SERVICE_SECRET,
          },
          body: JSON.stringify({
            message: telegramMessage,
            parseMode: "HTML",
          }),
        }
      );

      await c.env.TELEGRAM_SERVICE.fetch(telegramRequest);
      console.log("✅ [Gateway] Telegram notification sent successfully");
    } catch (telegramError) {
      // Log Telegram error but don't fail the request
      console.error(
        "⚠️  [Gateway] Failed to send Telegram notification:",
        telegramError
      );
    }

    // Step 4: Return success immediately (don't wait for notifications)
    console.log("🎉 [Gateway] User verification orchestration completed");
    return c.json(verificationResult);
  } catch (error: any) {
    console.error("❌ [Gateway] Verification orchestration failed:", error);
    return c.json(
      {
        error: "OrchestrationError",
        code: "gateway/verification-failed",
        message: error.message || "User verification failed",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * DELETE /admin/users/:userId
 * Soft delete (deactivate) a user
 * Simple proxy - no orchestration needed
 */
adminOrchestration.delete("/users/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    console.log("🎯 [Gateway] Deactivating user:", userId);

    const headers = new Headers(c.req.raw.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    const request = new Request(`http://internal/admin/users/${userId}`, {
      method: "DELETE",
      headers,
    });

    const response = await c.env.AUTH_SERVICE.fetch(request);

    if (!response.ok) {
      console.error("❌ [Gateway] Failed to deactivate user:", response.status);
      return response;
    }

    console.log("✅ [Gateway] User deactivated successfully");
    return response;
  } catch (error: any) {
    console.error("❌ [Gateway] Error deactivating user:", error);
    return c.json(
      {
        error: "OrchestrationError",
        code: "gateway/deactivate-user-failed",
        message: error.message || "Failed to deactivate user",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * POST /admin/users/:userId/reset-password
 * Admin reset user password
 * Simple proxy - no orchestration needed
 */
adminOrchestration.post("/users/:userId/reset-password", async (c) => {
  try {
    const userId = c.req.param("userId");
    const clonedRequest = c.req.raw.clone();

    const headers = new Headers(clonedRequest.headers);
    headers.set("X-Service-Token", c.env.SERVICE_SECRET);

    console.log("🎯 [Gateway] Resetting password for user:", userId);

    const request = new Request(
      `http://internal/admin/users/${userId}/reset-password`,
      {
        method: "POST",
        headers,
        body: clonedRequest.body,
      }
    );

    const response = await c.env.AUTH_SERVICE.fetch(request);

    if (!response.ok) {
      console.error("❌ [Gateway] Failed to reset password:", response.status);
      return response;
    }

    console.log("✅ [Gateway] Password reset successfully");
    return response;
  } catch (error: any) {
    console.error("❌ [Gateway] Error resetting password:", error);
    return c.json(
      {
        error: "OrchestrationError",
        code: "gateway/reset-password-failed",
        message: error.message || "Failed to reset password",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// ============================================================================
// INVOICES ROUTES
// ============================================================================
// Mount invoice routes (direct D1 database queries)
adminOrchestration.route("/invoices", invoicesRoutes);

export default adminOrchestration;
