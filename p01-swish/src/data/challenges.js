export const CHALLENGES = [
  // TRADING
  {
    id: "first_trade",
    title: "First Trade",
    description: "Make your first trade",
    xpReward: 50,
    category: "trading",
    difficulty: "easy",
    type: "one-time",
    target: 1,
    evaluate: (d) => {
      const current = Math.min(d.totalTrades, 1);
      return { current, target: 1, percent: current >= 1 ? 100 : 0, completed: current >= 1 };
    },
  },
  {
    id: "ten_trades",
    title: "Active Trader",
    description: "Complete 10 trades",
    xpReward: 100,
    category: "trading",
    difficulty: "medium",
    type: "one-time",
    target: 10,
    evaluate: (d) => {
      const current = Math.min(d.totalTrades, 10);
      return { current, target: 10, percent: (current / 10) * 100, completed: current >= 10 };
    },
  },
  {
    id: "fifty_trades",
    title: "Trading Machine",
    description: "Complete 50 trades",
    xpReward: 300,
    category: "trading",
    difficulty: "hard",
    type: "one-time",
    target: 50,
    evaluate: (d) => {
      const current = Math.min(d.totalTrades, 50);
      return { current, target: 50, percent: (current / 50) * 100, completed: current >= 50 };
    },
  },
  {
    id: "five_trades_week",
    title: "Weekly Grinder",
    description: "Make 5 trades this week",
    xpReward: 75,
    category: "trading",
    difficulty: "medium",
    type: "weekly",
    target: 5,
    evaluate: (d) => {
      const current = Math.min(d.weeklyTrades, 5);
      return { current, target: 5, percent: (current / 5) * 100, completed: current >= 5 };
    },
  },
  {
    id: "buy_and_sell",
    title: "Round Trip",
    description: "Buy and sell the same stock",
    xpReward: 60,
    category: "trading",
    difficulty: "easy",
    type: "one-time",
    target: 1,
    evaluate: (d) => {
      const done = d.hasRoundTrip ? 1 : 0;
      return { current: done, target: 1, percent: done * 100, completed: done === 1 };
    },
  },

  // PORTFOLIO
  {
    id: "three_stocks",
    title: "Diversifier",
    description: "Hold 3 different stocks at once",
    xpReward: 80,
    category: "portfolio",
    difficulty: "easy",
    type: "one-time",
    target: 3,
    evaluate: (d) => {
      const current = Math.min(d.holdingsCount, 3);
      return { current, target: 3, percent: (current / 3) * 100, completed: current >= 3 };
    },
  },
  {
    id: "five_stocks",
    title: "Portfolio Builder",
    description: "Hold 5 different stocks at once",
    xpReward: 150,
    category: "portfolio",
    difficulty: "medium",
    type: "one-time",
    target: 5,
    evaluate: (d) => {
      const current = Math.min(d.holdingsCount, 5);
      return { current, target: 5, percent: (current / 5) * 100, completed: current >= 5 };
    },
  },
  {
    id: "portfolio_up",
    title: "In The Green",
    description: "Have your portfolio up 5% or more",
    xpReward: 200,
    category: "portfolio",
    difficulty: "hard",
    type: "ongoing",
    target: 5,
    evaluate: (d) => {
      const gainPct = d.portfolioGainPct;
      const percent = Math.min((gainPct / 5) * 100, 100);
      return { current: Math.round(gainPct * 10) / 10, target: 5, percent: Math.max(percent, 0), completed: gainPct >= 5 };
    },
  },
  {
    id: "invest_half",
    title: "All In (Half Way)",
    description: "Invest at least 50% of your starting cash",
    xpReward: 100,
    category: "portfolio",
    difficulty: "medium",
    type: "one-time",
    target: 5000,
    evaluate: (d) => {
      const invested = 10000 - d.cash;
      const current = Math.max(invested, 0);
      const percent = Math.min((current / 5000) * 100, 100);
      return { current: Math.round(current), target: 5000, percent, completed: current >= 5000 };
    },
  },

  // STREAK
  {
    id: "streak_3",
    title: "Consistent",
    description: "Log in 3 days in a row",
    xpReward: 60,
    category: "streak",
    difficulty: "easy",
    type: "one-time",
    target: 3,
    evaluate: (d) => {
      const current = Math.min(d.streak, 3);
      return { current, target: 3, percent: (current / 3) * 100, completed: current >= 3 };
    },
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    description: "Log in 7 days in a row",
    xpReward: 150,
    category: "streak",
    difficulty: "medium",
    type: "one-time",
    target: 7,
    evaluate: (d) => {
      const current = Math.min(d.streak, 7);
      return { current, target: 7, percent: (current / 7) * 100, completed: current >= 7 };
    },
  },
  {
    id: "streak_30",
    title: "Legendary Streak",
    description: "Log in 30 days in a row",
    xpReward: 500,
    category: "streak",
    difficulty: "hard",
    type: "one-time",
    target: 30,
    evaluate: (d) => {
      const current = Math.min(d.streak, 30);
      return { current, target: 30, percent: (current / 30) * 100, completed: current >= 30 };
    },
  },

  // LEARNING
  {
    id: "first_lesson",
    title: "Student",
    description: "Complete your first lesson",
    xpReward: 30,
    category: "learning",
    difficulty: "easy",
    type: "one-time",
    target: 1,
    evaluate: (d) => {
      const current = Math.min(d.lessonCount, 1);
      return { current, target: 1, percent: current >= 1 ? 100 : 0, completed: current >= 1 };
    },
  },
  {
    id: "five_lessons",
    title: "Scholar",
    description: "Complete 5 lessons",
    xpReward: 100,
    category: "learning",
    difficulty: "medium",
    type: "one-time",
    target: 5,
    evaluate: (d) => {
      const current = Math.min(d.lessonCount, 5);
      return { current, target: 5, percent: (current / 5) * 100, completed: current >= 5 };
    },
  },
  {
    id: "all_lessons",
    title: "Master Investor",
    description: "Complete all 15 lessons",
    xpReward: 500,
    category: "learning",
    difficulty: "hard",
    type: "one-time",
    target: 15,
    evaluate: (d) => {
      const current = Math.min(d.lessonCount, 15);
      return { current, target: 15, percent: (current / 15) * 100, completed: current >= 15 };
    },
  },
];
