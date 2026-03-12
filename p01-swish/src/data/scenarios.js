export const SCENARIO_DATA = [
  {
    id: "first_paycheck",
    title: "First Paycheck",
    emoji: "\u{1F4B5}",
    difficulty: "Beginner",
    xp: 75,
    setup: "You just got your first job at 16. Your first paycheck is $500. Your parents say save it. Your friend says invest it. What do you do?",
    decisions: [
      {
        situation: "You're holding $500 cash. It feels like a lot of money. Your parents want you to save it all, but you've been reading about investing. What do you do first?",
        choices: [
          { label: "A", text: "Spend $200 on clothes, save the rest", consequence: "Fun now, but less to grow.", points: -10 },
          { label: "B", text: "Put it all in savings", consequence: "Safe, but inflation eats 3% a year. Your money slowly loses value sitting there.", points: 5 },
          { label: "C", text: "Keep $100 for spending, invest $400", consequence: "Smart balance. You enjoy some now and put most to work.", points: 20, best: true },
        ],
      },
      {
        situation: "You decide to invest $400. Now comes the big question — where do you put it?",
        choices: [
          { label: "A", text: "Put it all on TSLA — your friend loves it", consequence: "Concentrated bet on one stock. If TSLA drops 30%, you lose $120 overnight.", points: 5 },
          { label: "B", text: "Buy SPY (S&P 500 ETF)", consequence: "Instant diversification across 500 companies. One stock drops? Barely a blip.", points: 20, best: true },
          { label: "C", text: "Leave it in a savings account", consequence: "Safe but 0.5% interest barely beats nothing. Your $400 earns $2 a year.", points: 0 },
        ],
      },
      {
        situation: "One week later, SPY drops 8%. Your $400 is now worth $368. You check your phone and see red everywhere. You:",
        choices: [
          { label: "A", text: "Panic sell immediately", consequence: "You locked in your $32 loss. Markets recovered the next month.", points: -15 },
          { label: "B", text: "Buy more — it's on sale", consequence: "Smart! Buying dips is how long-term wealth is built. Warren Buffett approves.", points: 25, best: true },
          { label: "C", text: "Do nothing and wait", consequence: "Reasonable. Staying the course beats panic selling every time.", points: 10 },
        ],
      },
    ],
    resultLesson: "The stock market goes up and down short-term, but historically returns ~10% per year. Starting early is the single biggest advantage you have.",
    resultFact: "Your $400 invested at 16 could be worth $22,000 by the time you're 40 — without adding another penny.",
  },
  {
    id: "hot_tip",
    title: "Hot Tip",
    emoji: "\u{1F525}",
    difficulty: "Beginner",
    xp: 60,
    setup: "Your classmate says his dad works at a tech company and a huge announcement is coming next week. He says buy the stock NOW before it moons. You have $300 to invest.",
    decisions: [
      {
        situation: "Your classmate is hyped. He says he's putting in his whole allowance. \"Trust me bro, my dad literally works there.\" What do you do?",
        choices: [
          { label: "A", text: "Go all in — $300 on the stock", consequence: "This could be insider trading. Also, tips from friends are almost always wrong.", points: -20 },
          { label: "B", text: "Put in a small amount — $50, just in case", consequence: "Betting on rumors is still gambling, just with smaller stakes.", points: -5 },
          { label: "C", text: "Pass. Research the company yourself first", consequence: "Smart. Never invest based on tips. Do your own homework.", points: 25, best: true },
        ],
      },
      {
        situation: "You research the company. The P/E ratio is 200x (extremely expensive). Revenue is flat and earnings are declining. The stock is up 40% this month on hype alone. You:",
        choices: [
          { label: "A", text: "Buy anyway — the hype is real", consequence: "Overpaying for a declining business rarely ends well. Hype fades, fundamentals don't.", points: -10 },
          { label: "B", text: "Short sell it (bet it goes down)", consequence: "Too risky without experience. Short losses can be unlimited — the stock could keep rising.", points: -5 },
          { label: "C", text: "Skip it and buy an index fund instead", consequence: "The boring choice is often the right choice. Index funds beat most stock pickers.", points: 20, best: true },
        ],
      },
      {
        situation: "The \"announcement\" turns out to be a minor product update. Stock drops 15%. Your classmate lost $200. He's upset. You:",
        choices: [
          { label: "A", text: "Feel smug and tease him", consequence: "Unkind. Everyone makes investing mistakes — even professionals.", points: 0 },
          { label: "B", text: "Show him what you learned about P/E ratios", consequence: "Sharing knowledge helps everyone. Good investing friends make each other better.", points: 10, best: true },
          { label: "C", text: "Reconsider — maybe you should've bought it", consequence: "Don't second-guess good decisions based on outcomes. You made the right call.", points: -5 },
        ],
      },
    ],
    resultLesson: "95% of 'hot tips' lose money. Professional investors with full-time research teams still can't beat the index most years. Tips from friends almost never pan out.",
    resultFact: "Over any 15-year period, 92% of actively managed funds underperform the S&P 500. Your friend's dad probably can't beat the market either.",
  },
  {
    id: "compound_interest",
    title: "The Power of Compounding",
    emoji: "\u{1F4B0}",
    difficulty: "Beginner",
    xp: 60,
    setup: "You're 17 and have $1,000 saved. Your uncle offers you two deals: Deal A = $10,000 cash today. Deal B = 1 penny that doubles every day for 30 days. Which do you pick?",
    decisions: [
      {
        situation: "Your uncle is smiling. He knows something you might not. Deal A is $10,000 right now. Deal B is a single penny that doubles daily for 30 days. Pick your deal.",
        choices: [
          { label: "A", text: "Deal A — $10,000 is a lot of money!", consequence: "Seems smart... but you just left millions on the table.", points: 0 },
          { label: "B", text: "Deal B — the doubling penny", consequence: "You understand compound growth! 1 penny doubling for 30 days = $5.3 MILLION.", points: 25, best: true },
          { label: "C", text: "Ask your uncle more questions first", consequence: "Smart to dig deeper before deciding. Curiosity is an investor's superpower.", points: 15 },
        ],
        reveal: "1 penny doubling daily for 30 days = $5,368,709.12. That's the power of compounding — slow at first, then explosive.",
      },
      {
        situation: "You invest your $1,000 at 17 in an index fund returning 10%/year. Your friend waits until 27 to invest the same $1,000. At 65, who has more?",
        choices: [
          { label: "A", text: "You have more — 10 extra years of compounding", consequence: "Exactly right! You: ~$72,000. Your friend: ~$28,000. Same money, massive difference.", points: 25, best: true },
          { label: "B", text: "Your friend — he invested when markets were better", consequence: "Timing matters far less than TIME in the market. Starting early wins.", points: -5 },
          { label: "C", text: "About the same — it's only 10 years difference", consequence: "Compounding is exponential, not linear. Those 10 years are worth $44,000.", points: -5 },
        ],
      },
      {
        situation: "At 17 you can save $50/month. It's not much. Do you start now or wait until you earn more?",
        choices: [
          { label: "A", text: "Save $50/month starting now", consequence: "$50/month from 17 to 65 at 10% = $475,000! Starting small but early is incredibly powerful.", points: 25, best: true },
          { label: "B", text: "Wait until you get a real job at 22", consequence: "5 years late costs you nearly $200,000 in final value. Time is money — literally.", points: -10 },
          { label: "C", text: "Save $200/month starting at 25", consequence: "More money later barely beats less money earlier. 4x the savings, roughly similar result.", points: -5 },
        ],
      },
    ],
    resultLesson: "Compound interest is the most powerful force in investing. Starting early — even with tiny amounts — matters more than starting big later.",
    resultFact: "Warren Buffett made 99% of his $100+ billion wealth AFTER age 50, all because he started investing at age 11. Time is the secret ingredient.",
  },
  {
    id: "diversification",
    title: "Don't Put All Eggs in One Basket",
    emoji: "\u{1F95A}",
    difficulty: "Easy",
    xp: 75,
    setup: "You have $1,000 to invest. Your portfolio choice will determine your financial future. Choose your strategy wisely.",
    decisions: [
      {
        situation: "You've saved $1,000 and you're ready to invest. How do you split your money?",
        choices: [
          { label: "A", text: "$1,000 all into NVDA — it's been on fire", consequence: "One stock can drop 80% overnight on bad earnings. All-in bets can wipe you out.", points: -15 },
          { label: "B", text: "Split: $500 stocks, $300 bonds, $200 international", consequence: "Classic diversification. When stocks fall, bonds often rise. Smart risk management.", points: 20, best: true },
          { label: "C", text: "$1,000 into a total market index fund", consequence: "Instant diversification across 4,000+ companies. Simple and effective.", points: 25, best: true },
        ],
      },
      {
        situation: "NVDA drops 40% after a bad earnings report. If you went all-in, you just lost $400. What do you do now?",
        choices: [
          { label: "A", text: "Sell everything and put it in savings", consequence: "Selling after a crash locks in your losses. The worst time to sell is during panic.", points: -15 },
          { label: "B", text: "Hold — good companies recover", consequence: "True for quality companies. But concentration is still risky — what if it doesn't recover?", points: 10 },
          { label: "C", text: "Diversify now into an index fund", consequence: "Better late than never. Spreading your risk means no single stock can hurt you badly.", points: 15, best: true },
        ],
      },
      {
        situation: "Fast forward 2 years. A market crash hits. The diversified portfolio lost 15%. The concentrated single-stock portfolio lost 60%. Markets start recovering. Which investor sleeps better at night?",
        choices: [
          { label: "A", text: "The diversified investor", consequence: "Correct. Less volatility means it's easier to stay invested through tough times.", points: 20, best: true },
          { label: "B", text: "The single-stock investor — higher risk, higher reward", consequence: "Only if the stock recovers. Many stocks never return to their highs. Some go to zero.", points: -5 },
          { label: "C", text: "Neither — crashes are scary for everyone", consequence: "True, but diversified investors lose less and recover faster.", points: 5 },
        ],
      },
    ],
    resultLesson: "Diversification is the only free lunch in investing. It reduces your risk without reducing your expected return.",
    resultFact: "In 2022, Meta (Facebook) stock dropped 77%. If it was your only investment, you'd have lost over three-quarters of your money. The S&P 500 dropped only 19%.",
  },
  {
    id: "market_crash_2008",
    title: "Market Crash of 2008",
    emoji: "\u{1F4C9}",
    difficulty: "Medium",
    xp: 100,
    setup: "It's October 2008. The stock market has dropped 40%. Banks are failing. Lehman Brothers just collapsed. The news says the economy might not recover. You have $5,000 invested. It's now worth $3,000.",
    decisions: [
      {
        situation: "Your portfolio is down $2,000. CNN is showing panicking traders. Your parents are worried about their retirement. Every day the market drops more. What do you do?",
        choices: [
          { label: "A", text: "Sell everything — protect what's left", consequence: "You locked in a $2,000 loss. By 2013, markets fully recovered. By 2018, they doubled.", points: -25 },
          { label: "B", text: "Hold and do nothing", consequence: "Staying the course. Your $3,000 became $15,000 by 2018. Patience paid off.", points: 20, best: true },
          { label: "C", text: "Buy more — stocks are on sale", consequence: "Legendary move. Warren Buffett: 'Be greedy when others are fearful.' The best buying opportunity in a generation.", points: 30, best: true },
        ],
      },
      {
        situation: "It's now early 2009. Markets dropped ANOTHER 20%. Your $5,000 is now worth $2,000. Your parents are begging you to sell. The news says we might be entering a depression. You:",
        choices: [
          { label: "A", text: "Listen to your parents and sell", consequence: "The absolute bottom was March 2009. You would have sold at literally the worst possible time.", points: -20 },
          { label: "B", text: "Hold firm — markets have always recovered historically", consequence: "Every single recession in U.S. history was followed by a recovery. Every. Single. One.", points: 25, best: true },
          { label: "C", text: "Invest your $500 emergency fund too", consequence: "Never invest money you might need soon. Always keep an emergency fund separate!", points: -10 },
        ],
      },
      {
        situation: "It's 2013. Markets have fully recovered. If you held your original $5,000, it's now worth $7,500. If you bought more in 2008, it's worth even more. What lesson do you take away?",
        choices: [
          { label: "A", text: "I got lucky — it could have stayed down forever", consequence: "Pessimism sounds smart but optimism has always won long-term in the stock market.", points: 5 },
          { label: "B", text: "Time in the market beats timing the market", consequence: "This is one of the most proven principles in all of investing.", points: 25, best: true },
          { label: "C", text: "I should have sold in 2008 and bought back cheaper", consequence: "Almost nobody successfully times the market. Not even professionals.", points: 5 },
        ],
      },
    ],
    resultLesson: "The S&P 500 has recovered from EVERY crash in history: 1929, 1987, 2000, 2008, 2020. The average recovery time is about 2 years. Investors who held always came out ahead.",
    resultFact: "$10,000 invested in the S&P 500 in October 2008 (the scariest moment) would be worth over $60,000 today. Fear is the most expensive emotion in investing.",
  },
  {
    id: "inflation",
    title: "Inflation Buster",
    emoji: "\u{1F4C8}",
    difficulty: "Medium",
    xp: 100,
    setup: "Inflation is at 8%. Your $10,000 in a savings account earns 1% interest. You're effectively losing $700/year in purchasing power. Your money is shrinking while sitting still.",
    decisions: [
      {
        situation: "Your $10,000 buys less every month. A $5 coffee now costs $5.40. Gas is up 50%. Your savings account interest doesn't come close to keeping up. How do you beat inflation?",
        choices: [
          { label: "A", text: "Leave it in savings — at least it's safe", consequence: "Safe from market risk, yes. But inflation is silently stealing 7% a year. In 10 years, your $10,000 buys what $5,000 buys today.", points: -15 },
          { label: "B", text: "Invest in stocks (historically 10%/year)", consequence: "Stocks beat inflation over long periods. 10% returns minus 8% inflation = still growing.", points: 20, best: true },
          { label: "C", text: "Buy gold — the classic inflation hedge", consequence: "Gold can hedge inflation but has lower long-term returns than stocks. Better than cash though.", points: 10 },
        ],
      },
      {
        situation: "You invest in stocks. Inflation stays stubbornly high for 2 years. Not all sectors perform the same during inflation. Which companies tend to do well?",
        choices: [
          { label: "A", text: "Tech growth stocks", consequence: "Growth stocks struggle when inflation is high. Rising interest rates crush their valuations.", points: -5 },
          { label: "B", text: "Energy, commodities, real estate", consequence: "These sectors historically outperform during inflation. When prices rise, their products are worth more too.", points: 20, best: true },
          { label: "C", text: "Bonds", consequence: "Bonds lose value when inflation and interest rates rise. The worst asset class during high inflation.", points: -10 },
        ],
      },
      {
        situation: "The Federal Reserve raises interest rates aggressively to fight inflation. This causes stock markets to drop 20%. Everyone is panicking again. You:",
        choices: [
          { label: "A", text: "Panic — inflation AND falling stocks!", consequence: "High rates are temporary medicine. They tame inflation, then markets recover. Don't panic.", points: -10 },
          { label: "B", text: "Understand this is the Fed's plan and hold", consequence: "Exactly right. The Fed raised rates, inflation was tamed, and markets recovered 18 months later.", points: 25, best: true },
          { label: "C", text: "Switch entirely to bonds now", consequence: "Too late — bond prices already fell when rates rose. Chasing last year's strategy rarely works.", points: -5 },
        ],
      },
    ],
    resultLesson: "Inflation is a silent tax on your savings. Cash loses purchasing power every year. Historically, stocks are the best long-term inflation hedge, returning 7% above inflation.",
    resultFact: "$100 in 1970 would need to be $780 today to have the same purchasing power. If you'd invested it in the S&P 500 instead, it would be worth over $25,000.",
  },
  {
    id: "ipo_frenzy",
    title: "IPO Frenzy",
    emoji: "\u{1F680}",
    difficulty: "Medium",
    xp: 100,
    setup: "A hot new social app is going public (IPO) next week. Everyone at school is talking about it. The IPO price is $20/share. On day 1 of trading it jumps to $45. You have $500.",
    decisions: [
      {
        situation: "The stock opened at $20 and shot up to $45 in hours. Your group chat is going crazy. \"Get in NOW before it hits $100!\" Everyone seems to be buying. Do you buy at $45 on IPO day?",
        choices: [
          { label: "A", text: "Yes — buy 11 shares at $45", consequence: "Buying IPO hype at peak is how most retail investors lose money. The excitement is priced in.", points: -15 },
          { label: "B", text: "Wait and research the company first", consequence: "Smart. Most IPOs underperform the market in their first year. The hype fades.", points: 25, best: true },
          { label: "C", text: "Short sell it — IPO hype always fades", consequence: "Shorting is extremely risky. Hype can last longer than your wallet can survive.", points: -10 },
        ],
      },
      {
        situation: "You dig into the company's S-1 filing. The company has never made a profit. It loses $2 for every $1 of revenue. The P/E ratio is literally infinity (no earnings). User growth is slowing. Do you invest?",
        choices: [
          { label: "A", text: "Yes — growth companies don't need profits yet", consequence: "Some succeed (Amazon took 14 years). But most money-losing IPOs eventually crash.", points: -10 },
          { label: "B", text: "No — no path to profitability is a red flag", consequence: "Many famous IPOs crashed for this exact reason: WeWork, Peloton, Blue Apron, Snap (initially).", points: 20, best: true },
          { label: "C", text: "Invest a small amount just to participate", consequence: "Speculation with money you can afford to lose isn't the worst thing. Just know it's a gamble.", points: 5 },
        ],
      },
      {
        situation: "6 months later the stock is at $18 — below the IPO price. Your friend who bought at $45 lost 60% of his money. He's devastated. You:",
        choices: [
          { label: "A", text: "Feel vindicated and tell everyone you were right", consequence: "Humility is an investor's best trait. Being right doesn't mean being arrogant about it.", points: 5 },
          { label: "B", text: "Now buy at $18 — it might be undervalued", consequence: "Only if fundamentals improved. A falling stock isn't automatically a bargain. Research first.", points: 10 },
          { label: "C", text: "Realize IPO hype rarely lasts and update your strategy", consequence: "Exactly. The lesson isn't about this one stock — it's about not chasing hype ever.", points: 20, best: true },
        ],
      },
    ],
    resultLesson: "Most IPOs underperform the market in their first year. The excitement creates inflated prices that rarely last. By the time regular investors can buy, the easy money is gone.",
    resultFact: "A study of 8,000 IPOs found that the average IPO underperformed the market by 18% over 3 years. The house always wins — unless you're patient.",
  },
  {
    id: "side_hustle",
    title: "Side Hustle Empire",
    emoji: "\u{1F4BC}",
    difficulty: "Medium",
    xp: 100,
    setup: "You earn $800/month from your side hustle — mowing lawns and selling sneakers online. After expenses, you have $300/month free to invest. This is your financial blueprint moment.",
    decisions: [
      {
        situation: "You have $300/month to invest. This is real money you earned yourself. How you invest it now could determine your financial future. What's your strategy?",
        choices: [
          { label: "A", text: "Invest all $300/month into one hot stock", consequence: "Concentration risk. One bad earnings report and months of lawn-mowing money vanishes.", points: -10 },
          { label: "B", text: "$200 index funds, $50 bonds, $50 crypto", consequence: "Diversified with some speculation. The core is solid, the edges are fun.", points: 20, best: true },
          { label: "C", text: "Save 6 months expenses first, then invest the rest", consequence: "Emergency fund first is actually the most financially correct move. No investing without a safety net.", points: 25, best: true },
        ],
      },
      {
        situation: "Your side hustle takes off! Income doubles to $600/month free cash. You're making more than some adults. Do you:",
        choices: [
          { label: "A", text: "Lifestyle creep — upgrade phone, clothes, car", consequence: "Lifestyle inflation is how people stay broke despite earning more. The hedonic treadmill is real.", points: -15 },
          { label: "B", text: "Invest the extra $300/month too", consequence: "$300/month extra from 17 to 65 at 10% = an extra $1.4 million. Your future self thanks you.", points: 25, best: true },
          { label: "C", text: "Split — invest $200, enjoy $100", consequence: "Balance matters. Enjoying life while building wealth is sustainable and smart.", points: 15 },
        ],
      },
      {
        situation: "At 18, you have $5,000 invested and a Roth IRA. Life is good. Then someone online DMs you about a \"guaranteed\" investment returning 20% per year. They have testimonials, a slick website, everything. You:",
        choices: [
          { label: "A", text: "Invest $1,000 — 20% sounds amazing", consequence: "If it sounds too good to be true, it IS. This is a scam. Ponzi schemes all promise \"guaranteed\" high returns.", points: -25 },
          { label: "B", text: "Report it and ignore it", consequence: "Correct. No legitimate investment guarantees 20% returns. Warren Buffett averages 20% and he's the greatest ever.", points: 25, best: true },
          { label: "C", text: "Research it more before deciding", consequence: "Research would reveal the red flags: guaranteed returns, pressure to act fast, referral bonuses. All scam hallmarks.", points: 10 },
        ],
      },
    ],
    resultLesson: "You've completed all 8 scenarios. Most adults never learn these lessons. You understand compounding, diversification, inflation, market psychology, and scam detection. You're ahead of 90% of people your age.",
    resultFact: "If you invest just $300/month from age 17 to 65 at the stock market's historical average return, you'll retire with over $2.1 million. No inheritance needed. No lottery. Just consistency.",
    isFinalBoss: true,
  },
];
