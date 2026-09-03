// Support & Contribution Configuration for DamToday
// You can override these values via .env (VITE_UPI_ID, VITE_PAYEE_NAME)

export const SUPPORT_CONFIG = {
  // Your PhonePe / YBL UPI ID
  upiId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_UPI_ID) || "6364197580@ybl",
  
  // Payee name shown on Google Pay, PhonePe, Paytm, etc.
  payeeName: (typeof import.meta !== "undefined" && import.meta.env?.VITE_PAYEE_NAME) || "DamToday",

  // Default suggested tip amount in INR
  defaultAmount: 50,

  // Suggested micro-contribution tiers
  presetTiers: [
    { inr: 30, label: "Cutting Chai", icon: "☕", desc: "A warm cup of cutting chai" },
    { inr: 50, label: "Filter Coffee", icon: "☕", desc: "A cup of hot filter coffee" },
    { inr: 100, label: "Server Fuel", icon: "⚡", desc: "Covers one day of scraper infrastructure" },
    { inr: 250, label: "Hydrology Hero", icon: "🌊", desc: "Helps keep dam telemetry free for all" }
  ],

  // Generates standard NPCI UPI payment deep link
  getUpiUri: (amount, note = "DamToday Ad-Free Support") => {
    const upiId = SUPPORT_CONFIG.upiId;
    const payee = encodeURIComponent(SUPPORT_CONFIG.payeeName);
    const memo = encodeURIComponent(note);
    const amt = parseFloat(amount) > 0 ? `&am=${parseFloat(amount).toFixed(2)}` : "";
    return `upi://pay?pa=${upiId}&pn=${payee}${amt}&cu=INR&tn=${memo}`;
  }
};
