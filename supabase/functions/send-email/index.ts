// Supabase Edge Function to send notification emails using Resend
// Deploy via: supabase functions deploy send-email
// Set secret: supabase secrets set RESEND_API_KEY=re_yourkey

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

serve(async (req) => {
  // CORS support
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    })
  }

  try {
    const payload = await req.json()
    
    // We expect the payload from a Supabase Database Webhook on INSERT in notifications table
    // A database webhook payload structure contains: record, type, table, schema
    const record = payload.record || payload

    const tipo = record.tipo
    const messaggio = record.messaggio
    const creato_da = record.creato_da
    const data_notifica = record.created_at

    // 1. Validate Resend API Key
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY secret")
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY environment variable on Supabase" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // 2. Fetch admin emails from the database (or configure a static recipient list)
    // To keep it simple and configurable, you can specify your main admin emails here,
    // or let the webhook fetch them.
    // Replace with your real administrator email addresses:
    const adminEmails = [
      //"gmassistenza17@gmail.com" // <-- CAMBIA CON LA TUA EMAIL REALE DA AMMINISTRATORE!
      "balbiani.gabriele@gmail.com"
    ]

    const subjectMap: Record<string, string> = {
      'registrazione': 'GM Turni - Nuova Registrazione Utente',
      'prenotazione_creata': 'GM Turni - Nuova Prenotazione Turno',
      'prenotazione_cancellata': 'GM Turni - Prenotazione Cancellata',
      'prenotazione_modificata': 'GM Turni - Prenotazione Modificata',
      'profilo_modificato': 'GM Turni - Profilo Utente Modificato'
    }

    const subject = subjectMap[tipo] || 'GM Turni - Nuova Notifica'

    // 3. Send email via Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "GM Turni Notifiche <onboarding@resend.dev>", // Or your verified custom domain on Resend
        to: adminEmails,
        subject: subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
            <h2 style="color: #6366f1; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">GM Turni - Notifica di Sistema</h2>
            
            <p style="font-size: 16px; line-height: 1.5; font-weight: bold; color: #0f172a; margin-top: 20px;">
              ${messaggio}
            </p>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f1f5f9; border-radius: 8px; font-size: 13px; color: #64748b;">
              <p style="margin: 0; margin-bottom: 5px;"><strong>Tipo Evento:</strong> ${tipo}</p>
              <p style="margin: 0; margin-bottom: 5px;"><strong>Autore Azione:</strong> ${creato_da}</p>
              <p style="margin: 0;"><strong>Data/Ora Evento:</strong> ${new Date(data_notifica).toLocaleString('it-IT')}</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              GM Turni - Roster Soccorso. Generato automaticamente dal database di produzione.
            </p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    console.log(`Email sent response:`, data)

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error("Error in Edge Function:", error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
