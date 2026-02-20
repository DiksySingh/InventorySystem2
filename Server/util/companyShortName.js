const companyShortName = (name = "") => {
  if (!name) return "";

  const normalized = name.toLowerCase().trim();

  // ---- Custom Overrides (Always first priority) ----
  const customMap = {
    "gautam solar power private limited": "GS Power",
  };

  if (customMap[normalized]) return customMap[normalized];

  // ---- Remove common suffix words ----
  const removeWords = [
    "private",
    "limited",
    "ltd",
    "pvt",
    "pvt.",
    "private limited",
    "private ltd",
  ];

  let words = name
    .split(" ")
    .filter(w => !removeWords.includes(w.toLowerCase()));

  // ---- If only 2 words → Initials + PL ----
  if (words.length === 2) {
    return words.map(w => w[0].toUpperCase()).join("") + "PL";
  }

  // ---- If more than 2 words → Initials + PL ----
  if (words.length >= 2) {
    return words.map(w => w[0].toUpperCase()).join("") + "PL";
  }

  return name;
};

module.exports = companyShortName;