import { formatCurrencyFromCents } from "@/lib/challenge";

type SpecialDayContext = {
  currentDate: string;
  currentTarget: number;
  name: string | null;
  birthDate: Date | null;
  latestWeightKg: number | null;
  latestWaistCm: number | null;
  outstandingDebtCents: number;
  totalPushups: number;
  totalSitups: number;
  documentedDays: number;
  motivation: string | null;
};

type SpecialDayEntry = {
  date: string;
  title: string;
  body: (context: SpecialDayContext) => string;
};

export type SpecialDayNote = {
  title: string;
  body: string;
};

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null) {
    return null;
  }

  return value.toFixed(digits).replace(".", ",");
}

function metricTail(context: SpecialDayContext) {
  if (context.latestWaistCm != null) {
    return `Der letzte Bauchumfang steht bei ${formatNumber(context.latestWaistCm)} cm.`;
  }

  if (context.latestWeightKg != null) {
    return `Das letzte eingetragene Gewicht steht bei ${formatNumber(context.latestWeightKg)} kg.`;
  }

  if (context.documentedDays > 0) {
    return `Bisher sind ${context.documentedDays} Tage dokumentiert.`;
  }

  return `Heute warten ${context.currentTarget} Wiederholungen pro Übung.`;
}

const SPECIAL_DAYS: SpecialDayEntry[] = [
  { date: "01-01", title: "Neujahr", body: (c) => `Neues Jahr, alter Muskelkater. ${metricTail(c)}` },
  { date: "01-06", title: "Drei Könige", body: (c) => `Drei Könige, zwei Übungen, null Ausreden. ${metricTail(c)}` },
  { date: "01-11", title: "Januarloch", body: () => `Heute klingt alles nach Winterschlaf. Der Körper sieht das bitte anders.` },
  { date: "01-17", title: "Grauer Samstag", body: (c) => `Draußen grau, im Dashboard hoffentlich nicht. ${metricTail(c)}` },
  { date: "01-24", title: "Kalte Hände", body: (c) => `Kalte Hände zählen nicht als Set. ${metricTail(c)}` },
  { date: "01-31", title: "Monatskante", body: (c) => `Der Januar kippt weg, die Wiederholungen bleiben stehen: ${c.currentTarget} pro Übung.` },
  { date: "02-02", title: "Februarstart", body: () => `Kurzer Monat, gleiche Schwerkraft.` },
  { date: "02-07", title: "Wintermodus", body: (c) => `Heute bitte nicht mit Decke trainieren. ${metricTail(c)}` },
  { date: "02-14", title: "Valentinstag", body: (c) => `Liebe ist, wenn man trotzdem Set 2 macht. ${metricTail(c)}` },
  { date: "02-20", title: "Nieselregen", body: () => `Perfektes Wetter, um drinnen keinen Sport zu vergessen.` },
  { date: "02-27", title: "Schaltfieber", body: (c) => `Der Kalender ist kurz, deine Liste aber nicht. ${metricTail(c)}` },
  { date: "03-01", title: "Märzbeginn", body: (c) => `Neuer Monat, gleiche Matte. ${metricTail(c)}` },
  { date: "03-08", title: "Märzluft", body: () => `Heute riecht alles nach Neubeginn und leichtem Core-Brennen.` },
  { date: "03-14", title: "Pi-Tag", body: () => `3,14 ist rund. Deine Sets bitte nicht.` },
  { date: "03-20", title: "Frühlingsanfang", body: () => `Frühling draußen, saubere Wiederholungen drinnen.` },
  { date: "03-27", title: "Uhr-vor-Alarm", body: () => `Wenn die Zeit springt, springt hoffentlich nicht deine Motivation.` },
  { date: "04-01", title: "Challenge-Start", body: (c) => `Kein Aprilscherz: Heute geht es wirklich los mit ${c.currentTarget} pro Übung.` },
  { date: "04-05", title: "Frühlingsknacken", body: () => `Es knackt im Rücken, hoffentlich nur symbolisch.` },
  { date: "04-12", title: "Aprilwetter", body: () => `Launisches Wetter, klare Sets.` },
  { date: "04-19", title: "Pollenalarm", body: () => `Wenn schon husten, dann bitte erst nach dem letzten Sit-up.` },
  { date: "04-26", title: "Sonntagsbein", body: () => `Heute ist der Tag, an dem selbst die Matte skeptisch schaut.` },
  { date: "05-01", title: "Maifeiertag", body: () => `Feiertag heißt nur, dass der Muskelkater festlich gekleidet kommt.` },
  { date: "05-04", title: "May the Fourth", body: () => `Möge die Körperspannung mit dir sein.` },
  { date: "05-09", title: "Maiwind", body: () => `Heute bitte mehr Zug im Set als im Wetterbericht.` },
  { date: "05-14", title: "Brückentag", body: () => `Heute keine Brücke bauen, heute einfach wieder runter und hoch.` },
  { date: "05-20", title: "Maimüdigkeit", body: () => `Müdigkeit ist nur ein sehr langsamer Liegestütz.` },
  { date: "05-29", title: "Fast Sommer", body: () => `Fast Sommer, echte Wiederholungen.` },
  { date: "06-01", title: "Juni", body: () => `Neuer Monat, gleiche Schwerkraft, schlechtere Ausreden.` },
  { date: "06-06", title: "Sommerprobe", body: () => `Heute testet der Tag, ob du wirklich im Rhythmus bist.` },
  { date: "06-12", title: "Warmer Boden", body: () => `Die Matte ist kein Strandtuch.` },
  { date: "06-18", title: "Hitzevorwarnung", body: () => `Heute zählt Körperspannung mehr als Wetterlaune.` },
  { date: "06-24", title: "Johanni", body: () => `Halb hell, halb müde, ganz trainierbar.` },
  { date: "06-30", title: "Halbjahr", body: (c) => `Halbes Kalenderjahr. ${c.documentedDays} dokumentierte Tage sehen schon nach Absicht aus.` },
  { date: "07-01", title: "Juli", body: () => `Jetzt bitte nicht in die Sommerpause hineinverdampfen.` },
  { date: "07-07", title: "Siebter Siebter", body: () => `Heute ist ein gutes Datum für zwei ehrliche Sets.` },
  { date: "07-12", title: "Grillwetter", body: () => `Kohle glüht später, zuerst glüht der Trizeps.` },
  { date: "07-18", title: "Sommerträgheit", body: () => `Heute hilft nur der klassische Trick: anfangen.` },
  { date: "07-24", title: "Hochsommer", body: () => `Schweiß zählt nicht als Extra-Wiederholung.` },
  { date: "07-31", title: "Monatsende", body: () => `Der Juli geht, die Sets bleiben im Gedächtnis.` },
  { date: "08-01", title: "August", body: () => `Neuer Monat. Bitte keine Urlaubslogik auf die Regeln anwenden.` },
  { date: "08-08", title: "Achterbahn", body: () => `Heute bitte nur die Wiederholungen hoch und runter.` },
  { date: "08-15", title: "Ferienmitte", body: () => `Wenn der Kalender nach Pause klingt, klingt dein Dashboard hoffentlich anders.` },
  { date: "08-22", title: "Spätsommer", body: () => `Die Luft wird weicher, die Regeln nicht.` },
  { date: "08-29", title: "Fast September", body: () => `Heute keine weiche Landung, nur saubere Sets.` },
  { date: "09-01", title: "September", body: () => `Neuer Monat, gleicher Boden unter den Händen.` },
  { date: "09-07", title: "Büromodus", body: () => `Falls heute alles nach Alltag aussieht: gut, der passt ins System.` },
  { date: "09-13", title: "Herbstprobe", body: () => `Leichtes Herbstgefühl, volle Verantwortung.` },
  { date: "09-19", title: "Regentag", body: () => `Heute fällt nur Wasser vom Himmel. Der Rest bleibt bei dir.` },
  { date: "09-27", title: "Quartalsende", body: () => `Ein Vierteljahr kann man absitzen. Oder sauber dokumentieren.` },
  { date: "10-01", title: "Oktober", body: () => `Kürzere Tage, gleiche Wiederholungen.` },
  { date: "10-03", title: "Einheitstag", body: () => `Heute bitte Einheit zwischen Plan, Video und Wirklichkeit.` },
  { date: "10-10", title: "Herbstluft", body: () => `Die Luft ist frisch, die Ausrede leider auch.` },
  { date: "10-17", title: "Nebelmodus", body: () => `Wenn der Tag diffus ist, hilft klare Zahl im Set 1.` },
  { date: "10-24", title: "Zeitumstellung naht", body: () => `Vorwarnung: Auch mit anderer Uhr bleibt Set 2 Set 2.` },
  { date: "10-31", title: "Halloween", body: () => `Das Gruseligste heute wäre ein leerer Upload-Slot.` },
  { date: "11-01", title: "November", body: () => `Der Monat für Menschen, die ihre Motivation lieber fest verdrahten.` },
  { date: "11-07", title: "Dunkler Morgen", body: () => `Heute hilft nur Licht, Kaffee oder Routine. Nimm am besten alles.` },
  { date: "11-11", title: "Karnevalsauftakt", body: () => `Narrheit ist erlaubt, Regelbruch nicht.` },
  { date: "11-18", title: "Novemberblues", body: () => `Wenn die Stimmung niedrig ist, bleiben die Sets trotzdem ganz normal hoch.` },
  { date: "11-27", title: "Jahresendgeruch", body: () => `Es riecht nach Jahresende, aber noch nicht nach Aufgeben.` },
  { date: "12-01", title: "Dezember", body: () => `Adventskalender für Erwachsene: jeden Tag wieder dieselbe Disziplin.` },
  { date: "12-06", title: "Nikolaus", body: () => `Im Schuh liegt heute leider nur Verantwortung.` },
  { date: "12-13", title: "Lichterkette", body: () => `Heute bitte mehr Spannung im Körper als in der Deko.` },
  { date: "12-20", title: "Jahresendspurt", body: () => `Die Feiertage kommen. Der Upload-Slot kommt auch.` },
  { date: "12-24", title: "Heiligabend", body: () => `Besinnlich, ja. Schlampig, nein.` },
  { date: "12-25", title: "Erster Feiertag", body: () => `Geschenke sind nett, dokumentierte Sets auch.` },
  { date: "12-26", title: "Zweiter Feiertag", body: () => `Resteküche ist okay. Restmotivation eher nicht.` },
  { date: "12-31", title: "Silvester", body: () => `Das Jahr knallt nur schön raus, wenn du heute nicht verschwimmst.` },
];

