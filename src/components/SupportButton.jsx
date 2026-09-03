export default function SupportButton({
  navigate,
  variant = "navbar",
  style = {},
  t
}) {
  const handleClick = (e) => {
    e.preventDefault();
    if (navigate) {
      navigate("/support");
    } else {
      window.location.href = "/support";
    }
  };

  const supportLabel = t ? (t("support") || "Support") : "Support";
  const buyChaiLabel = t ? (t("buyCoffeeChai") || "Buy a Coffee / Chai") : "Buy a Coffee / Chai";

  if (variant === "mobile") {
    return (
      <a
        href="/support"
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(3, 105, 161, 0.35) 100%)",
          border: "1.5px solid rgba(6, 182, 212, 0.5)",
          borderRadius: 12,
          padding: "14px 18px",
          color: "#E0F2FE",
          textDecoration: "none",
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 0.3,
          boxShadow: "0 4px 20px rgba(6, 182, 212, 0.2)",
          transition: "all 0.2s ease",
          ...style
        }}
      >
        <span style={{ fontSize: 18 }}>☕</span>
        <span>{buyChaiLabel} (Ad-Free)</span>
      </a>
    );
  }

  if (variant === "footer") {
    return (
      <a
        href="/support"
        onClick={handleClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(3, 105, 161, 0.25) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.35)",
          borderRadius: 20,
          padding: "8px 16px",
          color: "#67E8F9",
          textDecoration: "none",
          fontSize: 12,
          fontWeight: 700,
          transition: "all 0.2s ease",
          boxShadow: "0 2px 10px rgba(6, 182, 212, 0.15)",
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(3, 105, 161, 0.45) 100%)";
          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.6)";
          e.currentTarget.style.color = "#FFFFFF";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(3, 105, 161, 0.25) 100%)";
          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.35)";
          e.currentTarget.style.color = "#67E8F9";
          e.currentTarget.style.transform = "none";
        }}
      >
        <span style={{ fontSize: 14 }}>☕</span>
        <span>{buyChaiLabel}</span>
      </a>
    );
  }

  // Default: Navbar pill
  return (
    <a
      href="/support"
      onClick={handleClick}
      className="main-nav-support-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(3, 105, 161, 0.25) 100%)",
        border: "1px solid rgba(6, 182, 212, 0.35)",
        borderRadius: 20,
        padding: "5px 12px",
        color: "#E0F2FE",
        textDecoration: "none",
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 0.2,
        cursor: "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(6, 182, 212, 0.15)",
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, rgba(6, 182, 212, 0.28) 0%, rgba(3, 105, 161, 0.45) 100%)";
        e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.6)";
        e.currentTarget.style.color = "#FFFFFF";
        e.currentTarget.style.boxShadow = "0 0 14px rgba(6, 182, 212, 0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(3, 105, 161, 0.25) 100%)";
        e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.35)";
        e.currentTarget.style.color = "#E0F2FE";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(6, 182, 212, 0.15)";
      }}
    >
      <span style={{ fontSize: 13 }}>☕</span>
      <span>{supportLabel}</span>
    </a>
  );
}
