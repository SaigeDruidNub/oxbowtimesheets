export default function TimecardArchive() {
  return (
    <section
      style={{
        background: "var(--surface)",
        borderRadius: 20,
        padding: "1.5rem 2rem 2rem 2rem",
        marginBottom: 32,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          margin: 0,
          color: "var(--foreground)",
        }}
      >
        Reports — Timecard Archive
      </h2>
      <p style={{ color: "var(--foreground)", marginTop: 16 }}>
        Archived timecards.
      </p>
    </section>
  );
}
