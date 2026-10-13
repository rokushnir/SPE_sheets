// Мальовані обличчя директорів. Настрій змінює брови, очі й рот.

const INK = "var(--face)";

const FACES = {
  neutral: {
    brows: "M20 24 L28 24 M36 24 L44 24",
    eyes: [[24, 30], [40, 30]],
    mouth: "M25 44 L39 44",
  },
  skeptical: {
    brows: "M20 22 L28 25 M36 21 L44 19",
    eyes: [[24, 30], [40, 30]],
    mouth: "M25 45 Q32 43 39 41",
  },
  happy: {
    brows: "M20 23 Q24 20 28 23 M36 23 Q40 20 44 23",
    eyes: [[24, 30], [40, 30]],
    mouth: "M24 41 Q32 49 40 41",
  },
  worried: {
    brows: "M20 23 L28 21 M36 21 L44 23",
    eyes: [[24, 31], [40, 31]],
    mouth: "M26 46 Q29 43 32 46 Q35 49 38 46",
  },
  excited: {
    brows: "M20 20 Q24 17 28 20 M36 20 Q40 17 44 20",
    eyes: [[24, 29], [40, 29]],
    mouth: "M23 40 L41 40 Q32 52 23 40 Z",
    filled: true,
  },
  thinking: {
    brows: "M20 24 L28 22 M36 22 L44 24",
    eyes: [[25, 28], [41, 28]],
    mouth: "M28 45 L37 44",
  },
};

const ACCESSORY = {
  // Марта: круглі окуляри і гулька
  cfo: `<circle cx="32" cy="7" r="5" fill="${INK}"/>
        <circle cx="24" cy="30" r="6" fill="none" stroke="${INK}" stroke-width="2"/>
        <circle cx="40" cy="30" r="6" fill="none" stroke="${INK}" stroke-width="2"/>
        <path d="M30 30 L34 30" stroke="${INK}" stroke-width="2"/>`,
  // Тарас: гарнітура з мікрофоном
  cco: `<path d="M10 32 Q10 6 32 6 Q54 6 54 32" fill="none" stroke="${INK}" stroke-width="3"/>
        <rect x="6" y="28" width="7" height="11" rx="3" fill="${INK}"/>
        <rect x="51" y="28" width="7" height="11" rx="3" fill="${INK}"/>
        <path d="M10 38 Q14 50 24 50" fill="none" stroke="${INK}" stroke-width="2"/>
        <circle cx="25" cy="50" r="2.5" fill="${INK}"/>`,
  // Ірина: каре і краватка-метелик
  lawyer: `<path d="M12 34 Q8 8 32 8 Q56 8 52 34 L52 22 Q46 14 32 15 Q18 14 12 22 Z" fill="${INK}"/>
           <path d="M26 60 L32 56 L38 60 L38 52 L32 56 L26 52 Z" fill="${INK}"/>`,
  // Богдан: будівельна каска
  coo: `<path d="M13 22 Q13 4 32 4 Q51 4 51 22 Z" fill="var(--hat)" stroke="${INK}" stroke-width="2.5"/>
        <path d="M8 22 L56 22" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
        <path d="M32 5 L32 14" stroke="${INK}" stroke-width="2"/>`,
};

export function avatarSVG(id, mood = "neutral", { title } = {}) {
  const f = FACES[mood] || FACES.neutral;
  const color = `var(--${id})`;
  const eyes = f.eyes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${INK}"/>`).join("");
  const mouth = f.filled
    ? `<path d="${f.mouth}" fill="${INK}"/>`
    : `<path d="${f.mouth}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 64 64" class="ava" role="img" aria-label="${title || ""}">
    <circle cx="32" cy="34" r="24" fill="${color}" stroke="${INK}" stroke-width="2.5"/>
    ${ACCESSORY[id] || ""}
    <path d="${f.brows}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    ${eyes}
    ${mouth}
  </svg>`;
}

export function playerSVG(initial = "Я") {
  const ch = String(initial || "Я").trim().charAt(0).toUpperCase() || "Я";
  return `<svg viewBox="0 0 64 64" class="ava" role="img" aria-label="Ти">
    <circle cx="32" cy="32" r="26" fill="var(--paper)" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="5 4"/>
    <text x="32" y="41" text-anchor="middle" font-family="var(--font-display)" font-size="24" font-weight="700" fill="var(--ink)">${ch.replace(/[<&>"]/g, "")}</text>
  </svg>`;
}
