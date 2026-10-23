// Overview photos of different parts of Soweto, used as backdrops. All are from Wikimedia Commons under
// open licences, resized for low-data phones. Credits are shown in Settings and in public/images/soweto/CREDITS.md.
export type Place = "orlando" | "towers" | "meadowlands" | "kliptown" | "bara";

export type PlacePhoto = {
  label: string;
  src: string;
  credit: { title: string; author: string; licence: string; url: string };
};

export const PLACES: Record<Place, PlacePhoto> = {
  orlando: {
    label: "Orlando",
    src: "/images/soweto/orlando.jpg",
    credit: {
      title: "Soweto-002",
      author: "Michael Denne",
      licence: "CC BY-SA 2.0",
      url: "https://commons.wikimedia.org/wiki/File:Soweto-002.jpg",
    },
  },
  towers: {
    label: "Orlando Towers",
    src: "/images/soweto/towers.jpg",
    credit: {
      title: "Orlando Towers",
      author: "Bernard Dupont",
      licence: "CC BY-SA 2.0",
      url: "https://commons.wikimedia.org/wiki/File:Orlando_Towers_..._(32133536397).jpg",
    },
  },
  meadowlands: {
    label: "Meadowlands",
    src: "/images/soweto/meadowlands.jpg",
    credit: {
      title: "Aerial View of Meadowlands, South Africa",
      author: "fading",
      licence: "CC BY-SA 3.0",
      url: "https://commons.wikimedia.org/wiki/File:Aerial_View_of_Meadowlands,_South_Africa_(with_FNB_stadium_at_bottum_left_cornor)_-_panoramio.jpg",
    },
  },
  kliptown: {
    label: "Kliptown",
    src: "/images/soweto/kliptown.jpg",
    credit: {
      title: "Walter Sisulu Square, Soweto",
      author: "Bernard Gagnon",
      licence: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Walter_Sisulu_Square,_Soweto.jpg",
    },
  },
  bara: {
    label: "Bara",
    src: "/images/soweto/bara.jpg",
    credit: {
      title: "The Chris Hani Baragwanath Hospital, Soweto",
      author: "Robert Cutts",
      licence: "CC BY 2.0",
      url: "https://commons.wikimedia.org/wiki/File:The_Chris_Hani_Baragwanath_Hospital,_Soweto.jpg",
    },
  },
};

export const PLACE_ORDER: Place[] = ["orlando", "towers", "meadowlands", "kliptown", "bara"];
