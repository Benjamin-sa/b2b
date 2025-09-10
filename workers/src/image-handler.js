import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ✅ BEST PRACTICE: Definieer expliciet welke domeinen toegang hebben.
const allowedOrigins = [
  "http://localhost:5173", // Je lokale Vite dev server
  "https://motordash-cf401.web.app", // Je productie domein
  "https://4tparts.com",
  "http://192.168.129.22:3000", // Je lokale netwerk IP (indien nodig)
];

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");

    // Dynamisch de CORS headers instellen op basis van de aanvrager
    const corsHeaders = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    }

    // ✅ OPLOSSING: Stap 1 - Beantwoord de "toestemmingsvraag" (preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Alleen POST-requests zijn verder toegestaan
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders, // Voeg ook hier headers toe
      });
    }

    try {
      // ... (de rest van je logica blijft hetzelfde)
      const { filename, contentType } = await request.json();
      if (!filename || !contentType) {
        return new Response("Filename and contentType are required.", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
          secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        },
      });

      const key = `products/${Date.now()}-${filename.replace(
        /[^a-zA-Z0-9.\-_]/g,
        ""
      )}`;

      const signedUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: 300 }
      );

      const publicUrl = `${env.PUBLIC_R2_URL}/${key}`;

      return new Response(
        JSON.stringify({
          uploadUrl: signedUrl,
          publicUrl: publicUrl,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error(error);
      return new Response("Error creating presigned URL", {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
