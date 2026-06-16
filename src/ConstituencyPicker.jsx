import { useState, useRef, useEffect } from "react";
import { ALL_CONSTITUENCIES, getConstituenciesForCounty } from "./constituencies";

const t = {
  green: "#2D7A4F", greenLight: "#EAF4EE", greenDark: "#1A5C35",
  text: "#1C1C1A", textMuted: "#6B6B5F", border: "#E2DDD6", white: "#FFFFFF", cream: "#FDFAF5",
};

export default function ConstituencyPicker({ value, onChange, county }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setQuery(value || ""); }, [value]);

  const pool = county ? getConstituenciesForCounty(county).map(name => ({ name, county })) : ALL_CONSTITUENCIES;
  const filtered = query
    ? pool.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 30)
    : pool.slice(0, 30);

  function select(c) {
    setQuery(c.name);
    onChange(c.name, c.county);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={county ? `Search ${county} constituencies…` : "Search your constituency…"}
        style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${t.border}`, borderRadius: 10, fontSize: 14, background: t.white, color: t.text, fontFamily: "Inter, sans-serif" }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: t.white, border: `1px solid ${t.border}`, borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 50,
          maxHeight: 240, overflowY: "auto",
        }}>
          {filtered.map(c => (
            <div
              key={c.name}
              onClick={() => select(c)}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between" }}
              onMouseEnter={e => e.currentTarget.style.background = t.greenLight}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span>{c.name}</span>
              {!county && <span style={{ color: t.textMuted, fontSize: 11 }}>{c.county}</span>}
            </div>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.white, border: `1px solid ${t.border}`, borderRadius: 12, padding: 14, fontSize: 13, color: t.textMuted, zIndex: 50 }}>
          No constituency found matching "{query}"
        </div>
      )}
    </div>
  );
}