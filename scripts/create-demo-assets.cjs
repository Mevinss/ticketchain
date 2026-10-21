const fs = require("node:fs");
const items = [
  [
    "night",
    "JAZZ",
    "AFTER HOURS",
    "#293d37",
    "#e9ba63",
    "Концерт",
    "Алматы",
    "Jazz Hall",
  ],
  [
    "cinema",
    "CINEMA",
    "BIG SCREEN CLUB",
    "#223749",
    "#e5e5cf",
    "Кино",
    "Астана",
    "Cinema Club",
  ],
  [
    "standup",
    "STAND",
    "UP.",
    "#e8b2c7",
    "#442945",
    "Stand-up",
    "Алматы",
    "Comedy Stage",
  ],
  [
    "theatre",
    "ON",
    "STAGE",
    "#853e30",
    "#f4d8ac",
    "Театр",
    "Қызылорда",
    "Drama Hall",
  ],
  [
    "campus",
    "CAMPUS",
    "TOGETHER",
    "#d8df72",
    "#344d3d",
    "Фестиваль",
    "Қызылорда",
    "Campus",
  ],
  [
    "arena",
    "GAME",
    "NIGHT",
    "#373266",
    "#c6c2f2",
    "Киберспорт",
    "Астана",
    "Arena",
  ],
];
fs.mkdirSync("frontend/public/posters", { recursive: true });
fs.mkdirSync("frontend/public/metadata", { recursive: true });
for (const [slug, a, b, bg, fg, category, city, venue] of items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="550" viewBox="0 0 800 550"><rect width="800" height="550" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="2" opacity=".5"><circle cx="665" cy="270" r="195"/><circle cx="665" cy="270" r="165"/><circle cx="665" cy="270" r="135"/><path d="M40 55H760M40 490H760"/></g><g fill="${fg}" font-family="Arial,sans-serif"><text x="48" y="93" font-size="17" letter-spacing="5">TICKETCHAIN / DEMO POSTER</text><text x="42" y="284" font-size="112" font-weight="900" letter-spacing="-5">${a}</text><text x="48" y="354" font-size="42" font-weight="700">${b}</text><text x="48" y="465" font-size="17" letter-spacing="3">MUSIC · CULTURE · COMMUNITY</text></g></svg>`;
  fs.writeFileSync("frontend/public/posters/" + slug + ".svg", svg);
  fs.writeFileSync(
    "frontend/public/metadata/" + slug + ".json",
    JSON.stringify(
      {
        description:
          "Учебное событие TicketChain / TicketChain оқу іс-шарасы. Только тестовый ETH / Тек тестілік ETH.",
        city,
        venue,
        category,
        posterUrl: "../posters/" + slug + ".svg",
      },
      null,
      2,
    ) + "\n",
  );
}
fs.copyFileSync(
  "frontend/public/posters/night.svg",
  "frontend/public/posters/fallback.svg",
);
console.log(
  "Six original typographic vector posters and metadata examples generated. No on-chain events created.",
);
