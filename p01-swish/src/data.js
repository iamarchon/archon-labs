export const SEED_STOCKS = [
  { ticker:"AAPL",  name:"Apple Inc.",      price:189.30, changePct:+0.66 },
  { ticker:"NVDA",  name:"NVIDIA Corp.",    price:875.40, changePct:+1.48 },
  { ticker:"TSLA",  name:"Tesla Inc.",      price:248.50, changePct:-1.27 },
  { ticker:"AMZN",  name:"Amazon.com",      price:178.25, changePct:+1.19 },
  { ticker:"GOOGL", name:"Alphabet Inc.",   price:141.80, changePct:+0.67 },
  { ticker:"NFLX",  name:"Netflix Inc.",    price:485.60, changePct:-1.30 },
  { ticker:"MSFT",  name:"Microsoft Corp.", price:378.90, changePct:+1.20 },
  { ticker:"RBLX",  name:"Roblox Corp.",    price:42.15,  changePct:+2.06 },
  { ticker:"SPOT",  name:"Spotify Tech.",   price:248.70, changePct:+1.30 },
  { ticker:"DIS",   name:"Walt Disney Co.", price:112.40, changePct:-1.58 },
];

export const HOLDINGS = [
  { ticker:"AAPL", shares:3,  avgCost:182.50 },
  { ticker:"NVDA", shares:2,  avgCost:845.00 },
  { ticker:"RBLX", shares:10, avgCost:38.40  },
];

export const LEADERBOARD = [
  { rank:1, user:"portfolio_pro",  level:"Legend",  total:"$15,842", gain:"+58.4%", streak:14 },
  { rank:2, user:"market_maven",   level:"Diamond", total:"$13,200", gain:"+32.0%", streak:9  },
  { rank:3, user:"hoops_investor", level:"Gold",    total:"$11,480", gain:"+14.8%", streak:7  },
  { rank:4, user:"you",            level:"Silver",  total:"$10,840", gain:"+8.4%",  streak:5, isUser:true },
  { rank:5, user:"rblx_trader",    level:"Silver",  total:"$10,120", gain:"+1.2%",  streak:2  },
];

export const CHALLENGES = [
  { id:1, title:"Beat the S&P 500",        desc:"Outperform the index by end of week",    xp:200, progress:62, due:"3 days", color:"#0071e3" },
  { id:2, title:"Diversify your portfolio", desc:"Hold 4 or more different stocks",        xp:150, progress:75, due:"Today",  color:"#1a7f3c" },
  { id:3, title:"Study a new sector",       desc:"Read 2 Learn articles this week",        xp:100, progress:50, due:"4 days", color:"#b45309" },
];

export const LESSONS = [
  { title:"What is a Stock?",      desc:"Own a piece of your favorite companies",   xp:50,  done:true  },
  { title:"Reading Price Charts",  desc:"Spot trends before they become obvious",   xp:75,  done:true  },
  { title:"Buy vs. Sell",          desc:"When to enter and exit a position",        xp:100, done:false },
  { title:"Risk Management",       desc:"Why diversification actually matters",     xp:125, done:false },
  { title:"Building a Portfolio",  desc:"Thinking in decades, not days",            xp:150, done:false },
];
