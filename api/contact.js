import nodemailer from "nodemailer";
import getDb from "./mongodb.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    try {
      const db = await getDb();
      const docs = await db.collection("feedback")
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return res.status(200).json({ success: true, feedback: docs });
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch feedback" });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email, and message are required" });
  }

  let savedToDb = false;
  try {
    const db = await getDb();
    await db.collection("feedback").insertOne({
      name,
      email,
      message,
      createdAt: new Date()
    });
    savedToDb = true;
  } catch (dbErr) {
    console.error("MongoDB feedback save failed:", dbErr);
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const RECIPIENT_EMAIL = process.env.CONTACT_RECIPIENT_EMAIL || GMAIL_USER;

  const isEmailConfigured = GMAIL_USER && 
                            GMAIL_APP_PASSWORD && 
                            !GMAIL_USER.includes("your_gmail") && 
                            !GMAIL_APP_PASSWORD.includes("your_16_char");

  if (isEmailConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD,
        },
      });

      // Send notification to site owner
      await transporter.sendMail({
        from: `"DamToday Contact" <${GMAIL_USER}>`,
        to: RECIPIENT_EMAIL,
        replyTo: email,
        subject: `📬 New Feedback from ${name} — DamToday`,
        html: `
          <div style="font-family: sans-serif; background:#030A14; color:#E0F2FE; padding:28px; border-radius:12px; max-width:560px; margin:0 auto; border:1px solid rgba(6,182,212,0.2);">
            <h2 style="color:#06B6D4; margin-top:0;">💧 New DamToday Feedback</h2>
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <tr><td style="padding:8px 0; color:rgba(224,242,254,0.5); width:100px;">Name</td><td style="padding:8px 0; font-weight:600;">${name}</td></tr>
              <tr><td style="padding:8px 0; color:rgba(224,242,254,0.5);">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#06B6D4;">${email}</a></td></tr>
              <tr><td style="padding:8px 0; color:rgba(224,242,254,0.5); vertical-align:top;">Message</td><td style="padding:8px 0; line-height:1.6;">${message.replace(/\n/g, "<br>")}</td></tr>
            </table>
            <p style="font-size:11px; color:rgba(224,242,254,0.3); margin-top:24px; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">Sent via DamToday Contact Form — ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
          </div>
        `,
      });

      // Send confirmation to submitter
      await transporter.sendMail({
        from: `"DamToday" <${GMAIL_USER}>`,
        to: email,
        subject: `✅ We received your message, ${name}!`,
        html: `
          <div style="font-family: sans-serif; background:#030A14; color:#E0F2FE; padding:28px; border-radius:12px; max-width:560px; margin:0 auto; border:1px solid rgba(6,182,212,0.2);">
            <h2 style="color:#06B6D4; margin-top:0;">💧 Thanks for contacting DamToday</h2>
            <p style="line-height:1.6;">Hi <strong>${name}</strong>,</p>
            <p style="line-height:1.6;">We received your message and will get back to you at <a href="mailto:${email}" style="color:#06B6D4;">${email}</a> as soon as possible.</p>
            <blockquote style="border-left:3px solid rgba(6,182,212,0.4); margin:20px 0; padding:12px 16px; background:rgba(255,255,255,0.03); border-radius:4px; font-size:13px; color:rgba(224,242,254,0.6); font-style:italic;">"${message.slice(0, 200)}${message.length > 200 ? "..." : ""}"</blockquote>
            <p style="font-size:11px; color:rgba(224,242,254,0.3); margin-top:24px; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px;">DamToday — Daily Reservoir Water Levels & Live Alerts<br>This is an automated confirmation. Do not reply to this email.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Nodemailer error:", err);
    }
  }

  if (savedToDb || isEmailConfigured) {
    return res.status(200).json({ success: true, message: "Feedback submitted successfully." });
  } else {
    return res.status(500).json({ error: "Service temporarily unavailable. Please try again later." });
  }
}