function getMonthDayFromDate(date: Date) {
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function getSpecialDayNote(context: SpecialDayContext): SpecialDayNote | null {
  if (context.birthDate) {
    const birthdayKey = getMonthDayFromDate(context.birthDate);
    const todayMonthDay = context.currentDate.slice(5);

    if (birthdayKey === todayMonthDay) {
      const name = context.name?.trim() || "du";
      return {
        title: "Geburtstag",
        body:
          `${name}, heute ist Geburtstag. Neues Lebensjahr, gleiche Matte, ` +
          `${context.currentTarget} Wiederholungen pro Übung. ` +
          (context.latestWeightKg != null
            ? `Das letzte Gewicht steht bei ${formatNumber(context.latestWeightKg)} kg.`
            : `Mach dir selbst das Geschenk, heute sauber zu dokumentieren.`),
      };
    }
  }

  const entry = SPECIAL_DAYS.find((item) => item.date === context.currentDate.slice(5));

  if (!entry) {
    return null;
  }

  const baseBody = entry.body(context);
  const motivationTail =
    context.motivation && context.currentDate.endsWith("-01")
      ? ` Erinnerung an dich selbst: ${context.motivation}`
      : "";
  const debtTail =
    context.outstandingDebtCents > 0 &&
    (context.currentDate.endsWith("-10") || context.currentDate.endsWith("-20"))
      ? ` Offene Schulden gerade: ${formatCurrencyFromCents(context.outstandingDebtCents)}.`
      : "";

  return {
    title: entry.title,
    body: `${baseBody}${motivationTail}${debtTail}`.trim(),
  };
}
