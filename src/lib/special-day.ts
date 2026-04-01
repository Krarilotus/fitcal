import { formatCurrencyFromCents } from "@/lib/challenge";
import { DAILY_FACTS } from "@/lib/special-day-facts";

type DailyMessageContext = {
  currentDate: string;
  currentTarget: number;
  name: string | null;
  birthDate: Date | null;
  latestWeightKg: number | null;
  latestWaistCm: number | null;
  outstandingDebtCents: number;
  documentedDays: number;
  motivation: string | null;
};

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value == null) {
    return null;
  }

  return value.toFixed(digits).replace(".", ",");
}

function getMonthDayFromDate(date: Date) {
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function getDayNumber(dateKey: string) {
  return Number(dateKey.slice(8));
}

function getWeekdayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function stripDateLead(fact: string) {
  return fact
    .replace(/^Am \d{1,2}\.\s+[A-Za-zÄÖÜäöüß]+(?:\s+\d{4})?\s+/u, "")
    .replace(/^Der \d{1,2}\.\s+[A-Za-zÄÖÜäöüß]+(?:\s+\d{4})?\s+/u, "")
    .replace(/^Letzter [A-Za-zÄÖÜäöüß-]+:\s*/u, "")
    .replace(/^Frühlingsanfang:\s*/u, "")
    .replace(/^Schalttag:\s*/u, "")
    .replace(/^Valentinstag:\s*/u, "")
    .replace(/^Die Iden des März\s+/u, "");
}

function lowercaseFirst(text: string) {
  if (!text) {
    return text;
  }

  return text.charAt(0).toLowerCase() + text.slice(1);
}

function uppercaseFirst(text: string) {
  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function beginsWithVerb(text: string) {
  return /^(ist|sind|war|wurde|wurden|bleibt|bleiben|gilt|gilt heute|fühlt|fühlen|passt|passen|zeigt|zeigen|startete|starten|begann|begannen|endet|endete|enden|markiert|erinnert|wirkt|wirken|hängt|hängen|liegt|liegen|trat|traf|macht|machen|erklärte|erklärt|traf|trifft|kündigt|klingen|klingt)\b/i.test(
    text,
  );
}

function isSeriousFact(fact: string) {
  return [
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
  ].some((keyword) => fact.includes(keyword));
}

function isSportFact(fact: string) {
  return /Sport|Olymp|Dance|Yoga|Skateboarding|Tour de France|Tennis|Bicycle|Cricket|Fußball|WM|Wimbledon/i.test(
    fact,
  );
}

function getFactLead(context: DailyMessageContext, fact: string) {
  const dayNumber = getDayNumber(context.currentDate);
  const weekday = uppercaseFirst(getWeekdayLabel(context.currentDate));
  const strippedFact = stripDateLead(fact).trim();

  if (!strippedFact || strippedFact === fact) {
    return fact;
  }

  const lower = lowercaseFirst(strippedFact);
  const direct = beginsWithVerb(strippedFact)
    ? strippedFact
    : `steht ${lower}`;

  const variants = [
    `Heute ${lower}`,
    `${weekday} heißt hier: ${lower}`,
    `Im Kalender steht heute, dass ${lower}`,
    `Für heute taugt vor allem dieser Gedanke: ${lower}`,
    `${weekday} bringt eine hübsche Nebeninfo mit: ${lower}`,
    `Die Datumsnotiz für heute lautet: ${strippedFact}`,
    `Was heute hängen bleibt: ${strippedFact}`,
    `${weekday} ${direct}`,
  ];

  return variants[dayNumber % variants.length];
}

function getFocusLine(context: DailyMessageContext, fact: string) {
  const dayNumber = getDayNumber(context.currentDate);

  if (isSeriousFact(fact)) {
    const lines = [
      "Heute reicht ein ruhiger, sauberer Tag als Antwort völlig aus.",
      "Mehr musst du daraus nicht machen: ordentlich liefern genügt.",
      "Konzentriert bleiben ist heute schon genug Haltung.",
      "Ein nüchterner, sauberer Tag passt dazu am besten.",
    ];

    return lines[dayNumber % lines.length];
  }

  if (isSportFact(fact)) {
    const lines = [
      `${context.currentTarget} saubere pro Übung wären dazu ein sehr ordentliches Echo.`,
      "Der Kalender ist heute sportlich drauf. Du musst nur nachziehen.",
      "Heute darf die Geschichte gern ein kleines Echo auf der Matte bekommen.",
      "Das passt hervorragend zu zwei ordentlichen Sätzen ohne Theater.",
    ];

    return lines[dayNumber % lines.length];
  }

  const lines = [
    `${context.currentTarget} saubere pro Übung sind heute die eigentliche Schlagzeile.`,
    "Heute gewinnt die kleine, saubere Version von Konsequenz.",
    "Die Matte braucht heute weniger Pathos und mehr Ausführung.",
    "Ein dokumentierter Tag sieht am Ende besser aus als jede Ansage.",
    "Heute reicht genau die Sorte Arbeit, die später fast zu schlicht wirkt.",
  ];

  return lines[dayNumber % lines.length];
}

function getPersonalLine(context: DailyMessageContext) {
  const dayNumber = getDayNumber(context.currentDate);
  const candidates: string[] = [];

  if (context.latestWaistCm != null) {
    candidates.push(
      `Bauchumfang zuletzt: ${formatNumber(context.latestWaistCm)} cm. Der Core hat den Wink verstanden.`,
      `${formatNumber(context.latestWaistCm)} cm stehen für die Mitte im System. Die Sit-ups dürfen antworten.`,
      `Mit ${formatNumber(context.latestWaistCm)} cm um die Mitte herum sollte heute der Bauch nicht die Regie übernehmen.`,
    );
  }

  if (context.latestWeightKg != null) {
    candidates.push(
      `${formatNumber(context.latestWeightKg)} kg sind notiert. Die Matte hat dazu nur Erwartungen.`,
      `${formatNumber(context.latestWeightKg)} kg stehen im Profil, aber Liegestütze behandeln jedes Kilo gleich.`,
      `Mit zuletzt ${formatNumber(context.latestWeightKg)} kg wird heute nicht gejammert, höchstens sauber gedrückt.`,
    );
  }

  if (context.documentedDays > 0) {
    candidates.push(
      `${context.documentedDays} dokumentierte Tage später ist das hier ohnehin keine Laune mehr.`,
      `${context.documentedDays} Tage sind schon dokumentiert. Selbst die Matte weiß, dass du es ernst meinst.`,
      `${context.documentedDays} dokumentierte Tage sprechen dafür, dass dein innerer Schweinehund nur noch Sachbearbeiter ist.`,
    );
  }

  if (context.outstandingDebtCents > 0) {
    candidates.push(
      `Offen sind ${formatCurrencyFromCents(context.outstandingDebtCents)}. Schulden reagieren erstaunlich gut auf Wiederholungen.`,
      `${formatCurrencyFromCents(context.outstandingDebtCents)} stehen offen. Der angenehmste Weg nach unten heißt Wiederholung.`,
      `Aktuell warten ${formatCurrencyFromCents(context.outstandingDebtCents)} darauf, kleiner gemacht zu werden.`,
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

  return candidates[dayNumber % candidates.length];
}

function hasPersonalContext(context: DailyMessageContext) {
  return (
    context.latestWaistCm != null ||
    context.latestWeightKg != null ||
    context.documentedDays > 0 ||
    context.outstandingDebtCents > 0 ||
    Boolean(context.motivation)
  );
}

export function getDailyMessage(context: DailyMessageContext) {
  if (context.birthDate) {
    const birthdayKey = getMonthDayFromDate(context.birthDate);

    if (birthdayKey === context.currentDate.slice(5)) {
      const name = context.name?.trim() || "Du";
      const metricTail =
        context.latestWaistCm != null
          ? ` Der letzte Bauchumfang liegt bei ${formatNumber(context.latestWaistCm)} cm, also bekommt das neue Lebensjahr direkt einen kleinen Core-Auftrag statt nur Kuchenbegleitung.`
          : context.latestWeightKg != null
            ? ` Das letzte Gewicht steht bei ${formatNumber(context.latestWeightKg)} kg, und heute trägt es sich bitte mit Haltung durch beide Sets.`
            : ` Heute zählen ${context.currentTarget} pro Übung, Geschenkpapier gibt es keins, aber immerhin Muskelkaterpotenzial.`;

      return `${name}, heute ist Geburtstag. Neues Lebensjahr, gleiche Matte, hoffentlich etwas mehr Stil im zweiten Satz.${metricTail}`;
    }
  }

  const fact =
    DAILY_FACTS[context.currentDate.slice(5)] ||
    "Heute zählt vor allem, den Tag sauber abzuschließen.";
  const lead = getFactLead(context, fact);
  const dayNumber = getDayNumber(context.currentDate);
  const secondLine =
    hasPersonalContext(context) && dayNumber % 3 !== 1
      ? getPersonalLine(context)
      : getFocusLine(context, fact);

  return `${lead} ${secondLine}`.trim();
}
