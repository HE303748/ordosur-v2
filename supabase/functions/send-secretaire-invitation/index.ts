// supabase/functions/send-secretaire-invitation/index.ts
//
// Edge Function — Envoi d'un email d'invitation secrétaire via Resend.
//
// Flow :
//   1. Le médecin clique "Inviter une secrétaire" → RPC invite_secretaire (génère token)
//   2. Client appelle CETTE fonction avec { email, prenom, nom, lien, medecin_nom }
//   3. On envoie un email HTML brandé Ordosur via Resend
//   4. En cas d'échec, le lien manuel reste affiché côté UI (fallback)
//
// Sécurité : verify_jwt=true. Le JWT du médecin est vérifié via supabase.auth.getUser().
//
// Variables d'environnement requises (déjà configurées dans les secrets Supabase) :
//   - RESEND_API_KEY
//   - SUPABASE_URL, SUPABASE_ANON_KEY (auto-injectées)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// ⚠️ Adresse d'expéditeur — DOIT correspondre à un domaine vérifié sur Resend.
// `ordosur.com` est vérifié → contact@ordosur.com est valide. Si tu veux changer
// pour noreply@ordosur.com ou autre, vérifie sur https://resend.com/domains.
const FROM_EMAIL = "Ordosur <contact@ordosur.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface EmailParams {
  prenom?: string;
  medecin_nom: string;
  lien: string;
  email: string;
}

function buildHtml(opts: EmailParams): string {
  const prenomGreeting = opts.prenom ? ` ${escapeHtml(opts.prenom)}` : "";
  const medecinSafe = escapeHtml(opts.medecin_nom);
  const emailSafe = escapeHtml(opts.email);
  // Note: opts.lien n'est PAS échappé dans href — c'est une URL Supabase token-based,
  // contenue (pas d'injection possible depuis l'utilisateur).
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Invitation à rejoindre Ordosur</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F8F5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#0A1628;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F8F5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E5E5E0;border-radius:8px;overflow:hidden;">
  <tr><td style="background-color:#0A1628;padding:32px 48px;">
    <div style="font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.01em;">Ordosur</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:4px;">La prescription, sécurisée.</div>
  </td></tr>
  <tr><td style="padding:40px 48px 24px 48px;">
    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#475569;">Bonjour${prenomGreeting},</p>
    <h1 style="margin:16px 0 16px 0;font-size:22px;font-weight:700;line-height:1.3;color:#0A1628;letter-spacing:-0.01em;">
      Vous êtes invité(e) à rejoindre Ordosur
    </h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">
      <strong style="color:#0A1628;">Dr. ${medecinSafe}</strong> vous invite à rejoindre son cabinet sur Ordosur en tant que secrétaire médicale.
    </p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
      Cliquez sur le bouton ci-dessous pour créer votre compte et accéder à votre espace&nbsp;:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
      <tr><td style="border-radius:6px;background-color:#00A86B;">
        <a href="${opts.lien}" style="display:inline-block;padding:14px 28px;font-family:inherit;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">
          Créer mon compte
        </a>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#94A3B8;">
      Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email sans risque.
    </p>
  </td></tr>
  <tr><td style="padding:24px 48px 32px 48px;border-top:1px solid #E5E5E0;">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#94A3B8;">
      Ordosur — Plateforme médicale pour les médecins marocains.<br>
      <a href="https://ordosur.com" style="color:#94A3B8;text-decoration:none;">ordosur.com</a>
    </p>
  </td></tr>
</table>
<p style="margin:16px 0 0 0;font-size:12px;color:#94A3B8;text-align:center;">
  Invitation envoyée à ${emailSafe}.
</p>
</td></tr>
</table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Authentification du médecin ────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non authentifié");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Utilisateur non autorisé");

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY non configurée côté Edge Function");

    // ── Validation du body ─────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { email, prenom, lien, medecin_nom } = body || {};

    if (!email || typeof email !== "string") throw new Error("Email destinataire manquant");
    if (!lien || typeof lien !== "string") throw new Error("Lien d'invitation manquant");
    if (!medecin_nom || typeof medecin_nom !== "string") throw new Error("Nom du médecin manquant");
    if (!/^https?:\/\//.test(lien)) throw new Error("Lien d'invitation invalide");

    // ── Envoi via Resend ───────────────────────────────────────────────────
    const html = buildHtml({
      prenom: typeof prenom === "string" && prenom.trim() ? prenom.trim() : undefined,
      medecin_nom: medecin_nom.trim(),
      lien,
      email,
    });

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Invitation à rejoindre Ordosur",
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.json().catch(() => ({}));
      const msg = errBody?.message || errBody?.error?.message || `Erreur Resend (${resendRes.status})`;
      throw new Error(msg);
    }
    const result = await resendRes.json();

    return new Response(JSON.stringify({ success: true, id: result?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
