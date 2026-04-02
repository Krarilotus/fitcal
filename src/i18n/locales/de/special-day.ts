import type {
  DailyMessageContext,
  DailyMessageIntlHelpers,
  SpecialDayLocaleDictionary,
} from "@/i18n/special-day";
import { deSpecialDayFacts } from "@/i18n/locales/de/special-day-facts";

function getBodyWeightDirection(context: DailyMessageContext) {
  if (context.latestWeightKg == null || context.heightCm == null || context.heightCm <= 0) {
    return null;
  }

  const heightM = context.heightCm / 100;
  const bmi = context.latestWeightKg / (heightM * heightM);

  if (bmi < 20) {
    return "bulk" as const;
  }

  if (bmi > 25) {
    return "cut" as const;
  }

  return "maintain" as const;
}

function buildDePersonalLines(
  context: DailyMessageContext,
  helpers: DailyMessageIntlHelpers,
) {
  const candidates: string[] = [];
  const latestWaist = helpers.formatNumber(context.latestWaistCm);
  const latestWeight = helpers.formatNumber(context.latestWeightKg);
  const height = helpers.formatNumber(context.heightCm, 0);
  const weightDirection = getBodyWeightDirection(context);

  if (latestWaist) {
    candidates.push(
      `Bauchumfang zuletzt: ${latestWaist} cm. Der Core hat den Wink verstanden.`,
      `${latestWaist} cm stehen für die Mitte im System. Die Sit-ups dürfen antworten.`,
      `Mit ${latestWaist} cm um die Mitte herum sollte heute der Bauch nicht die Regie übernehmen.`,
    );
  }

  if (latestWeight) {
    if (weightDirection === "cut" && height) {
      candidates.push(
        `${latestWeight} kg auf ${height} cm deuten heute eher auf Lean-Modus als auf Snack-Verteidigung.`,
        `Bei ${latestWeight} kg auf ${height} cm darf das ruhig nach weniger Ballast und mehr Spannung aussehen.`,
        `${latestWeight} kg bei ${height} cm sind ein guter Anlass für saubere Wiederholungen statt Ausreden mit Kalorienbeilage.`,
      );
    } else if (weightDirection === "bulk" && height) {
      candidates.push(
        `${latestWeight} kg auf ${height} cm schreien heute nicht nach Diät, eher nach Aufbau mit sauberer Form.`,
        `Bei ${latestWeight} kg auf ${height} cm darf heute ruhig etwas Bulking-Energie mit auf die Matte.`,
        `${latestWeight} kg bei ${height} cm wirken eher nach Struktur, Protein und einem vernünftigen zweiten Satz.`,
      );
    } else if (height) {
      candidates.push(
        `${latestWeight} kg auf ${height} cm sieht eher nach Halten als nach Drama aus.`,
        `Gewicht ${latestWeight} kg, Größe ${height} cm: gute Zone zum Stabilisieren und sauber Arbeiten.`,
        `Mit ${latestWeight} kg auf ${height} cm ist heute eher Maintain als Theater angesagt.`,
      );
    } else {
      candidates.push(
        `${latestWeight} kg sind notiert. Die Matte hat dazu nur Erwartungen.`,
        `${latestWeight} kg stehen im Profil, aber Liegestütze behandeln jedes Kilo gleich.`,
        `Mit zuletzt ${latestWeight} kg wird heute nicht gejammert, höchstens sauber gedrückt.`,
      );
    }
  }

  if (context.documentedDays > 0) {
    candidates.push(
      `${context.documentedDays} dokumentierte Tage später ist das hier ohnehin keine Laune mehr.`,
      `${context.documentedDays} Tage sind schon dokumentiert. Selbst die Matte weiß, dass du es ernst meinst.`,
      `${context.documentedDays} dokumentierte Tage sprechen dafür, dass dein innerer Schweinehund nur noch Sachbearbeiter ist.`,
    );
  }

  if (context.outstandingDebtCents > 0) {
    const debt = helpers.formatCurrency(context.outstandingDebtCents);
    candidates.push(
      `Offen sind ${debt}. Schulden reagieren erstaunlich gut auf Wiederholungen.`,
      `${debt} stehen offen. Der angenehmste Weg nach unten heißt Wiederholung.`,
      `Aktuell warten ${debt} darauf, kleiner gemacht zu werden.`,
    );
  }

  if (context.motivation) {
    candidates.push(
      `Falls der Kopf heute verhandeln will: ${context.motivation}`,
      `Zur Erinnerung an dich selbst: ${context.motivation}`,
      `Du hast dir einmal notiert: ${context.motivation}`,
    );
  }

  candidates.push(
    `Heute zählen ${context.currentTarget} pro Übung. Die Zahl ist leider immun gegen Charme.`,
    `${context.currentTarget} pro Übung sind heute die nüchterne Wahrheit.`,
    `Mehr als ${context.currentTarget} pro Übung ist Bonus, weniger ist bloß Mathematik.`,
    `${context.currentTarget} pro Übung sind heute dran. Nicht glamourös, aber wirksam.`,
    `Die Tageszahl lautet ${context.currentTarget}. Klein genug zum Machen, groß genug zum Nichtwegreden.`,
  );

  return candidates;
}

