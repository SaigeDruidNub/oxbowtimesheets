"use client";

import { useEffect, useState } from "react";
import { FaHome } from "react-icons/fa";

export default function Header() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
  }, [isDark]);

  return (
    <nav
      style={{
        background: "var(--surface)",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FaHome style={{ fontSize: 28, marginRight: 8 }} />
        <span
          style={{
            fontWeight: 700,
            fontSize: 22,
            color: "var(--foreground)",
          }}
        >
          Oxbow Design Build 3.0
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ fontSize: 14, color: "var(--foreground)" }}>
          Logged in as Charity
        </span>
        <button
          style={{
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: 8,
            padding: "6px 18px",
            fontWeight: 500,
            marginRight: 12,
            cursor: "pointer",
            transition: "background 0.2s, color 0.2s",
          }}
        >
          Sign Out
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
          onClick={() => setIsDark((prev) => !prev)}
        >
          <div
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: isDark
                ? "var(--color-manatee)"
                : "var(--color-maximum-blue)",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: isDark ? "var(--color-black-pearl)" : "#fff",
                position: "absolute",
                top: 2,
                left: isDark ? 2 : 22,
                transition: "left 0.2s, background 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              }}
            />
          </div>
          <span style={{ fontSize: 14, color: "var(--foreground)" }}>
            {isDark ? "Dark" : "Light"}
          </span>
        </div>
      </div>
    </nav>
  );
}
