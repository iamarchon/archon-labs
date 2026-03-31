import type { Player } from "@/types";

export const PLAYERS: Player[] = [
  { id: 1,  jersey: 18,  name: "V. Kohli",        full: "Virat Kohli",         team: "RCB",  role: "BAT",  cr: 11.0, sel: 72, ovr: false },
  { id: 2,  jersey: 1,   name: "R. Patidar",      full: "Rajat Patidar",       team: "RCB",  role: "BAT",  cr: 9.5,  sel: 58, ovr: false },
  { id: 3,  jersey: 16,  name: "P. Salt",         full: "Phil Salt",           team: "RCB",  role: "WK",   cr: 9.0,  sel: 61, ovr: true  },
  { id: 4,  jersey: 38,  name: "J. Hazlewood",    full: "Josh Hazlewood",      team: "RCB",  role: "BOWL", cr: 8.5,  sel: 44, ovr: true  },
  { id: 5,  jersey: 45,  name: "K. Pandya",       full: "Krunal Pandya",       team: "RCB",  role: "AR",   cr: 8.5,  sel: 39, ovr: false },
  { id: 6,  jersey: 8,   name: "T. David",        full: "Tim David",           team: "RCB",  role: "AR",   cr: 8.5,  sel: 51, ovr: true  },
  { id: 7,  jersey: 15,  name: "B. Kumar",        full: "Bhuvneshwar Kumar",   team: "RCB",  role: "BOWL", cr: 8.0,  sel: 36, ovr: false },

  { id: 8,  jersey: 45,  name: "R. Sharma",       full: "Rohit Sharma",        team: "MI",   role: "BAT",  cr: 10.5, sel: 68, ovr: false },
  { id: 9,  jersey: 93,  name: "J. Bumrah",       full: "Jasprit Bumrah",      team: "MI",   role: "BOWL", cr: 10.5, sel: 75, ovr: false },
  { id: 10, jersey: 73,  name: "SKY",             full: "Suryakumar Yadav",    team: "MI",   role: "BAT",  cr: 10.0, sel: 63, ovr: false },
  { id: 11, jersey: 228, name: "H. Pandya",       full: "Hardik Pandya",       team: "MI",   role: "AR",   cr: 9.5,  sel: 56, ovr: false },
  { id: 12, jersey: 19,  name: "T. Boult",        full: "Trent Boult",         team: "MI",   role: "BOWL", cr: 9.0,  sel: 48, ovr: true  },
  { id: 13, jersey: 9,   name: "T. Varma",        full: "Tilak Varma",         team: "MI",   role: "BAT",  cr: 8.5,  sel: 52, ovr: false },
  { id: 14, jersey: 25,  name: "Q. de Kock",      full: "Quinton de Kock",     team: "MI",   role: "WK",   cr: 8.5,  sel: 47, ovr: true  },
  { id: 15, jersey: 6,   name: "W. Jacks",        full: "Will Jacks",          team: "MI",   role: "AR",   cr: 8.0,  sel: 38, ovr: true  },

  { id: 16, jersey: 31,  name: "R. Gaikwad",      full: "Ruturaj Gaikwad",     team: "CSK",  role: "BAT",  cr: 9.5,  sel: 61, ovr: false },
  { id: 17, jersey: 7,   name: "M. Dhoni",        full: "MS Dhoni",            team: "CSK",  role: "WK",   cr: 9.0,  sel: 69, ovr: false },
  { id: 18, jersey: 9,   name: "S. Samson",       full: "Sanju Samson",        team: "CSK",  role: "WK",   cr: 9.5,  sel: 58, ovr: false },
  { id: 19, jersey: 2,   name: "S. Dube",         full: "Shivam Dube",         team: "CSK",  role: "AR",   cr: 8.5,  sel: 44, ovr: false },
  { id: 20, jersey: 22,  name: "K. Ahmed",        full: "Khaleel Ahmed",       team: "CSK",  role: "BOWL", cr: 8.0,  sel: 37, ovr: false },
  { id: 21, jersey: 90,  name: "N. Ahmad",        full: "Noor Ahmad",          team: "CSK",  role: "BOWL", cr: 8.0,  sel: 41, ovr: true  },

  { id: 22, jersey: 11,  name: "C. Green",        full: "Cameron Green",       team: "KKR",  role: "AR",   cr: 9.5,  sel: 62, ovr: true  },
  { id: 23, jersey: 21,  name: "S. Narine",       full: "Sunil Narine",        team: "KKR",  role: "AR",   cr: 9.5,  sel: 67, ovr: true  },
  { id: 24, jersey: 29,  name: "V. Chakravarthy", full: "Varun Chakravarthy",  team: "KKR",  role: "BOWL", cr: 9.0,  sel: 55, ovr: false },
  { id: 25, jersey: 3,   name: "R. Singh",        full: "Rinku Singh",         team: "KKR",  role: "BAT",  cr: 8.5,  sel: 59, ovr: false },
  { id: 26, jersey: 8,   name: "F. Allen",        full: "Finn Allen",          team: "KKR",  role: "BAT",  cr: 7.5,  sel: 51, ovr: true  },
  { id: 27, jersey: 5,   name: "A. Raghuvanshi",  full: "Angkrish Raghuvanshi",team: "KKR",  role: "BAT",  cr: 5.0,  sel: 24, ovr: false },

  { id: 28, jersey: 19,  name: "T. Head",         full: "Travis Head",         team: "SRH",  role: "BAT",  cr: 10.0, sel: 71, ovr: true  },
  { id: 29, jersey: 30,  name: "P. Cummins",      full: "Pat Cummins",         team: "SRH",  role: "AR",   cr: 9.5,  sel: 54, ovr: true  },
  { id: 30, jersey: 42,  name: "H. Klaasen",      full: "Heinrich Klaasen",    team: "SRH",  role: "WK",   cr: 9.5,  sel: 60, ovr: true  },
  { id: 31, jersey: 4,   name: "A. Sharma",       full: "Abhishek Sharma",     team: "SRH",  role: "BAT",  cr: 8.5,  sel: 49, ovr: false },
  { id: 32, jersey: 65,  name: "N. Reddy",        full: "Nitish Kumar Reddy",  team: "SRH",  role: "AR",   cr: 8.5,  sel: 46, ovr: false },
  { id: 33, jersey: 10,  name: "I. Kishan",       full: "Ishan Kishan",        team: "SRH",  role: "WK",   cr: 8.5,  sel: 44, ovr: false },

  { id: 34, jersey: 77,  name: "S. Gill",         full: "Shubman Gill",        team: "GT",   role: "BAT",  cr: 10.0, sel: 66, ovr: false },
  { id: 35, jersey: 9,   name: "J. Buttler",      full: "Jos Buttler",         team: "GT",   role: "WK",   cr: 10.0, sel: 64, ovr: true  },
  { id: 36, jersey: 19,  name: "R. Khan",         full: "Rashid Khan",         team: "GT",   role: "AR",   cr: 9.5,  sel: 70, ovr: true  },
  { id: 37, jersey: 25,  name: "K. Rabada",       full: "Kagiso Rabada",       team: "GT",   role: "BOWL", cr: 9.5,  sel: 57, ovr: true  },
  { id: 38, jersey: 14,  name: "S. Sudharsan",    full: "Sai Sudharsan",       team: "GT",   role: "BAT",  cr: 8.5,  sel: 48, ovr: false },
  { id: 39, jersey: 5,   name: "W. Sundar",       full: "Washington Sundar",   team: "GT",   role: "AR",   cr: 8.0,  sel: 42, ovr: false },

  { id: 40, jersey: 20,  name: "A. Patel",        full: "Axar Patel",          team: "DC",   role: "AR",   cr: 9.5,  sel: 62, ovr: false },
  { id: 41, jersey: 1,   name: "KL Rahul",        full: "KL Rahul",            team: "DC",   role: "WK",   cr: 9.5,  sel: 60, ovr: false },
  { id: 42, jersey: 56,  name: "M. Starc",        full: "Mitchell Starc",      team: "DC",   role: "BOWL", cr: 9.0,  sel: 52, ovr: true  },
  { id: 43, jersey: 23,  name: "K. Yadav",        full: "Kuldeep Yadav",       team: "DC",   role: "BOWL", cr: 9.0,  sel: 58, ovr: false },
  { id: 44, jersey: 17,  name: "D. Miller",       full: "David Miller",        team: "DC",   role: "BAT",  cr: 8.0,  sel: 44, ovr: true  },

  { id: 45, jersey: 41,  name: "S. Iyer",         full: "Shreyas Iyer",        team: "PBKS", role: "BAT",  cr: 9.5,  sel: 63, ovr: false },
  { id: 46, jersey: 2,   name: "A. Singh",        full: "Arshdeep Singh",      team: "PBKS", role: "BOWL", cr: 9.0,  sel: 55, ovr: false },
  { id: 47, jersey: 3,   name: "Y. Chahal",       full: "Yuzvendra Chahal",    team: "PBKS", role: "BOWL", cr: 9.0,  sel: 57, ovr: false },
  { id: 48, jersey: 7,   name: "P. Arya",         full: "Priyansh Arya",       team: "PBKS", role: "BAT",  cr: 8.0,  sel: 44, ovr: false },

  { id: 49, jersey: 14,  name: "Y. Jaiswal",      full: "Yashasvi Jaiswal",    team: "RR",   role: "BAT",  cr: 10.0, sel: 69, ovr: false },
  { id: 50, jersey: 8,   name: "R. Jadeja",       full: "Ravindra Jadeja",     team: "RR",   role: "AR",   cr: 9.5,  sel: 65, ovr: false },
  { id: 51, jersey: 22,  name: "J. Archer",       full: "Jofra Archer",        team: "RR",   role: "BOWL", cr: 9.5,  sel: 58, ovr: true  },
  { id: 52, jersey: 10,  name: "V. Suryavanshi",  full: "Vaibhav Suryavanshi", team: "RR",   role: "BAT",  cr: 8.0,  sel: 52, ovr: false },
  { id: 53, jersey: 11,  name: "R. Parag",        full: "Riyan Parag",         team: "RR",   role: "AR",   cr: 8.5,  sel: 48, ovr: false },

  { id: 54, jersey: 17,  name: "R. Pant",         full: "Rishabh Pant",        team: "LSG",  role: "WK",   cr: 11.0, sel: 78, ovr: false },
  { id: 55, jersey: 11,  name: "M. Shami",        full: "Mohammad Shami",      team: "LSG",  role: "BOWL", cr: 9.5,  sel: 61, ovr: false },
  { id: 56, jersey: 44,  name: "M. Yadav",        full: "Mayank Yadav",        team: "LSG",  role: "BOWL", cr: 8.5,  sel: 49, ovr: false },
  { id: 57, jersey: 24,  name: "N. Pooran",       full: "Nicholas Pooran",     team: "LSG",  role: "WK",   cr: 8.5,  sel: 56, ovr: true  },
  { id: 58, jersey: 8,   name: "M. Marsh",        full: "Mitchell Marsh",      team: "LSG",  role: "AR",   cr: 8.5,  sel: 47, ovr: true  },
];

export function getMatchPlayers(homeTeam: string, awayTeam: string): Player[] {
  return PLAYERS.filter((p) => p.team === homeTeam || p.team === awayTeam);
}
