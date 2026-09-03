import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { SUPPORT_CONFIG } from "../config/support";

export default function UpiPaymentCard() {
  const [selectedAmount, setSelectedAmount] = useState(SUPPORT_CONFIG.defaultAmount);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const activeAmount = isCustom ? (parseFloat(customAmount) || 0) : selectedAmount;
  const upiUri = SUPPORT_CONFIG.getUpiUri(activeAmount > 0 ? activeAmount : 50);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1.5,
      color: {
        dark: "#03172e",
        light: "#ffffff"
      },
      errorCorrectionLevel: "M"
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error("QR Code Error:", err));

    return () => {
      isMounted = false;
    };
  }, [upiUri]);

  const handleCopyUpi = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(SUPPORT_CONFIG.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(6, 26, 49, 0.85) 0%, rgba(3, 13, 27, 0.95) 100%)",
        border: "1px solid rgba(6, 182, 212, 0.25)",
        borderRadius: 18,
        padding: "clamp(18px, 4vw, 32px)",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4), 0 0 25px rgba(6, 182, 212, 0.08)",
        backdropFilter: "blur(16px)",
        maxWidth: 580,
        margin: "0 auto",
        boxSizing: "border-box"
      }}
    >
      {/* Title & Micro-pitch */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 20, background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.25)", marginBottom: 10 }}>
          <span style={{ fontSize: 13 }}>🇮🇳</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#67E8F9", letterSpacing: 1, textTransform: "uppercase" }}>
            Instant UPI Payment
          </span>
        </div>
        <h3 style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 800, color: "#E0F2FE", margin: "0 0 6px" }}>
          Buy Us a Coffee or Chai ☕
        </h3>
        <p style={{ fontSize: 12.5, color: "rgba(224, 242, 254, 0.6)", margin: 0, lineHeight: 1.5 }}>
          Zero platform fees. 100% of your contribution goes directly to server hosting & real-time telemetry pipelines.
        </p>
      </div>

      {/* Preset Amount Chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 20 }}>
        {SUPPORT_CONFIG.presetTiers.map((tier) => {
          const isSelected = !isCustom && selectedAmount === tier.inr;
          return (
            <button
              key={tier.inr}
              type="button"
              onClick={() => {
                setIsCustom(false);
                setSelectedAmount(tier.inr);
              }}
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(3, 105, 161, 0.4) 100%)"
                  : "rgba(255, 255, 255, 0.04)",
                border: `1.5px solid ${isSelected ? "#38BDF8" : "rgba(255, 255, 255, 0.08)"}`,
                borderRadius: 12,
                padding: "10px 8px",
                color: isSelected ? "#FFFFFF" : "rgba(224, 242, 254, 0.75)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "center",
                boxShadow: isSelected ? "0 0 15px rgba(6, 182, 212, 0.3)" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.4)";
                  e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                }
              }}
            >
              <span style={{ fontSize: 16 }}>{tier.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: isSelected ? "#38BDF8" : "#E0F2FE" }}>
                ₹{tier.inr}
              </span>
              <span style={{ fontSize: 10, color: isSelected ? "#A5F3FC" : "rgba(224, 242, 254, 0.5)", fontWeight: 500 }}>
                {tier.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Amount Field (Optional Toggle) */}
      <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            setIsCustom(!isCustom);
            if (!isCustom && !customAmount) setCustomAmount("150");
          }}
          style={{
            background: isCustom ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${isCustom ? "#38BDF8" : "rgba(255, 255, 255, 0.1)"}`,
            borderRadius: 8,
            color: isCustom ? "#38BDF8" : "rgba(224, 242, 254, 0.6)",
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 10px",
            cursor: "pointer",
            flexShrink: 0
          }}
        >
          {isCustom ? "✓ Custom ₹" : "+ Custom Amount"}
        </button>

        {isCustom && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <span style={{ fontSize: 13, color: "#38BDF8", fontWeight: 700 }}>₹</span>
            <input
              type="number"
              min="10"
              max="50000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount"
              style={{
                width: "100%",
                background: "rgba(3, 10, 20, 0.8)",
                border: "1px solid rgba(6, 182, 212, 0.35)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                color: "#fff",
                outline: "none"
              }}
            />
          </div>
        )}
      </div>

      {/* QR Code Presentation for Desktop & Scanner users */}
      <div
        style={{
          background: "rgba(3, 10, 20, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: 14,
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginBottom: 20
        }}
      >
        <div style={{ fontSize: 11, color: "rgba(224, 242, 254, 0.6)", fontWeight: 600, letterSpacing: 0.5, textAlign: "center" }}>
          SCAN WITH ANY UPI APP (GPAY, PHONEPE, PAYTM, BHIM)
        </div>

        {qrDataUrl ? (
          <div
            style={{
              padding: 10,
              background: "#FFFFFF",
              borderRadius: 14,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <img
              src={qrDataUrl}
              alt="UPI QR Code to support DamToday"
              style={{ width: 190, height: 190, display: "block", borderRadius: 6 }}
            />
          </div>
        ) : (
          <div style={{ width: 190, height: 190, background: "rgba(255,255,255,0.05)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(224,242,254,0.4)", fontSize: 12 }}>
            Generating QR Code...
          </div>
        )}

        <div style={{ fontSize: 12, color: "#A5F3FC", fontWeight: 700 }}>
          Amount: ₹{activeAmount > 0 ? activeAmount : 50}
        </div>
      </div>

      {/* Mobile One-Tap Pay Button */}
      <div style={{ marginBottom: 18 }}>
        <a
          href={upiUri}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "linear-gradient(135deg, #0284C7 0%, #06B6D4 50%, #0EA5E9 100%)",
            color: "#FFFFFF",
            textDecoration: "none",
            borderRadius: 12,
            padding: "14px 20px",
            fontWeight: 800,
            fontSize: "clamp(13px, 3.5vw, 15px)",
            boxShadow: "0 6px 20px rgba(6, 182, 212, 0.35)",
            transition: "all 0.2s ease",
            textAlign: "center"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 28px rgba(6, 182, 212, 0.55)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(6, 182, 212, 0.35)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <span>⚡</span>
          <span>Pay ₹{activeAmount > 0 ? activeAmount : 50} via GPay / PhonePe / Paytm</span>
        </a>
        <div style={{ fontSize: 10.5, color: "rgba(224, 242, 254, 0.4)", textAlign: "center", marginTop: 6 }}>
          (On mobile phones, this opens your installed UPI application directly)
        </div>
      </div>

      {/* Copy UPI ID Box */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px dashed rgba(6, 182, 212, 0.3)",
          borderRadius: 10,
          padding: "9px 14px"
        }}
      >
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: 10, color: "rgba(224, 242, 254, 0.45)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.8 }}>
            UPI ID / VPA
          </div>
          <div style={{ fontSize: 13, color: "#67E8F9", fontWeight: 700, wordBreak: "break-all" }}>
            {SUPPORT_CONFIG.upiId}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyUpi}
          style={{
            background: copied ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.15)",
            border: `1px solid ${copied ? "#10B981" : "rgba(6, 182, 212, 0.4)"}`,
            borderRadius: 8,
            color: copied ? "#6EE7B7" : "#E0F2FE",
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s"
          }}
        >
          {copied ? "✓ Copied!" : "📋 Copy ID"}
        </button>
      </div>

      {/* Legal & Compliance Notice */}
      <div style={{ marginTop: 18, textAlign: "center", fontSize: 10.5, color: "rgba(224, 242, 254, 0.35)", lineHeight: 1.5 }}>
        Voluntary gift/tip to support DamToday's daily cloud server hosting, automated scrapers, and open data maintenance.
      </div>
    </div>
  );
}
