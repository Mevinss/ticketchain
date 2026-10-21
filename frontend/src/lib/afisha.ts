export type AfishaItem = {
  id: string;
  title: string;
  kind: "cinema" | "theatre";
  cities: string[];
  age: string;
  duration: number;
  date?: string;
  venue: [string, string];
  description: [string, string];
  source: string;
  poster?: string;
  color: string;
};
export const verifiedOn = "2026-10-21";
export function afishaDate(value: string, lang: "ru" | "kk") {
  const d = new Date(value.length === 10 ? value + "T12:00:00+05:00" : value);
  const local = new Date(d.getTime() + 5 * 3600000);
  const months = lang === "kk"
    ? ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"]
    : ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  return `${local.getUTCDate()} ${months[local.getUTCMonth()]}` + (value.includes("T") ? `, ${String(local.getUTCHours()).padStart(2,"0")}:${String(local.getUTCMinutes()).padStart(2,"0")}` : "");
}
export const afisha: AfishaItem[] = [
  {
    id: "qaraqshy",
    title: "7 қарақшы",
    kind: "cinema",
    cities: ["Алматы", "Астана"],
    age: "14+",
    duration: 120,
    venue: ["Кинотеатры города", "Қала кинотеатрлары"],
    description: [
      "Казахстанский приключенческий триллер Куаныша Бейсека. Сеансы и язык показа уточняйте у кинотеатра.",
      "Қуаныш Бейсектің қазақстандық шытырман оқиғалы триллері. Сеанс уақыты мен көрсету тілін кинотеатрдан нақтылаңыз.",
    ],
    source: "https://ticketon.kz/kz/cinema/event/tckt2-7-karakshy",
    poster:
      "https://api-gw.ticketon.kz/f3/v1/images/82bcd77d-ce79-4888-896b-bfb0e14d28b3.jpg",
    color: "#4b5037",
  },
  {
    id: "kesu",
    title: "Kesu",
    kind: "cinema",
    cities: ["Алматы", "Астана"],
    age: "16+",
    duration: 113,
    venue: ["Кинотеатры города", "Қала кинотеатрлары"],
    description: [
      "Приключенческая драма Даулета Жумабаева: поиски пропавшего наставника приводят героев в Сеул.",
      "Дәулет Жұмабаевтың шытырман оқиғалы драмасы: жоғалған ұстазын іздеген кейіпкерлер Сеулге аттанады.",
    ],
    source: "https://ticketon.kz/en/cinema/event/tckt2-kesu",
    color: "#8a392b",
  },
  {
    id: "shamshi",
    title: "Шәмші",
    kind: "theatre",
    cities: ["Астана"],
    age: "10+",
    duration: 80,
    date: "2026-10-22T19:00:00+05:00",
    venue: ["Музыкальный театр юного зрителя", "Музыкалық жас көрермен театры"],
    description: [
      "Мюзикл по произведению М. Омаровой. Постановка Асхата Маемирова, на казахском языке.",
      "М. Омарованың шығармасы бойынша мюзикл. Асхат Маемировтың қойылымы, қазақ тілінде.",
    ],
    source: "https://ticketon.kz/theatres/event/tckt2-shamshi-mtuz",
    color: "#64502e",
  },
  {
    id: "tosca",
    title: "Тоска",
    kind: "theatre",
    cities: ["Алматы"],
    age: "0+",
    duration: 120,
    date: "2026-10-30T19:00:00+05:00",
    venue: ["КазНТОБ имени Абая", "Абай атындағы ҚазҰОБТ"],
    description: [
      "Премьера оперы Джакомо Пуччини в постановке Стефано Пода. В афише также указан показ 31 октября.",
      "Стефано Пода қойған Джакомо Пуччини операсының премьерасы. Афишада 31 қазандағы көрсетілім де бар.",
    ],
    source: "https://ticketon.kz/theatres/event/tckt2-toska-dzh-puchchini",
    color: "#573b52",
  },
  {
    id: "detective",
    title: "Зверский детектив",
    kind: "theatre",
    cities: ["Алматы"],
    age: "6+",
    duration: 45,
    date: "2026-10-23",
    venue: [
      "Государственный театр кукол Алматы",
      "Алматы мемлекеттік қуыршақ театры",
    ],
    description: [
      "Спектакль театра «ТОХОТ» в программе IV Almaty Puppet Festival. Точное время смотрите у организатора.",
      "IV Almaty Puppet Festival бағдарламасындағы «ТОХОТ» театрының қойылымы. Нақты уақытын ұйымдастырушыдан қараңыз.",
    ],
    source:
      "https://ticketon.kz/theatres/event/tckt2-zverskiy-detektiv-apf2026",
    color: "#285c58",
  },
];
export function filterAfisha(
  items: AfishaItem[],
  city: string,
  kind: string,
  query: string,
) {
  const q = query.trim().toLocaleLowerCase();
  return items.filter(
    (x) =>
      (!city || x.cities.includes(city)) &&
      (!kind || x.kind === kind) &&
      [x.title, ...x.venue, ...x.description]
        .join(" ")
        .toLocaleLowerCase()
        .includes(q),
  );
}
