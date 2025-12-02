export type RadioTrack = {
  id: string;
  title: string;
  src: string;
  duration?: string;
};

export type RadioCategory = {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverImage?: string;
  tracks: RadioTrack[];
};

const theHouseOnMangoStreetSources = [
  {
    title: "The house on mango street 1",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/001%20The%20house%20on%20mongo%20street%201.m4a",
  },
  {
    title: "002 Hairs 2",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/002%20Hairs%202.m4a",
  },
  {
    title: "003 Boys and girls",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/003%20Boys%20and%20girls.m4a",
  },
  {
    title: "004 My name",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/004%20My%20name.m4a",
  },
  {
    title: "006 Our good day",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/006%20Our%20good%20day1.m4a",
  },
  {
    title: "007 Laughter",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/007%20Laughter.m4a",
  },
  {
    title: "008 Gil’s Furniture Bought & Sold",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/008%20Gil%E2%80%99s%20Furniture%20Bought%20%26%20Sold.m4a",
  },
  {
    title: "009 Meme Ortiz",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/009%20Meme%20Ortiz.m4a",
  },
  {
    title: "010 Louie, His cousin & His Other Cousin",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/010%20Louie%2C%20His%20cousin%20%26%20His%20Other%20Cousin.m4a",
  },
  {
    title: "011 Marin",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/011%20Marin.m4a",
  },
  {
    title: "012 Those Who Don’t",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/012%20Those%20Who%20Don%E2%80%99t.m4a",
  },
  {
    title: "013 Alicia Who Sees Mice",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/013%20Alicia%20Who%20Sees%20Mice.m4a",
  },
  {
    title: "014 Darius & the Clouds",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/014%20Darius%20%26%20the%20Clouds.m4a",
  },
  {
    title: "015 And some more",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/015%20And%20some%20more.m4a",
  },
  {
    title: "016 The Family of Little Feet",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/016%20The%20Family%20of%20Little%20Feet.m4a",
  },
  {
    title: "017 A Rice Sandwich",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/017%20A%20Rice%20Sandwich.m4a",
  },
  {
    title: "018 Chanclas",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/018%20Chanclas.m4a",
  },
  {
    title: "019 Hips",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/019%20Hips.m4a",
  },
  {
    title: "020 The First Job",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/020%20The%20First%20Job.m4a",
  },
  {
    title: "021 Papa Who Wakes Up Tired in the Dark",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/021%20Papa%20Who%20Wakes%20Up%20Tired%20in%20the%20Dark.m4a",
  },
  {
    title: "022 Born Bad",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/022%20Born%20Bad.m4a",
  },
  {
    title: "023 Elenita, Cards, Palm, Water",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/023%20Elenita%2C%20Cards%2C%20Palm%2C%20Water.m4a",
  },
  {
    title: "024 Geraldo No Last Name",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/024%20Geraldo%20No%20Last%20Name.m4a",
  },
  {
    title: "025 Edna’s Ruthie",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/025%20Edna%E2%80%99s%20Ruthie.m4a",
  },
  {
    title: "026 The Earl of Tennessee",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/026%20The%20Earl%20of%20Tennessee.m4a",
  },
  {
    title: "028 Four Skinny Trees",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/028%20Four%20Skinny%20Trees.m4a",
  },
  {
    title: "029 No Speak English",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/029%20No%20Speak%20English.m4a",
  },
  {
    title: "030",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/030.m4a",
  },
  {
    title: "031 Sally",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/031%20Sally.m4a",
  },
  {
    title: "032 Minerva Writes Poems",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/032%20Minerva%20Writes%20Poems.m4a",
  },
  {
    title: "033 Bums in the Attic",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/033%20Bums%20in%20the%20Attic.m4a",
  },
  {
    title: "034 Beautiful & Cruel",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/034%20Beautiful%20%26%20Cruel.m4a",
  },
  {
    title: "035 A Smart Cookie",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/035%20A%20Smart%20Cookie.m4a",
  },
  {
    title: "036 What Sally Said",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/036%20What%20Sally%20Said.m4a",
  },
  {
    title: "037 The Monkey Garden",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/037%20The%20Monkey%20Garden.m4a",
  },
  {
    title: "038 Red Clowns",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/038%20Red%20Clowns.m4a",
  },
  {
    title: "039 Linoleum roses",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/039%20Linoleum%20roses.m4a",
  },
  {
    title: "040 The Three Sisters",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/040%20The%20Three%20Sisters.m4a",
  },
  {
    title: "041 Alicia & I Talking on Edna’s Steps",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/041%20Alicia%20%26%20I%20Talking%20on%20Edna%E2%80%99s%20Steps.m4a",
  },
  {
    title: "042 A House of My Own",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/042%20A%20House%20of%20My%20Own.m4a",
  },
  {
    title: "043 Mango Says Goodbye Sometimes",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/043%20Mango%20Says%20Goodbye%20Sometimes.m4a",
  },
  {
    title: "044 ending",
    src: "https://reading-audios-1308187607.cos.ap-shanghai.myqcloud.com/the-house-on-mango-street/044%20ending.m4a",
  },
];

const theHouseOnMangoStreetTracks: RadioTrack[] =
  theHouseOnMangoStreetSources.map((track, index) => ({
    id: `mango-street-${String(index + 1).padStart(3, "0")}`,
    ...track,
  }));

export const radioLibrary: RadioCategory[] = [
  {
    id: "the-house-on-mango-street",
    title: "The House on Mango Street",
    author: "Sandra Cisneros",
    description:
      "Personal read-aloud project capturing each vignette from Sandra Cisneros’s coming-of-age classic.",
    tracks: theHouseOnMangoStreetTracks,
  },
];

export const defaultCategoryId = radioLibrary[0]?.id;
