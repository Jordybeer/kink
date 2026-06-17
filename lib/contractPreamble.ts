import { categorizeRole } from "@/lib/roles";

export interface PreambleInput {
  nameA: string;
  roleA: string;
  nameB: string;
  roleB: string;
  levelA: string;
  levelB: string;
  realNameA?: string;
  realNameB?: string;
}

const BEGINNER_LEVELS = ["beginner"];
const DEEP_LEVELS = ["diepgaand", "ervaren"];

function guidanceClause(i: PreambleInput): string {
  const needs =
    (BEGINNER_LEVELS.includes(i.levelA) && DEEP_LEVELS.includes(i.levelB)) ||
    (BEGINNER_LEVELS.includes(i.levelB) && DEEP_LEVELS.includes(i.levelA));
  if (!needs) return "";
  const novice = i.levelA === "beginner" ? i.nameA : i.nameB;
  const guide  = i.levelA === "beginner" ? i.nameB : i.nameA;
  return ` ${novice} brengt nieuwsgierigheid; ${guide} brengt geduld en begeleiding. Zij verplichten zich aan een tempo dat altijd in dienst staat van veiligheid en wederzijds begrip.`;
}

function resolveDirection(i: PreambleInput): { kind: "domsub"; subName: string; domName: string; subRole: string; domRole: string } | { kind: "mutual" } {
  const dirA = categorizeRole(i.roleA);
  const dirB = categorizeRole(i.roleB);
  if (dirA === "give" && dirB === "receive") {
    return { kind: "domsub", subName: i.nameB, domName: i.nameA, subRole: i.roleB, domRole: i.roleA };
  }
  if (dirA === "receive" && dirB === "give") {
    return { kind: "domsub", subName: i.nameA, domName: i.nameB, subRole: i.roleA, domRole: i.roleB };
  }
  return { kind: "mutual" };
}

export function buildIntimatePreamble(i: PreambleInput): string {
  const intro = `Dit contract wordt gesloten tussen ${i.nameA} (${i.roleA}) en ${i.nameB} (${i.roleB}).`;
  const dir = resolveDirection(i);

  let body: string;
  if (dir.kind === "domsub") {
    body =
      ` Beiden verklaren dat zij dit vrijwillig, bewust en zonder dwang aangaan. Binnen dit contract biedt ${dir.subName} zichzelf aan in vertrouwen, toewijding en gewillige overgave, binnen de grenzen die vooraf duidelijk zijn besproken en door beiden zijn begrepen. ${dir.domName} aanvaardt die gave met zorg, verantwoordelijkheid, beheersing en respect.` +
      ` Beiden erkennen dat onderwerping geen verlies van het zelf betekent. Het is een bewuste keuze om vertrouwen, kwetsbaarheid en gehoorzaamheid in handen te leggen van iemand die belooft daar zorgvuldig en respectvol mee om te gaan.` +
      ` Beiden erkennen ook dat autoriteit geen vrijbrief is, maar een verantwoordelijkheid. Zij vraagt om duidelijke leiding, zelfbeheersing, bescherming en blijvende aandacht voor de grenzen en het welzijn van de ander.` +
      ` Dit contract rust op wederzijds consent, eerlijke communicatie, verantwoordelijkheid en respect. Consent blijft altijd vrij en kan op elk moment worden ingetrokken. Daarom behouden beiden te allen tijde het recht om dit contract op eigen initiatief, onmiddellijk en geheel of gedeeltelijk te beëindigen, te pauzeren of te herzien.` +
      ` Niets in dit contract doet af aan ieders recht op grenzen, veiligheid, waardigheid en eigen keuze. Bij twijfel of onduidelijkheid krijgen communicatie, respect en welzijn altijd voorrang.` +
      ` Door ondertekening bevestigen beiden dat zij dit contract hebben gelezen, begrepen en vrijwillig aanvaarden onder de naam die zij in dit document gebruiken.`;
  } else {
    body = ` Door dit verbond bevestigen ${i.nameA} en ${i.nameB} hun grenzen, verlangens en wederzijdse afspraken, vrijelijk en bewust uitgesproken. Wat hier staat, rust op vertrouwen, communicatie en gedeelde verantwoordelijkheid. Beiden begrijpen dat iedere afspraak voortkomt uit respect voor de ander en eerlijkheid over het zelf.`;
  }

  return `${intro}${body}${guidanceClause(i)}`;
}

