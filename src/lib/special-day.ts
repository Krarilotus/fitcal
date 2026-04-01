import { formatCurrencyFromCents } from "@/lib/challenge";

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

const DAILY_FACTS: Record<string, string> = {
  "04-01":
    "Am 1. April 2001 wurde Slobodan Milošević in Belgrad verhaftet, ein Wendepunkt in der juristischen Aufarbeitung der Jugoslawienkriege.",
  "04-02": "Am 2. April 1946 erschien die erste Ausgabe der Zeitung Die Welt in Hamburg.",
  "04-03":
    "Am 3. April 2016 wurden die Panama Papers veröffentlicht und machten Steuertricks und Briefkastenfirmen weltweit sichtbar.",
  "04-04":
    "Am 4. April erinnert vieles an Hansa Mehta, die an der indischen Verfassung und an der Allgemeinen Erklärung der Menschenrechte mitwirkte.",
  "04-05":
    "Am 5. April denkt man gut an Margaret Burbidge, deren Arbeit zur Nukleosynthese erklärt, wo viele schwere Elemente überhaupt herkommen.",
  "04-06":
    "Am 6. April startet oft der Blick auf internationale Sportgeschichte; passend dazu ist der Tag auch mit Entwicklung, Frieden und Bewegung verknüpft.",
  "04-07":
    "Am 7. April ist Weltgesundheitstag, und die Kombination aus Routine und Dokumentation wirkt plötzlich sehr vernünftig.",
  "04-08":
    "Am 8. April ist Internationaler Tag der Roma, ein guter Hinweis darauf, dass Sichtbarkeit und Anerkennung selten von allein entstehen.",
  "04-09":
    "Am 9. April hängen viele Rückblicke an Widerstandsgeschichten aus der NS-Zeit, also an Menschen, die unter Druck Haltung gezeigt haben.",
  "04-10":
    "Am 10. April ist Geschwistertag, also ein Datum für kleine Rivalitäten, große Loyalität und überraschend viele Familienwitze.",
  "04-11":
    "Am 11. April 1970 startete Apollo 13, jene Mission, die eher wegen Improvisation als wegen einer Mondlandung berühmt wurde.",
  "04-12":
    "Am 12. April ist Tag des bemannten Raumflugs, seit Juri Gagarin klar machte, dass Menschen wirklich ins All passen.",
  "04-13":
    "Am 13. April fällt in mehreren Kalendern das Songkran-Fest in Südostasien, also Wasser, Neuanfang und viel mehr Spritzer als Grip.",
  "04-14":
    "Am 14. April ist World Quantum Day, was zeigt, dass sogar Unschärfe einen eigenen Gedenktag bekommen kann.",
  "04-15":
    "Am 15. April ist World Art Day, also ein guter Tag für die These, dass saubere Wiederholungen auch eine Form von Linienführung sind.",
  "04-16":
    "Am 16. April ist World Voice Day, und plötzlich wirkt jede sauber ausgesprochene Ausrede noch etwas schwächer.",
  "04-17":
    "Am 17. April ist World Hemophilia Day, ein Datum, das zeigt, wie wichtig Sichtbarkeit und Aufklärung für seltenere Themen sein können.",
  "04-18":
    "Am 18. April ist International Day for Monuments and Sites, also Denkmalpflege für Steine und heute bitte auch etwas für die eigene Statik.",
  "04-19":
    "Am 19. April ist Bicycle Day, ein Datum mit erstaunlich schräger Popkulturgeschichte und genug Anlass für einen trockenen Kalenderscherz.",
  "04-20":
    "Am 20. April ist UN Chinese Language Day, und selbst ein Weltkalender schafft es manchmal, Bildung und Bürokratie elegant zusammenzudenken.",
  "04-21":
    "Am 21. April ist Welttag der Kreativität, wobei die kreativste Lösung heute wahrscheinlich trotzdem einfach Erledigen heißt.",
  "04-22": "Am 22. April ist Earth Day, also ein guter Tag für etwas weniger Müll und etwas mehr Körperspannung.",
  "04-23":
    "Am 23. April ist Welttag des Buches; gute Geschichten haben Spannungsbögen, gute Routinen eher Wiederholungen.",
  "04-24":
    "Am 24. April ist Internationaler Tag des Multilateralismus, ein sperriges Wort für die überraschend vernünftige Idee, Dinge gemeinsam zu regeln.",
  "04-25":
    "Am 25. April prägt in vielen Rückblicken das schwere Nepal-Erdbeben von 2015 den Tag, ein Datum mit großem Gewicht.",
  "04-26":
    "Am 26. April denkt man schnell an Tschernobyl, also an einen Tag, an dem Technik, Risiko und Verantwortung untrennbar zusammenfielen.",
  "04-27":
    "Am 27. April 2005 hob der Airbus A380 zum Erstflug ab und machte Luftfahrtgeschichte im XXL-Format.",
  "04-28":
    "Am 28. April ist Welttag für Sicherheit und Gesundheit bei der Arbeit, also erstaunlich nah an jeder ordentlichen Trainingsroutine.",
  "04-29":
    "Am 29. April ist International Dance Day, und Koordination wirkt plötzlich wie eine globale Kernkompetenz.",
  "04-30":
    "Am 30. April ist International Jazz Day; Improvisation ist dort großartig, bei der Tagesdoku eher weniger.",
  "05-01": "Am 1. Mai ist Tag der Arbeit, ein seltenes Datum, an dem die Moral der Geschichte schon im Namen steht.",
  "05-02":
    "Am 2. Mai erinnert der Kalender gern an Ruth Rendell, also daran, dass gute Spannung auch ohne hektische Bewegungen funktioniert.",
  "05-03":
    "Am 3. Mai ist Pressefreiheitstag, und gute Dokumentation wirkt plötzlich fast journalistisch.",
  "05-04":
    "Am 4. Mai hängt überall Star-Wars-Kultur in der Luft, obwohl ein sauberer Satz ganz ohne Machttrick auskommen muss.",
  "05-05":
    "Am 5. Mai markiert Europatag und Aktionstag zur Gleichstellung ein erstaunlich dichtes Kalenderbündel aus Politik und Teilhabe.",
  "05-06":
    "Am 6. Mai wurde 2010 die Topographie des Terrors in Berlin offiziell eröffnet, ein Ort, der Erinnerung bewusst unbequem hält.",
  "05-07":
    "Am 7. Mai eröffneten 1925 die Neubauten des Deutschen Museums, also ein starkes Datum für Menschen mit Technikneugier.",
  "05-08":
    "Am 8. Mai erklärte die WHO die Pocken für ausgerottet, ein historischer Triumph von Medizin, Ausdauer und Organisation.",
  "05-09":
    "Am 9. Mai ist Europatag, also ein guter Anlass, wenigstens die eigene Tagesordnung grenzüberschreitend ernst zu nehmen.",
  "05-10":
    "Am 10. Mai wurde das Holocaust-Mahnmal in Berlin eröffnet, ein Datum mit klarer Erinnerungsschärfe.",
  "05-11":
    "Am 11. Mai wurde Ionescos Die kahle Sängerin uraufgeführt, also absurder Stoff für einen Tag, der trotzdem klare Zahlen mag.",
  "05-12":
    "Am 12. Mai ist International Nurses Day, ein Datum, das Pflegearbeit und Nervenstärke sichtbar macht.",
  "05-13":
    "Am 13. Mai schärft der Kalender mit Enschede und anderen Ereignissen den Blick für die Wucht technischer Katastrophen.",
  "05-14":
    "Am 14. Mai begann Ungarns legendäre Serie von 32 ungeschlagenen Spielen, eine Erinnerung daran, wie lange gute Läufe dauern können.",
  "05-15":
    "Am 15. Mai ist Internationaler Tag der Familie; Systeme halten oft besser, wenn ringsum Menschen mittragen.",
  "05-16":
    "Am 16. Mai 1975 stand Junko Tabei als erste Frau auf dem Mount Everest und verschob ganz nebenbei einen Maßstab.",
  "05-17":
    "Am 17. Mai ist IDAHOBIT, der internationale Tag gegen Homo-, Bi-, Inter- und Transfeindlichkeit.",
  "05-18":
    "Am 18. Mai ist International Museum Day; manches lässt sich eben besser mit Sammlung, Kontext und Beschriftung würdigen.",
  "05-19":
    "Am 19. Mai wurde das Midrex-Verfahren patentiert, was ungefähr so industriell klingt, wie es tatsächlich ist.",
  "05-20":
    "Am 20. Mai ist Weltmetrologietag, also ein Fest für Menschen, die Messen nicht für eine Charakterfrage halten.",
  "05-21":
    "Am 21. Mai ist UNESCO-Welttag der kulturellen Vielfalt, ein Datum mit angenehmer inhaltlicher Reichweite.",
  "05-22":
    "Am 22. Mai 1960 bebte Valdivia in Chile mit der stärksten je gemessenen Magnitude – selbst Seismologen reden da nicht mehr klein.",
  "05-23":
    "Am 23. Mai erinnert der Tag auch an John Nash, dessen Mathematik und Lebensgeschichte weit über Hörsäle hinausreichen.",
  "05-24":
    "Am 24. Mai gilt in Europa oft als Tag der Nationalparks; Schutz funktioniert dort wie gute Routine: konsequent oder gar nicht.",
  "05-25":
    "Am 25. Mai erinnert vieles an den Tod von George Floyd und an die weltweiten Proteste, die folgten.",
  "05-26":
    "Am 26. Mai gründete George Lucas Industrial Light & Magic und gab Spezialeffekten einen festen Platz in der Filmgeschichte.",
  "05-27":
    "Am 27. Mai nahm die S-Bahn Zürich ihren Betrieb auf und wurde später zum größten S-Bahn-System der Schweiz.",
  "05-28":
    "Am 28. Mai ist Menstrual Hygiene Day, ein gutes Beispiel dafür, wie aus einem lange verdrängten Thema öffentliche Aufklärung wird.",
  "05-29":
    "Am 29. Mai erinnert das Heysel-Stadion daran, wie schnell Menschenmengen kippen können, wenn Sicherheit versagt.",
  "05-30":
    "Am 30. Mai begannen in Zürich die Opernhauskrawalle, also Kulturpolitik mit deutlich mehr Straßenlärm als üblich.",
  "05-31":
    "Am 31. Mai wurde das Modul Kristall zur Raumstation Mir gestartet – ziemlich viel Hightech für einen Monatsabschluss.",
  "06-01":
    "Am 1. Juni 2000 wurde die Expo 2000 in Hannover eröffnet, also Zukunftsoptimismus in sehr großer Hallendichte.",
  "06-02":
    "Am 2. Juni liegt der Kalender zwischen Reemtsma, Protestgeschichte und mehreren deutschen Erinnerungsschichten.",
  "06-03":
    "Am 3. Juni kam Chicago an den Broadway – Jazz, Zynismus und ziemlich präzises Timing.",
  "06-04":
    "Am 4. Juni ist International Day of Innocent Children Victims of Aggression, ein sperriger Titel für ein sehr ernstes Thema.",
  "06-05":
    "Am 5. Juni ist Weltumwelttag; guter Kontext für alles, was nicht nach Wegwerflogik aussehen soll.",
  "06-06":
    "Am 6. Juni überlagern sich D-Day-Erinnerung und Filmgeschichte, also Landung, Wendepunkt und große Bilder.",
  "06-07":
    "Am 7. Juni begann der erste Cricket World Cup, ein Datum mit sehr britischem Langspielformat.",
  "06-08":
    "Am 8. Juni ist World Oceans Day; große Systeme wirken oft still, bis man genauer hinschaut.",
  "06-09":
    "Am 9. Juni erinnert der Tag auch an İsmail Yaşar und damit an den NSU-Komplex, ein schmerzhafter Teil jüngerer deutscher Geschichte.",
  "06-10":
    "Am 10. Juni war mit Vega 1 sogar Raumfahrt bei der Venus zu Gast, inklusive Sonde und Forschungsballon.",
  "06-11":
    "Am 11. Juni 1985 passierte Vega 1 die Venus – selbst der Name klingt schon nach kaltem Metall und sehr genauen Berechnungen.",
  "06-12":
    "Am 12. Juni ist Welttag gegen Kinderarbeit; ein Datum, das Prioritäten ziemlich klar sortiert.",
  "06-13":
    "Am 13. Juni begann an der Bernauer Straße der Abriss der Berliner Mauer, also sichtbare Veränderung in Betonform.",
  "06-14":
    "Am 14. Juni ist Weltblutspendetag, ein guter Tag für den nüchternen Respekt vor still hilfreichen Dingen.",
  "06-15":
    "Am 15. Juni liegt geschichtlich vieles zwischen Literatur, Erinnerung und jener Art Biografien, die erst rückblickend groß wirken.",
  "06-16":
    "Am 16. Juni wurde Andrea Ghez geboren, später Nobelpreisträgerin für ihre Arbeit am supermassereichen Schwarzen Loch im Zentrum unserer Galaxie.",
  "06-17":
    "Am 17. Juni erinnert der Kalender in Deutschland an Aufstand, Freiheitssehnsucht und sehr konkrete politische Reibung.",
  "06-18":
    "Am 18. Juni wurde in Algier ein Waffenstillstand zwischen Äthiopien und Eritrea unterzeichnet, ein nüchterner Text mit großer Wirkung.",
  "06-19":
    "Am 19. Juni ist Juneteenth, seit den USA deutlich sichtbarer auf dem Kalender als noch vor wenigen Jahren.",
  "06-20":
    "Am 20. Juni startete Der weiße Hai in den USA und machte den Sommer-Blockbuster praktisch salonfähig.",
  "06-21":
    "Am 21. Juni treffen Sonnenwende, International Yoga Day und Go Skateboarding Day auf erstaunlich engem Raum zusammen.",
  "06-22":
    "Am 22. Juni fällt der Blick schnell auf James Horner und andere große Namen, die Musik und Erzählung eng zusammenführten.",
  "06-23":
    "Am 23. Juni stiftete Theodor Heuss das Silberne Lorbeerblatt – Sportgeschichte in sehr offizieller Form.",
  "06-24":
    "Am 24. Juni endete das längste Tennismatch der Geschichte, nachdem Isner und Mahut Wimbledon praktisch in eine Zeitschleife verwandelt hatten.",
  "06-25":
    "Am 25. Juni erklärte Mosambik seine Unabhängigkeit von Portugal und schlug ein neues Kapitel auf.",
  "06-26":
    "Am 26. Juni ist Internationaler Tag gegen Drogenmissbrauch und unerlaubten Handel – ziemlich viel UNO in einer einzigen Zeile.",
  "06-27":
    "Am 27. Juni übernahm Hamad bin Chalifa Al Thani in Katar durch einen unblutigen Putsch die Macht, ein stiller Wechsel mit großer Reichweite.",
  "06-28":
    "Am 28. Juni einigten sich die ITER-Staaten auf Cadarache – Kernfusion klingt auch im Kalender noch nach Zukunftslabor.",
  "06-29":
    "Am 29. Juni starb Melitta Bentz, die Erfinderin des Kaffeefilters, also ein Mensch mit überraschend großem Alltagshebel.",
  "06-30":
    "Am 30. Juni erinnert der Blick aufs Roskilde-Festival 2000 daran, wie abrupt kollektive Euphorie in Tragik umschlagen kann.",
  "07-01":
    "Am 1. Juli 2002 nahm der Internationale Strafgerichtshof seine Arbeit auf und gab dem Völkerstrafrecht ein festes Gericht.",
  "07-02":
    "Am 2. Juli 2002 vollendete Steve Fossett die erste Solo-Weltumrundung im Ballon ganz ohne Copilot und Zwischenlandung.",
  "07-03":
    "Am 3. Juli 2013 putschte in Ägypten das Militär gegen Präsident Mursi und veränderte den politischen Kurs des Landes abrupt.",
  "07-04":
    "Am 4. Juli 2012 verkündete CERN den Nachweis des Higgs-Bosons, also jenes Teilchens, das lange nur Theorie war.",
  "07-05":
    "Am 5. Juli 1996 wurde mit Dolly das erste geklonte Säugetier geboren und machte Schafzucht zu Weltgeschichte.",
  "07-06":
    "Am 6. Juli 2013 verunglückte Asiana-Flug 214 in San Francisco, der erste tödliche Boeing-777-Unfall überhaupt.",
  "07-07":
    "Am 7. Juli 1991 endete mit der Brioni-Erklärung der kurze Slowenienkrieg, auch bekannt als Zehn-Tage-Krieg.",
  "07-08":
    "Am 8. Juli 2011 startete Atlantis zum letzten Mal und läutete damit das Ende des Space-Shuttle-Zeitalters ein.",
  "07-09":
    "Am 9. Juli 2011 wurde Südsudan unabhängig und war damit auf einen Schlag der jüngste Staat der Welt.",
  "07-10":
    "Am 10. Juli 1985 sank die Rainbow Warrior nach einem Anschlag in Neuseeland; später führte die Spur bis zu französischen Agenten.",
  "07-11":
    "Am 11. Juli 2010 gewann Spanien in Johannesburg seinen ersten Fußball-WM-Titel und schrieb damit Sportgeschichte.",
  "07-12":
    "Am 12. Juli 1984 wurde Geraldine Ferraro als erste Frau für ein großes US-Präsidentschaftsticket nominiert.",
  "07-13":
    "Am 13. Juli 1985 brachte Live Aid London und Philadelphia gleichzeitig auf Sendung und machte Benefiz-TV global.",
  "07-14":
    "Am 14. Juli 2016 erschütterte der Anschlag von Nizza den französischen Nationalfeiertag mit grausamer Wucht.",
  "07-15":
    "Am 15. Juli 1997 wurde Modeikone Gianni Versace in Miami ermordet und hinterließ weit mehr als nur ein Label.",
  "07-16":
    "Am 16. Juli 2003 versuchte auf São Tomé und Príncipe ein Militärputsch die Regierung zu stürzen.",
  "07-17":
    "Am 17. Juli 1998 wurde das Römische Statut beschlossen, die juristische Geburtsurkunde des Internationalen Strafgerichtshofs.",
  "07-18":
    "Am 18. Juli 2013 meldete Detroit Insolvenz an und wurde damit zum größten kommunalen Pleitefall der US-Geschichte.",
  "07-19":
    "Am 19. Juli 1903 endete die erste Tour de France und machte Maurice Garin zum ersten Sieger des später legendären Rennens.",
  "07-20":
    "Am 20. Juli 2012 eröffnete ein Attentäter in Aurora während einer Kinopremiere das Feuer und machte den Ort schlagartig weltweit bekannt.",
  "07-21":
    "Am 21. Juli 2011 endete mit der Landung von STS-135 das amerikanische Space-Shuttle-Programm endgültig.",
  "07-22":
    "Am 22. Juli 2011 erlebte Norwegen mit Oslo und Utøya den schwersten Gewalttag seit dem Zweiten Weltkrieg.",
  "07-23":
    "Am 23. Juli 1995 wurde der Komet Hale-Bopp entdeckt und später zu einem der bekanntesten Schweifsterne der Neuzeit.",
  "07-24":
    "Am 24. Juli 2013 entgleiste bei Santiago de Compostela ein Hochgeschwindigkeitszug, eine der schwersten Bahnkatastrophen Spaniens.",
  "07-25": "Am 25. Juli 2007 bekam Indien mit Pratibha Patil erstmals eine Präsidentin.",
  "07-26":
    "Am 26. Juli 1990 wurde mit dem Americans with Disabilities Act Diskriminierung wegen Behinderung in den USA gesetzlich verboten.",
  "07-27":
    "Am 27. Juli 2012 eröffnete Queen Elizabeth II die Londoner Olympischen Spiele inklusive einer Show, die fast selbst Gold verdient hätte.",
  "07-28":
    "Am 28. Juli 2005 erklärte die IRA das Ende ihres bewaffneten Kampfs und markierte damit einen Wendepunkt im Nordirlandkonflikt.",
  "07-29":
    "Am 29. Juli 2008 entschuldigte sich das US-Repräsentantenhaus offiziell für Sklaverei und Jim-Crow-Gesetze.",
  "07-30":
    "Am 30. Juli 2002 suchten Kongo und Ruanda mit dem Pretoria-Abkommen einen Weg aus dem Zweiten Kongokrieg.",
  "07-31":
    "Am 31. Juli 1998 verbot Großbritannien Landminen und reagierte damit auch auf massiven öffentlichen Druck.",
  "08-01": "Am 1. August 1981 startete MTV und machte Musikvideos zu einem eigenen Popkosmos.",
  "08-02":
    "Am 2. August 1998 begann der Zweite Kongokrieg, einer der tödlichsten Konflikte des modernen Afrika.",
  "08-03": "Am 3. August 2005 trat Mahmud Ahmadinedschad sein Amt als Präsident Irans an.",
  "08-04":
    "Am 4. August 1984 wurde aus Obervolta Burkina Faso, ein Namenswechsel mit politischer Symbolkraft.",
  "08-05":
    "Am 5. August 2009 wurde Mohamed Ould Abdel Aziz Präsident Mauretaniens, nachdem er zuvor durch einen Putsch an Einfluss gewonnen hatte.",
  "08-06":
    "Am 6. August 2008 putschte in Mauretanien erneut das Militär, leider fast schon ein wiederkehrendes Kapitel der Landesgeschichte.",
  "08-07":
    "Am 7. August 2008 begann der Krieg zwischen Russland und Georgien um Südossetien und Abchasien.",
  "08-08":
    "Am 8. August 1988 startete in Myanmar der 8888-Aufstand, benannt schlicht nach dem auffälligen Datum.",
  "08-09":
    "Am 9. August 1965 schied Singapur aus Malaysia aus und wurde wider Willen eigenständig.",
  "08-10":
    "Am 10. August 2003 fand die erste Hochzeit im All statt, per Satellitenschalte zwischen Raumstation und Texas.",
  "08-11":
    "Am 11. August 1999 war die letzte totale Sonnenfinsternis des Jahrtausends zu sehen, ein Himmelsspektakel für Millionen.",
  "08-12":
    "Am 12. August 1990 wurde mit Sue das berühmteste T-Rex-Fossil entdeckt, benannt nach seiner Finderin Sue Hendrickson.",
  "08-13":
    "Am 13. August 1997 startete South Park und bewies schnell, dass Zeichentrick sehr wohl Ärger machen kann.",
  "08-14": "Am 14. August 2010 begannen in Singapur die ersten Olympischen Jugendspiele.",
  "08-15":
    "Am 15. August 2015 führte Nordkorea die Pjöngjang-Zeit ein und drehte damit sogar politisch an der Uhr.",
  "08-16":
    "Am 16. August 1987 begann die Harmonic Convergence, ein globales New-Age-Meditationsevent mit kosmischem Anspruch.",
  "08-17":
    "Am 17. August 2008 holte Michael Phelps in Peking sein achtes Gold und setzte eine olympische Marke für die Ewigkeit.",
  "08-18":
    "Am 18. August 2005 legte ein riesiger Stromausfall Teile Indonesiens lahm und traf rund 100 Millionen Menschen.",
  "08-19":
    "Am 19. August 1991 eskalierten in Crown Heights Spannungen zu schweren Unruhen zwischen Nachbarschaften in New York.",
  "08-20":
    "Am 20. August 1993 endeten in Oslo die Verhandlungen, aus denen später die Oslo-Abkommen hervorgingen.",
  "08-21":
    "Am 21. August 1993 verlor die NASA den Kontakt zum Mars Observer, kurz bevor die Sonde den roten Planeten erreichen sollte.",
  "08-22":
    "Am 22. August 1963 flog Joseph A. Walker zum zweiten Mal ins All und schrieb damit still Raumfahrtgeschichte.",
  "08-23":
    "Am 23. August 1990 erklärte Armenien seine Unabhängigkeit von der Sowjetunion und leitete seinen eigenen Staatsweg ein.",
  "08-24":
    "Am 24. August 2006 verlor Pluto den Planetenstatus und wurde zum wohl berühmtesten Zwergplaneten überhaupt.",
  "08-25":
    "Am 25. August 2012 erreichte Voyager 1 den interstellaren Raum und wurde damit zum fernsten menschengemachten Objekt.",
  "08-26":
    "Am 26. August 1978 flog Sigmund Jähn als erster Deutscher ins All, damals noch für die DDR.",
  "08-27":
    "Am 27. August 2003 ging in Alaska eine riesige Batterie ans Netz, groß genug für Strom und Gesprächsstoff zugleich.",
  "08-28":
    "Am 28. August 1963 hielt Martin Luther King seine Rede I Have a Dream und gab der Bürgerrechtsbewegung ihre ikonischsten Worte.",
  "08-29": "Am 29. August 1988 wurde Abdul Ahad Mohmand der erste Afghane im All.",
  "08-30":
    "Am 30. August 1999 stimmte Osttimor über seine Zukunft ab und öffnete damit den Weg zur späteren Unabhängigkeit.",
  "08-31":
    "Am 31. August 1998 verkündete Nordkorea den Start seines ersten Satelliten, auch wenn der Erfolg international umstritten blieb.",
  "09-01":
    "Am 1. September 2004 begann in Beslan die Geiselnahme an einer Schule, eine der erschütterndsten Terrorlagen der 2000er.",
  "09-02":
    "Am 2. September 1960 wurde das erste tibetische Exilparlament gewählt; deshalb gilt der Tag vielen Exiltibetern als Demokratietag.",
  "09-03":
    "Am 3. September 1995 gründete Pierre Omidyar eBay und machte Online-Auktionen massentauglich.",
  "09-04":
    "Am 4. September 2002 wurde Kelly Clarkson zur ersten American-Idol-Gewinnerin und startete damit ihre Popkarriere im Reality-TV.",
  "09-05":
    "Am 5. September 1977 startete Voyager 1 und ist heute weiter draußen als alles andere, was Menschen gebaut haben.",
  "09-06":
    "Am 6. September 2007 zerstörte Israel bei Operation Orchard mutmaßlich einen syrischen Reaktor.",
  "09-07":
    "Am 7. September 1978 wurde der bulgarische Dissident Georgi Markow mit dem berüchtigten Regenschirm-Mord tödlich verletzt.",
  "09-08":
    "Am 8. September 2015 übernahm Stephen Colbert die Late Show und gab dem US-Abendfernsehen einen neuen Tonfall.",
  "09-09":
    "Am 9. September 2015 wurde Queen Elizabeth II zur am längsten regierenden britischen Monarchin.",
  "09-10":
    "Am 10. September 2014 begannen in London die ersten Invictus Games für verwundete Soldaten und Veteranen.",
  "09-11":
    "Am 11. September 2012 wurden US-Einrichtungen in Bengasi angegriffen, was in den USA schnell zum innenpolitischen Streitfall wurde.",
  "09-12":
    "Am 12. September 1992 flog Mae Jemison ins All und war damit die erste afroamerikanische Frau im Weltraum.",
  "09-13":
    "Am 13. September 1993 wurden die Oslo-Abkommen unterzeichnet und schufen die Grundlage für palästinensische Selbstverwaltung.",
  "09-14":
    "Am 14. September 2000 veröffentlichte Microsoft Windows ME, den letzten Vertreter der Windows-9x-Linie.",
  "09-15":
    "Am 15. September 2008 meldete Lehman Brothers Insolvenz an und wurde zum Symbol der Finanzkrise.",
  "09-16":
    "Am 16. September 1982 ereignete sich das Massaker von Sabra und Schatila, ein düsteres Kapitel des Libanonkriegs.",
  "09-17":
    "Am 17. September 1978 wurden die Camp-David-Abkommen unterzeichnet und bereiteten den Friedensvertrag zwischen Ägypten und Israel vor.",
  "09-18":
    "Am 18. September 1998 wurde ICANN gegründet und kümmert sich seitdem um zentrale Teile des Internets inklusive Domainnamen.",
  "09-19":
    "Am 19. September 2010 wurde das Leck der Deepwater Horizon endgültig versiegelt, fünf Monate nach Beginn der Ölkatastrophe.",
  "09-20":
    "Am 20. September 2011 endete in den USA die Militärregel Don't ask, don't tell, und offen homosexueller Dienst wurde möglich.",
  "09-21":
    "Am 21. September 2013 wurde das Westgate-Einkaufszentrum in Nairobi von al-Shabaab angegriffen.",
  "09-22":
    "Am 22. September 1980 begann mit dem Einmarsch des Irak in Iran ein Krieg, der beide Seiten jahrelang auszehrte.",
  "09-23":
    "Am 23. September 1965 endete der zweite Indisch-Pakistanische Krieg durch eine von den UN vermittelte Feuerpause.",
  "09-24": "Am 24. September 1973 erklärte Guinea-Bissau seine Unabhängigkeit von Portugal.",
  "09-25":
    "Am 25. September 2008 startete China Shenzhou 7 mit drei Astronauten und baute sein bemanntes Raumfahrtprogramm weiter aus.",
  "09-26":
    "Am 26. September 1959 traf Taifun Vera Japan mit voller Wucht und gilt dort bis heute als einer der verheerendsten Stürme.",
  "09-27":
    "Am 27. September 1996 nahmen die Taliban Kabul ein und riefen danach ihr Islamisches Emirat aus.",
  "09-28":
    "Am 28. September 2008 erreichte Falcon 1 den Orbit und machte SpaceX erstmals orbital erfolgreich.",
  "09-29":
    "Am 29. September 1994 sank die Estonia in der Ostsee und wurde zur schwersten zivilen Schiffskatastrophe Europas in Friedenszeiten.",
  "09-30":
    "Am 30. September 2005 veröffentlichte Jyllands-Posten die umstrittenen Mohammed-Karikaturen und löste weltweite Proteste aus.",
  "10-01":
    "Oktober startet ernsthaft: In Berlin denkt man heute schnell an die deutsche Einheit, die schon vor der Tür steht.",
  "10-02": "Am 2. Oktober passt Gandhi gut ins Bild: Disziplin wirkt meistens leiser als Ausreden.",
  "10-03":
    "Tag der Deutschen Einheit: Heute passt jede Wiederholung doppelt gut zum Gedanken von Zusammenhalt.",
  "10-04":
    "Am 4. Oktober ist Welttierschutztag; wenn sogar Pandas geschützt werden, kannst du auch deine Routine schützen.",
  "10-05":
    "Am 5. Oktober ist Welttag der Lehrkräfte, und dein Körper ist heute der strengste, aber fairste Lehrer.",
  "10-06":
    "Am 6. Oktober ist ein stiller Oktobertag perfekt für die unspektakuläre Art von Konsequenz, die später beeindruckt.",
  "10-07":
    "Am 7. Oktober erinnert viel an Raumfahrtgeschichte: Kleine Schritte wirken oft erst aus der Distanz groß.",
  "10-08":
    "Am 8. Oktober sind Herbstlicht und klare Luft genau die Sorte Tag, an der man später froh über erledigte Sätze ist.",
  "10-09":
    "Am 9. Oktober ist Weltposttag; eine erledigte Einheit ist im Grunde ein Brief an dein Zukunfts-Ich.",
  "10-10":
    "Am 10. Oktober ist Welttag der psychischen Gesundheit: Struktur ist manchmal die freundlichste Form von Selbstschutz.",
  "10-11":
    "Am 11. Oktober ist Internationaler Mädchentag, ein Datum, an dem gute Systeme damit anfangen, Menschen ernst zu nehmen.",
  "10-12":
    "Am 12. Oktober ist wenig Spektakel nötig: Gewohnheit gewinnt auch ohne Fanfare.",
  "10-13":
    "Am 13. Oktober ist Tag der Katastrophenvorsorge; die beste Vorsorge gegen späteren Frust ist frühes Erledigen.",
  "10-14":
    "Am 14. Oktober ist ein typischer Durchziehtag: nicht legendär, aber genau so entstehen lange Serien.",
  "10-15":
    "Am 15. Oktober ist Welthändewaschtag: Saubere Hände, klare Regeln, erledigte Sätze.",
  "10-16":
    "Am 16. Oktober ist Welternährungstag; Fortschritt kommt selten aus einem Trick, fast immer aus Wiederholung.",
  "10-17":
    "Am 17. Oktober ist Tag zur Bekämpfung von Armut: Konstanz spart später oft die teuersten Umwege.",
  "10-18":
    "Am 18. Oktober ist ein guter Sonntag für Ordnung im System; Zahlen sehen freundlicher aus, wenn man sie nicht aufschiebt.",
  "10-19":
    "Am 19. Oktober darf es ruhig unspektakulär sein; viele starke Serien sehen mitten drin ziemlich normal aus.",
  "10-20":
    "Am 20. Oktober wäre der Weltstatistiktag stolz: Was man misst, versteht man meistens besser.",
  "10-21":
    "Am 21. Oktober ist Zurückhaltung keine Schwäche: Solide Wiederholungen schlagen übermotivierte Ausrutscher.",
  "10-22":
    "Am 22. Oktober hat Herbst etwas Buchhalterisches: Alles wirkt ehrlicher, wenn man sauber protokolliert.",
  "10-23":
    "Am 23. Oktober ist in Nerdkreisen Mol-Tag; auch absurde Zahlen haben Charme, solange sie konsequent entstehen.",
  "10-24":
    "Am 24. Oktober ist Tag der Vereinten Nationen: Ein kleiner Friedensvertrag mit dir selbst reicht für heute völlig.",
  "10-25":
    "Am 25. Oktober kündigt sich die Zeitumstellung schon im Kopf an; gut, wenn dein Rhythmus nicht an der Uhr hängt.",
  "10-26":
    "Am 26. Oktober ist ein typischer Oktober-Montag, ideal für Fortschritt ohne großes Drama.",
  "10-27":
    "Am 27. Oktober ist Welttag des audiovisuellen Erbes; gut, dass Beweisvideos später nicht nur Schweiß, sondern auch Disziplin zeigen.",
  "10-28":
    "Am 28. Oktober fühlt sich vieles nach Zwischenstand an; genau dafür sind Routinen gebaut.",
  "10-29":
    "Am 29. Oktober ist ein stiller Statistiktag: Jeder Haken in der Liste macht künftige Entscheidungen leichter.",
  "10-30":
    "Am 30. Oktober gilt kurz vor Halloween: Am gruseligsten sind meist nur offene Aufgaben.",
  "10-31":
    "Halloween: Skelette sind ein starkes Argument dafür, die Mitte des Körpers ernst zu nehmen.",
  "11-01": "Allerheiligen: Ein ruhiger Tag, an dem Disziplin fast automatisch respektvoll wirkt.",
  "11-02":
    "Allerseelen im Kalenderraum: Gute Routinen erinnern daran, dass Wiederholung etwas Würdiges haben kann.",
  "11-03":
    "Am 3. November beginnt der Monat nüchtern: Perfekt für Fortschritt ohne große Kulisse.",
  "11-04": "Am 4. November passt ein sachlicher Stil gut; Zahlen mögen ohnehin keine Dramatik.",
  "11-05":
    "Am 5. November ist Welttag des Tsunami-Bewusstseins: Früh reagieren ist meistens klüger als spät kompensieren.",
  "11-06":
    "Am 6. November ist ein dunkler Herbsttag ideal für helle Entscheidungen: erst erledigen, dann diskutieren.",
  "11-07":
    "Am 7. November reicht solide Arbeit; nicht jeder gute Tag muss wie ein Filmfinale aussehen.",
  "11-08":
    "Am 8. November erinnern Röntgen und andere Novembergeschichten daran, dass sichtbar oft nur wird, was man wirklich dokumentiert.",
  "11-09":
    "Der 9. November ist ein schwerer deutscher Geschichtstag und erinnert daran, dass Daten Gewicht haben können.",
  "11-10":
    "Am 10. November ist Weltwissenschaftstag: Die Hypothese des Tages lautet, dass regelmäßige Wiederholung wirkt.",
  "11-11":
    "Am 11.11. beginnt für die einen Karneval, für die anderen einfach ein weiterer sauberer Datensatz.",
  "11-12":
    "Am 12. November darf Routine ruhig etwas trocken sein; trockene Arbeit ist oft erstaunlich wirksam.",
  "11-13":
    "Am 13. November ist Welttag der Freundlichkeit: streng mit dem Plan, freundlich mit dir selbst.",
  "11-14":
    "Am 14. November ist Weltdiabetestag; Körperdaten sind nicht zum Erschrecken da, sondern zum Verstehen.",
  "11-15":
    "Am 15. November testet die Jahreszeit Langstrecke; Glamour hilft wenig, Takt hilft viel.",
  "11-16":
    "Am 16. November ist Tag der Toleranz, perfekt für einen vernünftigen Umgang mit kleinen Tagesunterschieden.",
  "11-17":
    "Am 17. November gilt der alte Fristenwitz erneut: Wer früh anfängt, muss später weniger diskutieren.",
  "11-18": "Am 18. November belohnt der Monat Verlässlichkeit mehr als Pose.",
  "11-19":
    "Am 19. November erinnert ein ernster Aktionstag daran, Verantwortung nicht zu vertagen.",
  "11-20":
    "Am 20. November ist Tag der Kinderrechte: Gute Regeln sind nicht hart, sondern fair und nachvollziehbar.",
  "11-21":
    "Am 21. November ist Welttag des Fernsehens; heute besser selbst bewegen als nur Bewegung anschauen.",
  "11-22":
    "Am 22. November hätte C. S. Lewis vermutlich gefallen, dass Disziplin oft nur Mut in kleiner, täglicher Form ist.",
  "11-23": "Am 23. November zeigt ein typischer Spätherbsttag, wer es wirklich ernst meint.",
  "11-24":
    "Am 24. November ist Evolutionstag in manchen Kalendern: Anpassung ist gut, Ausredenmutation eher nicht.",
  "11-25":
    "Am 25. November steht ein wichtiger Aktionstag gegen Gewalt an Frauen im Kalender und schiebt Respekt klar in den Vordergrund.",
  "11-26":
    "Am 26. November wird der Monat eng, und genau dann zeigen Systeme, ob sie tragfähig sind.",
  "11-27": "Am 27. November ist wenig Romantik nötig; ein erledigter Eintrag reicht als Tagespoesie.",
  "11-28":
    "Am 28. November nähert sich der Adventsmodus: Lichter helfen, aber am Ende zählt weiter die Liste.",
  "11-29":
    "Am 29. November ist sauberes Nachtragen eine überraschend gute Idee für Kopf und Kurve.",
  "11-30": "Letzter Novembertag: Monatsenden sind die freundlichere Version von Wahrheit.",
  "12-01":
    "Am 1. Dezember ist Welt-AIDS-Tag, ein Datum, das zeigt, wie viel Aufklärung und Konsequenz wirklich bewirken können.",
  "12-02":
    "Am 2. Dezember beginnt der Dezember ernsthaft; jetzt trennt sich Stimmung von Struktur.",
  "12-03":
    "Am 3. Dezember ist Tag der Menschen mit Behinderungen: Gute Systeme denken Barrieren mit, nicht erst hinterher.",
  "12-04":
    "Am 4. Dezember ist Barbara-Tag in manchen Gegenden: Zweige im Glas sind nett, erledigte Sätze noch netter.",
  "12-05":
    "Am 5. Dezember ist Tag des Ehrenamts: Manche Dinge macht man nicht für Applaus, sondern weil sie richtig sind.",
  "12-06": "Nikolaus: Die beste Überraschung wäre heute eine bereits abgehakte Pflicht.",
  "12-07":
    "Am 7. Dezember bleibt Pearl Harbor ein Geschichtsmarker dafür, wie tief sich einzelne Tage einprägen können.",
  "12-08":
    "Am 8. Dezember passen kühle Luft und kühle Entscheidungen erstaunlich gut zusammen.",
  "12-09":
    "Am 9. Dezember ist Tag gegen Korruption: Ehrliche Buchführung beginnt im Kleinen erstaunlich früh.",
  "12-10":
    "Am 10. Dezember ist Tag der Menschenrechte: Gute Regeln sind besonders dann gut, wenn sie für alle lesbar sind.",
  "12-11":
    "Am 11. Dezember ist Internationaler Tag der Berge: Steigung ist unangenehm, Aussicht meistens nicht.",
  "12-12": "Am 12. Dezember wirkt Konstanz fast winterfest; genau dafür sind Routinen da.",
  "12-13":
    "Am 13. Dezember ist Lucia in Skandinavien: Ein bisschen Licht im Dunkeln ist selten eine schlechte Idee.",
  "12-14":
    "Am 14. Dezember ist ein halbwegs unscheinbarer Dezembertag ideal für Fortschritt ohne Feiertagskitsch.",
  "12-15":
    "Am 15. Dezember ist Bill of Rights Day in den USA: Rechte sind wichtig, aber kleine Pflichten machen den Alltag tragfähig.",
  "12-16":
    "Am 16. Dezember erinnert Beethoven daran, dass Wiederholung durchaus kunstnah sein kann.",
  "12-17":
    "Am 17. Dezember lassen die Wright Brothers grüßen: Fast alles, was später fliegt, begann einmal ziemlich holprig.",
  "12-18":
    "Am 18. Dezember ist Tag der Migranten; Bewegung ist heute weltweit mehr als nur eine Trainingsfrage.",
  "12-19":
    "Am 19. Dezember zeigt sich kurz vor Feiertagen, ob ein System nur für gute Laune gebaut wurde.",
  "12-20":
    "Am 20. Dezember ist ein klassischer Durchziehtag: nicht glanzvoll, aber statistisch sehr wertvoll.",
  "12-21":
    "Wintersonnenwende: Mehr Dunkelheit geht kaum, also ist jeder erledigte Satz fast schon Gegenlicht.",
  "12-22":
    "Am 22. Dezember zählt der kürzeste Arbeitsfaden am meisten: anfangen, nicht philosophieren.",
  "12-23":
    "Am 23. Dezember ist Vorweihnacht ein Realitätscheck: Es bleibt ein normaler Tag mit normalen Zahlen.",
  "12-24": "Heiligabend: Selbst ein kleiner Haken auf der Liste fühlt sich heute fast feierlich an.",
  "12-25": "Weihnachten: Ruhe ist gut, aber sie wird besser, wenn der Tag nicht offen bleibt.",
  "12-26":
    "Zweiter Feiertag: Perfekt für die unauffällige Art von Disziplin, die niemand posten würde.",
  "12-27":
    "Am 27. Dezember beginnt die Zone, in der Kalender und Ausreden gern verhandeln wollen.",
  "12-28":
    "Am 28. Dezember ist ein stiller Tag zwischen den Jahren; genau solche Daten sehen im Rückblick plötzlich wichtig aus.",
  "12-29":
    "Am 29. Dezember passt Nüchternheit gut; Ende-Jahr-Magie ersetzt keine saubere Bilanz.",
  "12-30":
    "Am 30. Dezember ist der vorletzte Tag berühmt für voreiligen inneren Feierabend.",
  "12-31":
    "Silvester: Jahresenden bekommen viel Pathos, obwohl sie meistens nur gute Buchhaltung verlangen.",
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

function getContextTail(context: DailyMessageContext) {
  const day = context.currentDate.slice(8);

  if ((day === "01" || day === "16") && context.motivation) {
    return ` Warum das Ganze? ${context.motivation}`;
  }

  if ((day === "05" || day === "15" || day === "25") && context.outstandingDebtCents > 0) {
    return ` Offen sind gerade ${formatCurrencyFromCents(context.outstandingDebtCents)}.`;
  }

  if ((day === "08" || day === "18" || day === "28") && context.latestWaistCm != null) {
    return ` Der letzte Bauchumfang liegt bei ${formatNumber(context.latestWaistCm)} cm.`;
  }

  if ((day === "09" || day === "19" || day === "29") && context.latestWeightKg != null) {
    return ` Das letzte Gewicht steht bei ${formatNumber(context.latestWeightKg)} kg.`;
  }

  if ((day === "07" || day === "17" || day === "27") && context.documentedDays > 0) {
    return ` ${context.documentedDays} Tage sind schon dokumentiert.`;
  }

  if (day === "03" || day === "13" || day === "23") {
    return ` Heute zählen ${context.currentTarget} pro Übung.`;
  }

  return "";
}

export function getDailyMessage(context: DailyMessageContext) {
  if (context.birthDate) {
    const birthdayKey = getMonthDayFromDate(context.birthDate);

    if (birthdayKey === context.currentDate.slice(5)) {
      const name = context.name?.trim() || "Du";
      const metricTail =
        context.latestWaistCm != null
          ? ` Der letzte Bauchumfang liegt bei ${formatNumber(context.latestWaistCm)} cm.`
          : context.latestWeightKg != null
            ? ` Das letzte Gewicht steht bei ${formatNumber(context.latestWeightKg)} kg.`
            : ` Heute zählen ${context.currentTarget} pro Übung.`;

      return `${name}, heute ist Geburtstag. Neues Lebensjahr, gleiche Konsequenz.${metricTail}`;
    }
  }

  const fact =
    DAILY_FACTS[context.currentDate.slice(5)] ||
    "Heute zählt vor allem, den Tag sauber abzuschließen und nicht mit morgen zu verhandeln.";

  return `${fact}${getContextTail(context)}`.trim();
}