export const deSpecialDay: SpecialDayLocaleDictionary = {
  weekdayLocale: "de-DE",
  facts: deSpecialDayFacts,
  fallbackFact: "Heute zählt vor allem, den Tag sauber abzuschließen.",
  dateLeadPatterns: [
    /^Am \d{1,2}\.\s+[A-Za-zÄÖÜäöüß-]+(?:\s+\d{4})?\s+/u,
    /^Der \d{1,2}\.\s+[A-Za-zÄÖÜäöüß-]+(?:\s+\d{4})?\s+/u,
    /^Letzter [A-Za-zÄÖÜäöüß-]+:\s*/u,
    /^Frühlingsanfang:\s*/u,
    /^Schalttag:\s*/u,
    /^Valentinstag:\s*/u,
    /^Die Iden des März\s+/u,
  ],
  beginsWithVerbPattern:
    /^(ist|sind|war|wurde|wurden|bleibt|bleiben|gilt|fühlt|fühlen|passt|passen|zeigt|zeigen|startete|starten|begann|begannen|endet|endete|enden|markiert|erinnert|wirkt|wirken|hängt|hängen|liegt|liegen|trat|traf|macht|machen|erklärte|erklärt|trifft|kündigt|klingen|klingt)\b/i,
  seriousKeywords: [
    "Krieg",
    "Holocaust",
    "Anschlag",
    "Mord",
    "Katastroph",
    "Erdbeben",
    "Tschernobyl",
    "NSU",
    "Gewalt",
    "Kinderarbeit",
    "Menschenrechte",
    "Pocken",
    "AIDS",
    "Diabetes",
    "Pearl Harbor",
    "Utøya",
    "Roskilde",
    "Floyd",
    "Mauer",
    "Migranten",
    "Massaker",
    "Geiselnahme",
    "Terror",
  ],
  sportPattern:
    /Sport|Olymp|Dance|Yoga|Skateboarding|Tour de France|Tennis|Bicycle|Cricket|Fußball|WM|Wimbledon/i,
  verbLeadVariants: [
    ({ strippedFact }) => `Heute ${strippedFact}`,
    ({ strippedFact }) => `Für heute bleibt hängen: ${strippedFact}`,
    ({ strippedFact }) => `Im Kalender steht heute: ${strippedFact}`,
    ({ weekday, strippedFact }) => `${weekday} gilt hier: ${strippedFact}`,
  ],
  nounLeadVariants: [
    ({ strippedFact }) => `Heute gilt: ${strippedFact}`,
    ({ weekday, strippedFact }) => `${weekday} bringt das hier mit: ${strippedFact}`,
    ({ strippedFact }) => `Im Kalender steht heute: ${strippedFact}`,
    ({ strippedFact }) => `Für heute bleibt hängen: ${strippedFact}`,
    ({ weekday, strippedFact }) => `${weekday} hat diese Randnotiz: ${strippedFact}`,
    ({ strippedFact }) => `Die Datumsnotiz für heute lautet: ${strippedFact}`,
    ({ strippedFact }) => `Was heute hängen bleibt: ${strippedFact}`,
    ({ strippedFact }) => `Heute passt dieser Gedanke: ${strippedFact}`,
  ],
  seriousFocusLines: () => [
    "Heute reicht ein ruhiger, sauberer Tag als Antwort völlig aus.",
    "Mehr musst du daraus nicht machen: ordentlich liefern genügt.",
    "Konzentriert bleiben ist heute schon genug Haltung.",
    "Ein nüchterner, sauberer Tag passt dazu am besten.",
  ],
  sportFocusLines: (context) => [
    `${context.currentTarget} saubere pro Übung wären dazu ein sehr ordentliches Echo.`,
    "Der Kalender ist heute sportlich drauf. Du musst nur nachziehen.",
    "Heute darf die Geschichte gern ein kleines Echo auf der Matte bekommen.",
    "Das passt hervorragend zu zwei ordentlichen Sätzen ohne Theater.",
  ],
  genericFocusLines: (context) => [
    `${context.currentTarget} saubere pro Übung sind heute die eigentliche Schlagzeile.`,
    "Heute gewinnt die kleine, saubere Version von Konsequenz.",
    "Die Matte braucht heute weniger Pathos und mehr Ausführung.",
    "Ein dokumentierter Tag sieht am Ende besser aus als jede Ansage.",
    "Heute reicht genau die Sorte Arbeit, die später fast zu schlicht wirkt.",
  ],
  buildPersonalLines: buildDePersonalLines,
  buildBirthdayMessage: (context, helpers) => {
    const name = context.name?.trim() || "Du";
    const latestWaist = helpers.formatNumber(context.latestWaistCm);
    const latestWeight = helpers.formatNumber(context.latestWeightKg);
    const metricTail = latestWaist
      ? ` Der letzte Bauchumfang liegt bei ${latestWaist} cm, also bekommt das neue Lebensjahr direkt einen kleinen Core-Auftrag statt nur Kuchenbegleitung.`
      : latestWeight
        ? ` Das letzte Gewicht steht bei ${latestWeight} kg, und heute trägt es sich bitte mit Haltung durch beide Sets.`
        : ` Heute zählen ${context.currentTarget} pro Übung, Geschenkpapier gibt es keins, aber immerhin Muskelkaterpotenzial.`;

    return `${name}, heute ist Geburtstag. Neues Lebensjahr, gleiche Matte, hoffentlich etwas mehr Stil im zweiten Satz.${metricTail}`;
  },
};
