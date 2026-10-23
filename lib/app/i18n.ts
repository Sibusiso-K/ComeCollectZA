// All visible strings, keyed by English text. Missing keys fall back to English.
export type LangCode = "en" | "af" | "zu" | "xh" | "nr" | "nso" | "st" | "tn" | "ss" | "ve" | "ts";

export const LANGUAGES: { code: LangCode; name: string; full: boolean }[] = [
  { code: "en", name: "English", full: true },
  { code: "af", name: "Afrikaans", full: true },
  { code: "zu", name: "isiZulu", full: true },
  { code: "xh", name: "isiXhosa", full: true },
  { code: "nr", name: "isiNdebele", full: false },
  { code: "nso", name: "Sepedi", full: false },
  { code: "st", name: "Sesotho", full: false },
  { code: "tn", name: "Setswana", full: false },
  { code: "ss", name: "siSwati", full: false },
  { code: "ve", name: "Tshivenda", full: false },
  { code: "ts", name: "Xitsonga", full: false },
];

type Tr = Partial<Record<"af" | "zu" | "xh", string>>;
export const DICT: Record<string, Tr> = {
  "Get paid fairly for every kilogram you collect.": { af: "Kry regverdig betaal vir elke kilogram wat jy versamel.", zu: "Holelwa ngobulungiswa ngekhilogremu ngayinye oyiqoqayo.", xh: "Hlawulwa ngokufanelekileyo ngekhilogram nganye oyiqokelelayo." },
  "Choose your language": { af: "Kies jou taal", zu: "Khetha ulimi lwakho", xh: "Khetha ulwimi lwakho" },
  "Get started": { af: "Begin", zu: "Qala", xh: "Qalisa" },
  "Stays on your phone": { af: "Bly op jou foon", zu: "Ihlala efonini yakho", xh: "Ihlala kwifowuni yakho" },
  "Works with no data after your first scan": { af: "Werk sonder data na jou eerste skandering", zu: "Isebenza ngaphandle kwedatha ngemva kokuskena kokuqala", xh: "Isebenza ngaphandle kwedatha emva kokuskena kokuqala" },
  "translation in progress": { af: "vertaling aan die gang", zu: "ukuhumusha kuyaqhubeka", xh: "uguqulelo luyaqhubeka" },
  "Demo data": { af: "Demodata", zu: "Idatha yedemo", xh: "Idatha yedemo" },
  "Tap to show chart": { af: "Tik om grafiek te wys", zu: "Thepha ukubona ishadi", xh: "Cofa ukubona itshati" },
  "Switch to light mode": { af: "Skakel na ligte modus", zu: "Shintshela kumodi ekhanyayo", xh: "Tshintshela kwimowudi ekhanyayo" },
  "Switch to dark mode": { af: "Skakel na donker modus", zu: "Shintshela kumodi emnyama", xh: "Tshintshela kwimowudi emnyama" },
  "You are offline. Showing the last prices.": { af: "Jy is aflyn. Wys die laaste pryse.", zu: "Awuxhunyiwe. Kuboniswa amanani okugcina.", xh: "Awuqhagamshelwanga. Kuboniswa amaxabiso okugqibela." },
  Settings: { af: "Instellings", zu: "Izilungiselelo", xh: "Iisetingi" },
  Main: { af: "Hoof", zu: "Okuyinhloko", xh: "Okuphambili" },
  Home: { af: "Tuis", zu: "Ekhaya", xh: "Ekhaya" },
  Prices: { af: "Pryse", zu: "Amanani", xh: "Amaxabiso" },
  Sell: { af: "Verkoop", zu: "Thengisa", xh: "Thengisa" },
  "My money": { af: "My geld", zu: "Imali yami", xh: "Imali yam" },
  "Scripted answers for the demo": { af: "Geskrewe antwoorde vir die demo", zu: "Izimpendulo ezibhaliwe zedemo", xh: "Iimpendulo ezibhaliweyo zedemo" },
  "Hi {name}, how can I help with recycling today?": { af: "Hallo {name}, hoe kan ek vandag met herwinning help?", zu: "Sawubona {name}, ngingakusiza kanjani ngokuphinda kusetshenziswe namuhla?", xh: "Molo {name}, ndingakunceda njani ngokurisayikilisha namhlanje?" },
  "When should I sell cans?": { af: "Wanneer moet ek blikkies verkoop?", zu: "Kufanele ngithengise nini amathini?", xh: "Ndifanele ndithengise nini iitoti?" },
  "How much is my service fee?": { af: "Hoeveel is my diensfooi?", zu: "Ingakanani imali yesevisi yami?", xh: "Ingakanani imali yenkonzo yam?" },
  "Which centre pays most?": { af: "Watter sentrum betaal die meeste?", zu: "Isiphi isikhungo esikhokha kakhulu?", xh: "Leliphi iziko elihlawula kakhulu?" },
  "Cans are worth the most per kg.": { af: "Blikkies is die meeste werd per kg.", zu: "Amathini abiza kakhulu nge-kg.", xh: "Iitoti zixabiseke kakhulu nge-kg." },
  "Sell when the board price for your material is higher than last week.": { af: "Verkoop wanneer die bordprys vir jou materiaal hoër is as verlede week.", zu: "Thengisa uma inani lebhodi lempahla yakho liphezulu kunelesonto eledlule.", xh: "Thengisa xa ixabiso lebhodi lento yakho liphezulu kuneveki ephelileyo." },
  "The service fee is 15c per kg.": { af: "Die diensfooi is 15c per kg.", zu: "Imali yesevisi ingu-15c nge-kg.", xh: "Imali yenkonzo yi-15c nge-kg." },
  "The centre with the best board price is shown on the Prices screen.": { af: "Die sentrum met die beste bordprys word op die Pryse-skerm gewys.", zu: "Isikhungo esinenani elingcono sikhonjiswa esikrinini Amanani.", xh: "Iziko elinexabiso elingcono liboniswa kwiscreen Amaxabiso." },
  "Ask a question": { af: "Vra 'n vraag", zu: "Buza umbuzo", xh: "Buza umbuzo" },
  Send: { af: "Stuur", zu: "Thumela", xh: "Thumela" },
  Close: { af: "Maak toe", zu: "Vala", xh: "Vala" },
  "Scan the code": { af: "Skandeer die kode", zu: "Skena ikhodi", xh: "Skena ikhowudi" },
};

export function translate(lang: LangCode, key: string, vars?: Record<string, string | number>): string {
  let s = (lang === "af" || lang === "zu" || lang === "xh" ? DICT[key]?.[lang] : undefined) ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
