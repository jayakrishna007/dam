import UpiPaymentCard from "./UpiPaymentCard";

export default function SupportPage({ navigate, lang = "en", t }) {
  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 40px) 16px 60px",
        animation: "fadeSlideUp 0.4s ease",
        color: "#DDEFFC"
      }}
    >
      {/* Back to Dashboard Button */}
      <button
        onClick={() => navigate("/")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(224,242,254,0.7)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 24,
          padding: "7px 14px",
          borderRadius: 8,
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#38BDF8";
          e.currentTarget.style.borderColor = "rgba(56,189,248,0.4)";
          e.currentTarget.style.background = "rgba(56,189,248,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "rgba(224,242,254,0.7)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        &larr; {t ? t("backToDashboard") : "Back to Dashboard"}
      </button>

      {/* Hero Banner: Why No Ads */}
      <div
        style={{
          background: "linear-gradient(135deg, #091E36 0%, #030D1A 100%)",
          border: "1px solid rgba(6, 182, 212, 0.25)",
          borderRadius: 20,
          padding: "clamp(24px, 5vw, 44px) clamp(16px, 4vw, 36px)",
          marginBottom: 36,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.08)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0284C7, #06B6D4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)",
              flexShrink: 0
            }}
          >
            ☕
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#67E8F9", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Our Ad-Free Commitment
            </div>
            <h1
              style={{
                fontSize: "clamp(24px, 5vw, 34px)",
                fontWeight: 900,
                color: "#FFFFFF",
                margin: 0,
                lineHeight: 1.2
              }}
            >
              100% Free. 100% Ad-Free.
            </h1>
          </div>
        </div>

        <p
          style={{
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "rgba(224, 242, 254, 0.8)",
            lineHeight: 1.7,
            marginBottom: 28,
            maxWidth: 720
          }}
        >
          We refuse to compromise Damtoday with intrusive banner ads, slow tracking scripts, or annoying video popups. 
          When farmers, researchers, and families check water levels and flood alerts, they deserve an instant, clean, and distraction-free experience. 
          To keep this platform ad-free and open for everyone, we count on support from people like you!
        </p>

        {/* 3 Pillars of Our No-Ads Promise */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 12,
              padding: "16px 14px"
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>⚡</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#38BDF8", marginBottom: 6 }}>
              Blazing Fast for Farmers
            </div>
            <div style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.6)", lineHeight: 1.5 }}>
              Commercial ads add megabytes of bloat. We keep Damtoday ultra-lightweight so rural farmers on 2G/3G get instant data without burning data packs.
            </div>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 12,
              padding: "16px 14px"
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>🛡️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#4ADE80", marginBottom: 6 }}>
              Unobstructed Safety Telemetry
            </div>
            <div style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.6)", lineHeight: 1.5 }}>
              During monsoon floods and gate releases, emergency water levels and discharge warnings must never be blocked by accidental ad clicks.
            </div>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 12,
              padding: "16px 14px"
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#F472B6", marginBottom: 6 }}>
              Zero Ad Trackers or Profiling
            </div>
            <div style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.6)", lineHeight: 1.5 }}>
              We do not track your device or sell your location to third-party ad brokers. Public water information should be free, private, and respected.
            </div>
          </div>
        </div>
      </div>

      {/* Main UPI Contribution Station */}
      <div style={{ marginBottom: 36 }}>
        <UpiPaymentCard lang={lang} t={t} />
      </div>

      {/* Story Teaser Card */}
      <div
        style={{
          background: "rgba(6, 20, 38, 0.6)",
          border: "1px solid rgba(6, 182, 212, 0.2)",
          borderRadius: 16,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E0F2FE", marginBottom: 4 }}>
            Curious about who built this?
          </div>
          <div style={{ fontSize: 12, color: "rgba(224, 242, 254, 0.6)", maxWidth: 500 }}>
            Read the story of how a group of tech engineers with farming roots built Damtoday to bring all Indian and global reservoirs into one unified place.
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/about")}
          style={{
            background: "rgba(6, 182, 212, 0.12)",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            borderRadius: 8,
            color: "#67E8F9",
            fontWeight: 700,
            fontSize: 12,
            padding: "8px 16px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(6, 182, 212, 0.25)";
            e.currentTarget.style.color = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(6, 182, 212, 0.12)";
            e.currentTarget.style.color = "#67E8F9";
          }}
        >
          Read Our Story &rarr;
        </button>
      </div>
    </div>
  );
}
