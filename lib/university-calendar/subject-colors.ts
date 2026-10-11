export type SubjectColor = { name: string | null; hex: string };

// CSS3 names also let calendar clients read the standard iCalendar COLOR property.
const PALETTE: SubjectColor[] = [
  { name: "royalblue", hex: "#4169e1" }, { name: "seagreen", hex: "#2e8b57" },
  { name: "darkorchid", hex: "#9932cc" }, { name: "indianred", hex: "#cd5c5c" },
  { name: "darkgoldenrod", hex: "#b8860b" }, { name: "olivedrab", hex: "#6b8e23" },
  { name: "steelblue", hex: "#4682b4" }, { name: "mediumvioletred", hex: "#c71585" },
  { name: "slateblue", hex: "#6a5acd" }, { name: "chocolate", hex: "#d2691e" },
  { name: "forestgreen", hex: "#228b22" }, { name: "cadetblue", hex: "#5f9ea0" },
  { name: "sienna", hex: "#a0522d" }, { name: "olive", hex: "#808000" },
  { name: "darkslateblue", hex: "#483d8b" }, { name: "teal", hex: "#008080" },
  { name: "crimson", hex: "#dc143c" }, { name: "darkcyan", hex: "#008b8b" },
  { name: "darkviolet", hex: "#9400d3" }, { name: "orangered", hex: "#ff4500" },
  { name: "mediumblue", hex: "#0000cd" }, { name: "darkgreen", hex: "#006400" },
  { name: "deeppink", hex: "#ff1493" }, { name: "dodgerblue", hex: "#1e90ff" },
  { name: "darkred", hex: "#8b0000" }, { name: "darkolivegreen", hex: "#556b2f" },
  { name: "blueviolet", hex: "#8a2be2" }, { name: "peru", hex: "#cd853f" },
  { name: "mediumseagreen", hex: "#3cb371" }, { name: "hotpink", hex: "#ff69b4" },
  { name: "midnightblue", hex: "#191970" }, { name: "saddlebrown", hex: "#8b4513" },
];

export function subjectColorKey(title: string) {
  return title.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT");
}

function extraColor(index: number): SubjectColor {
  const hue = ((index * 137.508) % 360) / 30;
  const channel = (n: number) => {
    const k = (n + hue) % 12;
    return Math.round(255 * (.4 - .22 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
  };
  return { name: null, hex: `#${channel(0)}${channel(8)}${channel(4)}` };
}

export function subjectColors(titles: string[]): Map<string, SubjectColor> {
  const colors = new Map<string, SubjectColor>();
  const used = new Set<string>();
  for (const title of [...new Set(titles.map(subjectColorKey))].sort()) {
    let hash = 0;
    for (const character of title) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
    let color: SubjectColor | undefined;
    let bestDistance = -1;
    for (let offset = 0; offset < PALETTE.length; offset++) {
      const candidate = PALETTE[(hash + offset) % PALETTE.length];
      if (used.has(candidate.hex)) continue;
      const distance = Math.min(...[...used].map((hex) => [1, 3, 5].reduce((sum, index) => sum + (parseInt(candidate.hex.slice(index, index + 2), 16) - parseInt(hex.slice(index, index + 2), 16)) ** 2, 0)));
      if (distance > bestDistance) { color = candidate; bestDistance = distance; }
      if (distance >= 20000) break;
    }
    if (!color) {
      let index = colors.size;
      do { color = extraColor(index++); } while (used.has(color.hex));
    }
    used.add(color.hex); colors.set(title, color);
  }
  return colors;
}
