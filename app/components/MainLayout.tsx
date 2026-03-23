"use client";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
        minHeight: "100vh",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <Header />
      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ flex: 1, padding: "2rem 2.5rem" }}>{children}</div>
        <Sidebar />
      </div>
    </div>
  );
}