export function buildFormalPreamble(i: PreambleInput & { realNameA: string; realNameB: string }): string {
  const introA = `${i.realNameA} (${i.nameA})`;
  const introB = `${i.realNameB} (${i.nameB})`;
  const intro = `Dit contract wordt gesloten tussen ${introA}, hierna genoemd de ${i.roleA}, en ${introB}, hierna genoemd de ${i.roleB}.`;
  const dir = resolveDirection(i);

  let body: string;
  if (dir.kind === "domsub") {
    body =
      ` Beide partijen verklaren dat zij dit verbond vrijwillig, bewust en zonder dwang aangaan. Binnen dit contract biedt de ${dir.subRole} zich aan in vertrouwen, toewijding en gewillige overgave, binnen de grenzen die vooraf duidelijk zijn besproken en door beide partijen zijn begrepen. De ${dir.domRole} aanvaardt die toewijding met zorg, verantwoordelijkheid, beheersing en respect.` +
      ` Partijen erkennen dat onderwerping geen afstand van eigenwaarde, autonomie of waardigheid inhoudt. Zij is een vrije en bewuste keuze om vertrouwen, kwetsbaarheid en gehoorzaamheid toe te vertrouwen binnen de grenzen die samen zijn bepaald.` +
      ` Partijen erkennen eveneens dat autoriteit binnen dit contract geen onbeperkt recht is, maar een plicht. Zij brengt met zich mee: leiden met duidelijkheid, handelen met zelfbeheersing, beschermen waar nodig, en steeds zorgvuldig omgaan met het geschonken vertrouwen.` +
      ` Dit contract steunt op wederzijds consent, open communicatie, verantwoordelijkheid en respect voor elkaars grenzen. Consent is doorlopend, vrij gegeven en op ieder moment herroepbaar. Beide partijen behouden daarom te allen tijde het recht om dit contract eenzijdig, onmiddellijk en naar eigen keuze geheel of gedeeltelijk te beëindigen, te pauzeren of te herzien.` +
      ` Geen enkele bepaling van dit contract kan worden uitgelegd als een afstand van het recht om grenzen aan te geven, te wijzigen of te handhaven. Bij twijfel, onduidelijkheid of spanning primeren veiligheid, waardigheid, communicatie en de uitdrukkelijke wil van de betrokken partij.` +
      ` Door ondertekening bevestigen beide partijen dat zij de inhoud van dit verbond hebben gelezen, begrepen en vrijwillig aanvaarden.`;
  } else {
    body = ` Beide partijen verklaren dat zij dit verbond vrijwillig, bewust en zonder dwang aangaan. Door dit contract bevestigen ${i.realNameA} en ${i.realNameB} hun grenzen, verlangens en wederzijdse afspraken, vrijelijk en bewust uitgesproken. Wat hier staat, rust op vertrouwen, communicatie en gedeelde verantwoordelijkheid. Beide partijen behouden te allen tijde het recht om dit contract eenzijdig, onmiddellijk en naar eigen keuze geheel of gedeeltelijk te beëindigen, te pauzeren of te herzien. Door ondertekening bevestigen beide partijen dat zij de inhoud van dit verbond hebben gelezen, begrepen en vrijwillig aanvaarden.`;
  }

  return `${intro}${body}${guidanceClause(i)}`;
}

export function buildPreamble(i: PreambleInput): string {
  if (i.realNameA && i.realNameB) {
    return buildFormalPreamble({ ...i, realNameA: i.realNameA, realNameB: i.realNameB });
  }
  return buildIntimatePreamble(i);
}
