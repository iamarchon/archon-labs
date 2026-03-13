export const LESSONS = [
  // ─── BEGINNER ─────────────────────────────────────────────
  {
    id: 1,
    title: "What is a Stock?",
    category: "Beginner",
    duration: "3 min read",
    xpReward: 20,
    unlocksScenario: "compound_interest",
    content: `When you buy a stock, you're buying a tiny piece of ownership in a real company. If you own one share of Apple, you literally own a fraction of every Apple Store, every iPhone design, and every dollar the company earns. Companies sell shares to raise money — when a company does this for the first time, it's called an IPO, or Initial Public Offering. That's the moment a private company becomes public and anyone can buy in.

As a stockholder, you get two main ways to make money. First, the stock price can go up — if you buy at $50 and it rises to $75, you've made $25 per share just by holding it. Second, some companies pay dividends, which are small cash payments sent to shareholders every quarter. Think of dividends like a thank-you bonus for being an owner. Not all companies pay them — fast-growing tech companies usually reinvest profits instead.

Owning stock also gives you voting rights. You get a say in big company decisions like who sits on the board of directors or whether the company should merge with another one. One share equals one vote. That's why people who own millions of shares have a lot of power over how a company is run.

The price of a stock changes every second the market is open, based on how many people want to buy it versus how many want to sell it. If a company announces incredible earnings or launches a hit product, more people want in and the price rises. If there's bad news, people sell and the price drops. Understanding this push and pull is the foundation of everything in investing.`,
    quiz: [
      {
        question: "What does owning a share of stock mean?",
        options: [
          "You own a small piece of the company",
          "You work for the company",
          "You loaned the company money",
          "You have a savings account with the company"
        ],
        correct: 0,
      },
      {
        question: "What is an IPO?",
        options: [
          "A type of dividend payment",
          "The first time a company sells shares to the public",
          "A government regulation on stocks",
          "An annual report filed by companies"
        ],
        correct: 1,
      },
      {
        question: "What is a dividend?",
        options: [
          "A fee you pay to buy stocks",
          "The price of a single share",
          "A cash payment companies send to shareholders",
          "A tax on stock market profits"
        ],
        correct: 2,
      },
    ],
  },
  {
    id: 2,
    title: "How Does the Stock Market Work?",
    category: "Beginner",
    duration: "3 min read",
    xpReward: 20,
    content: `The stock market is basically a giant marketplace where people buy and sell shares of companies. The two biggest exchanges in the United States are the NYSE (New York Stock Exchange) and NASDAQ. The NYSE is the classic one — it's been around since 1792 and has a physical trading floor on Wall Street. NASDAQ is fully electronic and is home to most big tech companies like Apple, Google, and Amazon.

When you place an order to buy a stock, the exchange matches you with someone who wants to sell at the same price. It happens in milliseconds. The market is open from 9:30 AM to 4:00 PM Eastern Time, Monday through Friday, and it's closed on major holidays. Outside those hours, you can sometimes trade in "pre-market" or "after-hours" sessions, but volume is lower and prices can be more unpredictable.

Stock prices move based on supply and demand — the same force that drives prices everywhere. If a ton of people want to buy Tesla stock but few want to sell, the price gets pushed up. If everyone is trying to dump a stock and nobody wants to buy, the price drops. It's like a giant auction running all day long, with millions of participants around the world.

The market also has indexes that track how groups of stocks are doing overall. The S&P 500 tracks the 500 largest U.S. companies, the Dow Jones follows 30 major companies, and the NASDAQ Composite covers thousands of stocks listed on the NASDAQ exchange. When people say "the market is up today," they usually mean one of these indexes went up.`,
    quiz: [
      {
        question: "What are the regular U.S. stock market hours?",
        options: [
          "8:00 AM to 5:00 PM ET",
          "9:30 AM to 4:00 PM ET",
          "10:00 AM to 3:00 PM ET",
          "24 hours a day, 7 days a week"
        ],
        correct: 1,
      },
      {
        question: "What is a stock exchange?",
        options: [
          "A place where you exchange currency",
          "A marketplace where stocks are bought and sold",
          "A government building that regulates banks",
          "A type of savings account"
        ],
        correct: 1,
      },
      {
        question: "Why do stock prices change?",
        options: [
          "The government sets new prices each day",
          "Companies decide their own stock price",
          "Supply and demand from buyers and sellers",
          "Prices only change once per month"
        ],
        correct: 2,
      },
    ],
  },
  {
    id: 3,
    title: "Reading a Stock Chart",
    category: "Beginner",
    duration: "3 min read",
    xpReward: 20,
    content: `Stock charts are your window into what a stock has been doing over time, and learning to read them is one of the most useful skills in investing. The X-axis (horizontal) shows time — it could be one day, one month, one year, or even decades. The Y-axis (vertical) shows the price. A line going up and to the right means the stock has been gaining value. Simple enough, right?

You'll encounter two main chart types. A line chart connects closing prices with a smooth line — it's clean and easy to read. A candlestick chart gives you way more information. Each "candle" shows four data points for a time period: the open price, close price, highest price, and lowest price. A green candle means the stock closed higher than it opened (buyers won that day). A red candle means it closed lower (sellers won). The "body" of the candle shows the open-to-close range, while the thin lines (called "wicks") show the high and low.

Trends are patterns that emerge on charts. An uptrend means the stock is making higher highs and higher lows — like climbing stairs. A downtrend is the opposite — lower highs and lower lows. A sideways trend means the price is bouncing between two levels without a clear direction. Spotting trends early can help you make better decisions about when to buy or sell.

Two important concepts are support and resistance. Support is a price level where a stock tends to stop falling — buyers step in because they think it's a good deal. Resistance is a price level where a stock tends to stop rising — sellers cash out because they think it's high enough. When a stock breaks through resistance, it often signals a big move up. When it falls below support, watch out — it could drop further.`,
    quiz: [
      {
        question: "What does a green candlestick mean?",
        options: [
          "The stock hit its all-time high",
          "The stock closed higher than it opened",
          "The stock paid a dividend",
          "The stock was added to the S&P 500"
        ],
        correct: 1,
      },
      {
        question: "What does the Y-axis on a stock chart represent?",
        options: [
          "Trading volume",
          "Time",
          "Price",
          "Number of shareholders"
        ],
        correct: 2,
      },
      {
        question: "What is an uptrend?",
        options: [
          "A stock that only goes up forever",
          "A pattern of higher highs and higher lows",
          "When a stock crosses its 200-day average",
          "A stock with high trading volume"
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 4,
    title: "What is Diversification?",
    category: "Beginner",
    duration: "3 min read",
    xpReward: 20,
    unlocksScenario: "diversification",
    content: `You've probably heard the saying "don't put all your eggs in one basket." That's diversification in a nutshell. If you put 100% of your money into a single stock and that company tanks, you lose everything. But if you spread your money across 20 different stocks in different industries, one bad pick won't destroy your whole portfolio. Diversification is the closest thing to a free lunch in investing.

The key is spreading your money across different sectors — categories of the economy like technology, healthcare, energy, consumer goods, and finance. These sectors don't all move in the same direction at the same time. When oil prices crash, energy stocks might drop but airline stocks could rise because fuel costs less. When interest rates go up, banks might do well while tech stocks struggle. By owning stocks in multiple sectors, you smooth out the bumps.

Correlation is the fancy term for how closely two investments move together. If two stocks always go up and down at the same time, they have high correlation — owning both doesn't really diversify you. What you want are stocks with low correlation, so when one zigs, the other zags. This is why financial advisors suggest mixing stocks with bonds, domestic with international, and large companies with small ones.

Diversification doesn't mean you'll never lose money — the whole market can drop during a crash. But it dramatically reduces the risk that any single investment wipes you out. Studies show that owning as few as 15 to 20 well-chosen stocks across different sectors can eliminate most of the risk that comes from individual companies. It's one of the simplest and most powerful strategies any investor can use.`,
    quiz: [
      {
        question: "Why should you diversify your portfolio?",
        options: [
          "To guarantee you'll make money every year",
          "To reduce risk by spreading investments across sectors",
          "Because it's required by law",
          "To pay lower taxes on gains"
        ],
        correct: 1,
      },
      {
        question: "What is a sector?",
        options: [
          "A single company's stock ticker",
          "A category of the economy like tech or healthcare",
          "A type of stock exchange",
          "The price range of a stock"
        ],
        correct: 1,
      },
      {
        question: "What does low correlation between two stocks mean?",
        options: [
          "Both stocks are cheap",
          "They tend to move in different directions",
          "They're in the same industry",
          "They always go up together"
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 5,
    title: "Risk vs Reward",
    category: "Beginner",
    duration: "3 min read",
    xpReward: 20,
    unlocksScenario: "hot_tip",
    content: `Here's a fundamental truth about investing: the potential for higher returns always comes with higher risk. A savings account at a bank is super safe — you'll never lose money — but it might only earn you 1-2% per year. Stocks, on the other hand, have returned about 10% per year on average over the past century, but in any given year they could drop 20%, 30%, or more. The extra return is your reward for accepting that uncertainty.

Volatility is how wildly a stock's price swings up and down. A stock that moves 5% a day is highly volatile. A stock that barely moves is low volatility. Volatile stocks can make you a lot of money fast, but they can also lose you a lot of money fast. Penny stocks and cryptocurrency are some of the most volatile things you can invest in. Blue-chip companies like Johnson & Johnson or Procter & Gamble tend to be much steadier.

Your risk tolerance is how much uncertainty you can handle without panicking and selling at the worst time. It depends on two things: your time horizon and your personality. If you're investing for 30 years from now, you can ride out market crashes because history shows markets always recover given enough time. If you need the money in six months, you can't afford to take big risks. Be honest with yourself — if a 30% drop would make you sell everything at 3 AM, you need a more conservative portfolio.

The classic lineup from least risky to most risky goes: cash, bonds, large-cap stocks, small-cap stocks, international stocks, cryptocurrency. Most financial advisors recommend a mix based on your age and goals. Younger investors can afford to take more risk because they have decades to recover from downturns. The most important thing isn't picking the "right" risk level — it's picking one you can actually stick with through good times and bad.`,
    quiz: [
      {
        question: "What is volatility?",
        options: [
          "The total value of a company",
          "How much a stock's price swings up and down",
          "The number of shares available to trade",
          "A company's annual revenue"
        ],
        correct: 1,
      },
      {
        question: "Which is generally riskier?",
        options: [
          "A savings account",
          "Government bonds",
          "Individual stocks",
          "All of these carry equal risk"
        ],
        correct: 2,
      },
      {
        question: "What is risk tolerance?",
        options: [
          "The maximum amount you can invest",
          "How much uncertainty you can handle without panic-selling",
          "The minimum return you'll accept",
          "A government rating of stock safety"
        ],
        correct: 1,
      },
    ],
  },

  // ─── INTERMEDIATE ─────────────────────────────────────────
  {
    id: 6,
    title: "What is a P/E Ratio?",
    category: "Intermediate",
    duration: "4 min read",
    xpReward: 35,
    content: `The P/E ratio, or price-to-earnings ratio, is one of the most widely used tools for figuring out whether a stock is cheap, expensive, or fairly priced. The formula is simple: take the stock price and divide it by the company's earnings per share (EPS). If a stock trades at $100 and earned $5 per share last year, its P/E ratio is 20. That means investors are willing to pay $20 for every $1 of earnings the company produces.

A high P/E ratio — say, 50 or above — usually means investors expect the company to grow fast in the future. They're paying a premium today because they believe earnings will catch up to the price. These are called growth stocks, and they include companies like Tesla and Amazon in their early years. The danger? If growth slows down, the stock can crash hard because people were paying for a future that didn't arrive.

A low P/E ratio — under 15 — often signals a value stock. These companies might be mature, growing slowly, but generating steady profits. Banks, utilities, and consumer goods companies often fall here. Value investors like Warren Buffett love finding quality companies with low P/E ratios because they believe the market is underpricing them. But watch out — sometimes a low P/E means the company is genuinely struggling and earnings are about to drop.

The P/E ratio has limitations you should know about. It doesn't work for companies that aren't profitable yet (you can't divide by zero or negative earnings). It also varies wildly across industries — tech companies often have P/E ratios of 30-40, while banks might sit at 10-12, so you should compare a stock's P/E to others in the same sector, not across the whole market. Think of P/E as one useful tool in your toolkit, not the only answer.`,
    quiz: [
      {
        question: "How do you calculate the P/E ratio?",
        options: [
          "Earnings divided by stock price",
          "Stock price divided by earnings per share",
          "Revenue divided by number of shares",
          "Stock price divided by revenue"
        ],
        correct: 1,
      },
      {
        question: "What does a high P/E ratio typically indicate?",
        options: [
          "The company is going bankrupt",
          "The stock pays large dividends",
          "Investors expect strong future growth",
          "The stock is undervalued"
        ],
        correct: 2,
      },
      {
        question: "What is a 'value stock'?",
        options: [
          "A stock that costs less than $10",
          "A stock with a low P/E ratio relative to its quality",
          "Any stock that Warren Buffett owns",
          "A stock that has never lost money"
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 7,
    title: "What Moves Stock Prices?",
    category: "Intermediate",
    duration: "4 min read",
    xpReward: 35,
    content: `Stock prices are driven by a mix of hard data and human emotion, and understanding both is key to becoming a smart investor. The biggest short-term mover is earnings reports — every quarter, public companies reveal how much money they made. If earnings beat what analysts expected, the stock usually jumps. If they miss, it usually drops. Some of the wildest single-day stock moves in history have happened right after earnings announcements.

Economic data plays a huge role too. GDP (Gross Domestic Product) tells you whether the overall economy is growing or shrinking. Inflation measures how fast prices are rising — too much inflation eats into company profits and squeezes consumers. Employment numbers show how healthy the job market is. All of this data gets released on a regular schedule, and traders watch it like hawks because it signals where the economy is headed.

The Federal Reserve (the "Fed") is arguably the single most powerful force in the stock market. The Fed controls interest rates — the cost of borrowing money. When the Fed lowers rates, borrowing becomes cheaper, companies invest more, consumers spend more, and stocks tend to rise. When the Fed raises rates to fight inflation, borrowing gets expensive, growth slows, and stocks often fall. A single sentence from the Fed chair can move the entire market by 2-3% in minutes.

Then there's market sentiment — the collective mood of millions of investors. Fear and greed are powerful forces. When people are optimistic, they buy aggressively and push prices above what the data supports. When they're scared, they sell everything including great companies at bargain prices. This is why legendary investor Warren Buffett says to "be fearful when others are greedy, and greedy when others are fearful." Understanding sentiment helps you avoid buying at the top and selling at the bottom.`,
    quiz: [
      {
        question: "What is the biggest short-term mover of individual stock prices?",
        options: [
          "The weather forecast",
          "Earnings reports",
          "Changes in the company logo",
          "The number of employees"
        ],
        correct: 1,
      },
      {
        question: "What does the Federal Reserve control that affects stocks?",
        options: [
          "Individual stock prices",
          "Company CEO salaries",
          "Interest rates",
          "The number of shares a company can issue"
        ],
        correct: 2,
      },
      {
        question: "What is market sentiment?",
        options: [
          "A technical indicator on stock charts",
          "The collective mood and emotions of investors",
          "A rating given by the SEC",
          "The average P/E ratio of all stocks"
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 8,
    title: "Sectors and Industries",
    category: "Intermediate",
    duration: "4 min read",
    xpReward: 35,
    content: `The stock market is organized into 11 sectors under a system called GICS (Global Industry Classification Standard). These sectors are: Information Technology, Healthcare, Financials, Consumer Discretionary, Consumer Staples, Energy, Industrials, Materials, Utilities, Real Estate, and Communication Services. Every public company belongs to one of these sectors, and understanding them helps you see the big picture of where your money is going.

Sectors are split into two big camps: defensive and cyclical. Defensive sectors — like Utilities, Healthcare, and Consumer Staples — sell things people need no matter what the economy is doing. You still pay your electric bill, buy medicine, and eat food during a recession. These stocks tend to hold up better during downturns but don't skyrocket during booms. Cyclical sectors — like Consumer Discretionary, Technology, and Industrials — sell things people buy more of when times are good. Think luxury goods, new gadgets, and construction projects. They soar during economic expansions but get hit harder during recessions.

Sector rotation is a strategy where investors move money between sectors based on where they think the economy is in its cycle. Early in a recovery, investors pile into cyclical stocks like tech and consumer discretionary. As the economy matures, they shift to financials and industrials. When a downturn looks likely, money flows into defensive sectors. Professional fund managers spend their entire careers trying to time these rotations — and even they get it wrong a lot.

Understanding sectors also helps you avoid accidental concentration. If you own Apple, Microsoft, Google, Nvidia, and Meta, you might think you're diversified because they're five different companies. But they're all in the same sector — Technology. If tech crashes, your whole portfolio crashes. True diversification means spreading across multiple sectors so no single part of the economy can sink you.`,
    quiz: [
      {
        question: "How many GICS sectors are there?",
        options: [
          "5",
          "8",
          "11",
          "15"
        ],
        correct: 2,
      },
      {
        question: "Which is a defensive sector?",
        options: [
          "Information Technology",
          "Consumer Discretionary",
          "Consumer Staples",
          "Industrials"
        ],
        correct: 2,
      },
      {
        question: "What is sector rotation?",
        options: [
          "When companies switch from one sector to another",
          "Moving investments between sectors based on economic cycles",
          "The government reclassifying sectors every year",
          "When all sectors go up at the same time"
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 9,
    title: "Bull vs Bear Markets",
    category: "Intermediate",
    duration: "4 min read",
    xpReward: 35,
    unlocksScenario: "market_crash_2008",
    content: `A bull market is when stock prices rise 20% or more from a recent low, and the overall mood is optimistic. During a bull market, the economy is usually growing, unemployment is low, and companies are reporting strong profits. Investors feel confident and keep buying, which pushes prices even higher. The longest bull market in U.S. history ran from March 2009 to February 2020 — nearly 11 years where the S&P 500 went up over 400%.

A bear market is the opposite — a decline of 20% or more from a recent high. Bear markets happen when the economy slows, corporate earnings drop, and fear takes over. Investors rush to sell, driving prices lower, which scares more people into selling. It becomes a negative spiral. Bear markets feel terrible when you're in one, but here's the key stat: the average bear market lasts about 9 to 16 months, while the average bull market lasts about 3 to 5 years. Bulls are longer and stronger.

The hardest thing about bear markets is that they create the best buying opportunities. When stocks are on sale at 30-40% off, that's mathematically the best time to invest — you're getting the same companies at much lower prices. But it feels awful because the news is scary and everyone around you is panicking. The investors who build the most wealth over time are the ones who can keep buying through bear markets, or at least not sell in a panic.

Trying to time the market — selling before a crash and buying back at the bottom — is nearly impossible. Even professional fund managers rarely pull it off consistently. Studies show that if you missed just the 10 best trading days over a 20-year period, your returns would be cut in half. Most of those best days happen right in the middle of bear markets. The simple strategy of investing regularly regardless of market conditions, called "staying the course," beats most market-timing strategies over the long run.`,
    quiz: [
      {
        question: "What defines a bull market?",
        options: [
          "A market where only tech stocks go up",
          "A rise of 20% or more from a recent low",
          "Any day the stock market closes higher",
          "A market controlled by large institutions"
        ],
        correct: 1,
      },
      {
        question: "What defines a bear market?",
        options: [
          "A single day where stocks drop sharply",
          "A market with very low trading volume",
          "A decline of 20% or more from a recent high",
          "When interest rates go above 5%"
        ],
        correct: 2,
      },
      {
        question: "How long does the average bear market last?",
        options: [
          "About 1 to 2 weeks",
          "About 9 to 16 months",
          "About 5 years",
          "They last until the government intervenes"
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 10,
    title: "Reading Earnings Reports",
    category: "Intermediate",
    duration: "4 min read",
    xpReward: 35,
    content: `Every publicly traded company is required to report its financial results every quarter, and these earnings reports are the single most important documents in investing. The headline number everyone watches is EPS — earnings per share. It tells you how much profit the company made for each share of stock. If a company earned $1 billion and has 500 million shares outstanding, its EPS is $2.00. Analysts make predictions before the report, and the stock's reaction depends on whether the actual number beats or misses those predictions.

Revenue and profit are two different things and you need to understand both. Revenue (also called "top line" or sales) is the total money coming in the door. Profit (also called "bottom line" or net income) is what's left after paying all expenses — salaries, rent, materials, taxes, everything. A company can have huge revenue growth but still lose money if costs are growing even faster. Amazon did this for years — massive revenue, tiny profits — because they reinvested everything into growth. Investors were okay with it because they believed the profits would come eventually, and they did.

Guidance is arguably more important than the actual numbers. Guidance is the company's forecast for the next quarter or full year — essentially, management telling you what they expect going forward. A company can report amazing earnings but see its stock drop if it gives weak guidance for the future. The market is always forward-looking. It cares less about what already happened and more about what's going to happen. Pay close attention to what the CEO says on the earnings call about future plans, challenges, and expectations.

When earnings "beat" expectations, the stock usually goes up — but not always. Sometimes a beat is already priced in, meaning the stock rallied before the report because people expected good numbers. When earnings "miss," the stock usually drops, but again, context matters. A small miss with great guidance might only cause a tiny dip. A big miss with terrible guidance can cause a stock to crater 20% overnight. You can read all official earnings filings for free on SEC.gov under a company's 10-Q (quarterly) and 10-K (annual) reports.`,
    quiz: [
      {
        question: "What is EPS?",
        options: [
          "Estimated Price of Stock",
          "Earnings Per Share",
          "Exchange Price Standard",
          "Expected Profit Summary"
        ],
        correct: 1,
      },
      {
        question: "What is 'guidance' in an earnings report?",
        options: [
          "Advice from financial analysts to investors",
          "The company's forecast for future performance",
          "A government mandate on stock pricing",
          "Instructions for how to read the report"
        ],
        correct: 1,
      },
      {
        question: "What does it mean when a company 'beats' earnings?",
        options: [
          "Its stock price went up that day",
          "It reported higher earnings than analysts expected",
          "It earned more than its competitors",
          "It set a new all-time high stock price"
        ],
        correct: 1,
      },
    ],
  },

  // ─── ADVANCED ─────────────────────────────────────────────
  {
    id: 11,
    title: "Technical Analysis Basics",
    category: "Advanced",
    duration: "5 min read",
    xpReward: 50,
    unlocksScenario: "ipo_frenzy",
    content: `Technical analysis is the practice of using charts, patterns, and mathematical indicators to predict where a stock price might go next. Unlike fundamental analysis (which looks at a company's actual business), technical analysis only cares about price and volume data. The core idea is that all known information is already reflected in the price, and that price patterns tend to repeat because human psychology doesn't change. It's controversial — some investors swear by it, others call it astrology — but millions of traders use it every day.

Moving averages are the most fundamental technical tool. A 50-day moving average (50 MA) takes the average closing price over the last 50 trading days and plots it as a smooth line on the chart. The 200-day moving average does the same over 200 days. When the stock price is above its 200-day MA, it's generally in a long-term uptrend. When it's below, it's in a downtrend. A "golden cross" — when the 50-day MA crosses above the 200-day MA — is considered a strong bullish signal. A "death cross" is the opposite and signals trouble ahead.

The Relative Strength Index (RSI) is a momentum indicator that tells you if a stock is overbought or oversold. It ranges from 0 to 100. When RSI goes above 70, the stock may be overbought — it's run up too fast and could pull back. When RSI drops below 30, the stock may be oversold — it's been beaten down too much and could bounce. RSI doesn't tell you exactly when to buy or sell, but it flags when a move might be stretched too far. The MACD (Moving Average Convergence Divergence) is another popular indicator that shows the relationship between two moving averages and helps spot changes in momentum.

Here's the thing about technical analysis that makes it fascinating: it's partly a self-fulfilling prophecy. When millions of traders are all watching the same support level or moving average, they all tend to buy or sell at the same price — which actually makes the pattern work. It's not magic; it's crowd behavior. The best approach is to combine technical analysis with fundamental analysis. Use fundamentals to decide which stocks are worth owning, and use technicals to help time your entries and exits.`,
    quiz: [
      {
        question: "What does the 200-day moving average show?",
        options: [
          "The predicted price 200 days from now",
          "The average closing price over the last 200 trading days",
          "The highest price in the last 200 days",
          "The total shares traded in 200 days"
        ],
        correct: 1,
      },
      {
        question: "What does an RSI above 70 suggest?",
        options: [
          "The stock is oversold and could bounce",
          "The stock is trading below its moving average",
          "The stock may be overbought and could pull back",
          "The stock has low trading volume"
        ],
        correct: 2,
      },
      {
        question: "What is the MACD?",
        options: [
          "A type of stock exchange",
          "An indicator showing the relationship between two moving averages",
          "A government regulation on trading",
          "The maximum amount of daily change allowed"
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 12,
    title: "Dollar Cost Averaging",
    category: "Advanced",
    duration: "5 min read",
    xpReward: 50,
    content: `Dollar cost averaging (DCA) is one of the most powerful investing strategies ever discovered, and it's beautifully simple: you invest a fixed dollar amount into the same investment on a regular schedule — say, $100 every month into an S&P 500 index fund — regardless of whether the market is up, down, or sideways. You don't try to predict the market. You don't wait for a "good time" to invest. You just invest consistently, month after month, year after year.

The magic of DCA is that it automatically makes you buy more shares when prices are low and fewer shares when prices are high. If your $100 buys you 2 shares at $50, great. Next month the price drops to $25 and your $100 buys you 4 shares. The month after, the price recovers to $50 and your 6 total shares are now worth $300 — even though the stock is at the same price as when you started. Over time, your average cost per share ends up lower than the average price, which gives you a built-in advantage.

The biggest benefit of DCA is psychological. It removes the paralyzing question of "is now a good time to invest?" The answer is always "yes" because you're investing every month no matter what. This protects you from your own emotions — the temptation to dump money in when stocks are soaring (buying high) or to freeze up when stocks are crashing (missing the sale). Multiple academic studies have shown that DCA produces results very close to lump-sum investing, but with significantly less stress and anxiety.

Here's a concrete example that shows the power. If you invested $100 per month into the S&P 500 starting at age 15, by age 55 you'd have invested $48,000 of your own money. But with average historical returns of about 10% per year, your account would be worth roughly $640,000. That's the combined power of dollar cost averaging and compound interest. Starting early and being consistent matters far more than picking the "perfect" stock or timing the "perfect" entry point.`,
    quiz: [
      {
        question: "What is dollar cost averaging?",
        options: [
          "Buying stocks only when they hit a certain price",
          "Investing a fixed amount on a regular schedule regardless of price",
          "Splitting your money equally across all stocks in the market",
          "Selling stocks when they reach your target return"
        ],
        correct: 1,
      },
      {
        question: "What is the main benefit of DCA?",
        options: [
          "It guarantees a profit every year",
          "It eliminates all investment risk",
          "It removes emotional timing decisions and lowers average cost",
          "It only invests during bull markets"
        ],
        correct: 2,
      },
      {
        question: "What time horizon works best with DCA?",
        options: [
          "A few days of active trading",
          "Exactly one calendar year",
          "Long-term — years or decades of consistent investing",
          "Only during bear markets"
        ],
        correct: 2,
      },
    ],
  },
  {
    id: 13,
    title: "ETFs vs Individual Stocks",
    category: "Advanced",
    duration: "5 min read",
    xpReward: 50,
    content: `An ETF, or Exchange-Traded Fund, is like a basket that holds many different stocks bundled into a single investment you can buy and sell just like a regular stock. Instead of buying 500 individual stocks to match the S&P 500, you can buy one share of SPY (the SPDR S&P 500 ETF) and instantly own a tiny piece of all 500 companies. ETFs exist for almost everything — specific sectors, countries, bonds, commodities, even themes like clean energy or artificial intelligence.

One of the most important numbers to look at with ETFs is the expense ratio — the annual fee the fund charges to manage the basket. It's expressed as a percentage of your investment. An expense ratio of 0.03% means you pay $3 per year for every $10,000 invested. That's incredibly cheap. Some actively managed funds charge 1% or more, which adds up to tens of thousands of dollars over a lifetime. The cheapest ETFs, like those from Vanguard and iShares, have expense ratios so low they're practically free. Always check the expense ratio before buying an ETF.

The most popular ETFs you'll hear about are SPY and VOO (both track the S&P 500), QQQ (tracks the NASDAQ-100, which is heavy on tech), and VTI (tracks the entire U.S. stock market). These give you instant diversification — you're not betting on one company's success but on the entire market or sector. The S&P 500 has returned about 10% annually over the past century, and most professional fund managers fail to beat it consistently. That's why even Warren Buffett has said most people should just buy a low-cost S&P 500 index fund.

So when should you pick individual stocks versus ETFs? Individual stocks give you the potential for higher returns — if you'd bought Apple in 2003, you'd have made 50x your money. But they also carry more risk — for every Apple, there's a Blockbuster that went to zero. ETFs sacrifice that home-run potential for consistency and safety. Most financial experts recommend making ETFs the core of your portfolio (maybe 70-80%) and using individual stocks for a smaller portion where you have strong conviction about specific companies.`,
    quiz: [
      {
        question: "What is an ETF?",
        options: [
          "A type of savings account",
          "A basket of investments bundled into one tradeable fund",
          "An electronic trading fee",
          "A government bond with a fixed return"
        ],
        correct: 1,
      },
      {
        question: "What is an expense ratio?",
        options: [
          "The cost to open a brokerage account",
          "The annual fee an ETF charges to manage the fund",
          "The tax rate on investment gains",
          "The ratio of expenses to revenue for a company"
        ],
        correct: 1,
      },
      {
        question: "What does SPY track?",
        options: [
          "The Dow Jones Industrial Average",
          "The NASDAQ-100",
          "The S&P 500",
          "International stocks only"
        ],
        correct: 2,
      },
    ],
  },
  {
    id: 14,
    title: "Short Selling",
    category: "Advanced",
    duration: "5 min read",
    xpReward: 50,
    content: `Short selling is one of the most fascinating and dangerous strategies in the stock market. It lets you make money when a stock goes DOWN instead of up. Here's how it works: you borrow shares from your broker, immediately sell them at today's price, and hope the price drops so you can buy them back cheaper and return them. If you short a stock at $100 and it falls to $60, you buy it back at $60 and pocket the $40 difference. You sold high and bought low — just in reverse order.

The terrifying catch with short selling is that your potential losses are theoretically unlimited. When you buy a stock normally, the worst that can happen is it goes to $0 and you lose 100% of your investment. But when you short a stock, the price can go up infinitely — it can double, triple, or go up 10x — and you're on the hook for all of it. If you short at $100 and the stock goes to $500, you've lost $400 per share, which is four times your original position. This is why short selling is considered one of the riskiest strategies in investing.

A short squeeze happens when a heavily shorted stock starts going up, forcing short sellers to buy back shares to limit their losses. But their buying drives the price up even more, which forces more short sellers to buy, creating an explosive upward spiral. The most famous example is GameStop in January 2021, when retail investors on Reddit noticed that hedge funds had shorted more shares than actually existed. They piled in, buying the stock aggressively, and the price went from about $20 to nearly $500 in days. Hedge funds lost billions of dollars.

Short selling is mostly used by institutional investors and hedge funds who do deep research to find overvalued or fraudulent companies. Some short sellers have actually exposed major corporate frauds — Enron and Wirecard were both flagged by short sellers before they collapsed. However, for individual investors, short selling is generally too risky. Most brokerages require a margin account and significant collateral, and the unlimited loss potential means a single bad trade can wipe out your entire portfolio. It's important to understand how it works, but proceed with extreme caution if you ever consider doing it.`,
    quiz: [
      {
        question: "What is short selling?",
        options: [
          "Selling stocks you've only owned for a short time",
          "Borrowing shares, selling them, and hoping to buy back lower",
          "Buying stocks in small quantities",
          "Trading stocks only during short market hours"
        ],
        correct: 1,
      },
      {
        question: "What is a short squeeze?",
        options: [
          "When a stock's trading is halted by the SEC",
          "When short sellers are forced to buy back shares as the price rises",
          "A brief period of low trading volume",
          "When the market closes early due to volatility"
        ],
        correct: 1,
      },
      {
        question: "What is the maximum possible loss when short selling?",
        options: [
          "100% of your investment",
          "50% of your investment",
          "Theoretically unlimited",
          "Limited to the original stock price"
        ],
        correct: 2,
      },
    ],
  },
  {
    id: 15,
    title: "Building a Long-Term Portfolio",
    category: "Advanced",
    duration: "5 min read",
    xpReward: 50,
    content: `Asset allocation is the single most important decision in building a portfolio — it determines roughly 90% of your long-term returns. The classic rule of thumb is "100 minus your age in stocks, the rest in bonds." So if you're 15, you'd put 85% in stocks and 15% in bonds. The logic is simple: when you're young, you have decades to recover from crashes, so you can afford to be aggressive. As you get older and closer to needing the money, you shift toward safer investments. This is a starting point, not a rigid rule — some modern advisors suggest "110 minus your age" since people are living longer.

Rebalancing is the maintenance your portfolio needs to stay on track. Over time, your winners will grow and become a bigger percentage of your portfolio than you intended, while your losers will shrink. If you started with 80% stocks and 20% bonds, a great year for stocks might shift you to 90/10 — now you're taking on more risk than planned. Rebalancing means selling some of what's grown and buying more of what's lagged to get back to your target allocation. Most investors rebalance once or twice a year, or whenever their allocation drifts more than 5% from the target.

Understanding tax-advantaged accounts can supercharge your wealth building, even if you can't open them yet. A Roth IRA lets you invest money you've already paid taxes on, and then ALL the growth is tax-free forever. If you contribute $6,500 per year starting at age 18 and earn 10% annually, by age 65 you'd have about $4.3 million — and you'd owe zero taxes on it when you withdraw. A 401(k) is similar but offered through employers, often with a company match that's literally free money. These accounts are the most powerful wealth-building tools available to regular people.

The math of starting early is staggering and it's the biggest advantage you have right now. If Person A invests $200 per month from age 15 to 25 (10 years) and then stops completely, and Person B invests $200 per month from age 25 to 65 (40 years), Person A ends up with MORE money at age 65 despite investing for only 10 years versus 40. This is compound interest — your returns earn their own returns, which earn their own returns, creating an exponential snowball effect. Albert Einstein reportedly called compound interest the eighth wonder of the world. The single best investing decision you can make is to start as early as possible, even with small amounts.`,
    quiz: [
      {
        question: "What is rebalancing?",
        options: [
          "Selling all your stocks and starting over",
          "Adjusting your portfolio back to your target allocation",
          "Moving all investments to a new brokerage",
          "Buying only the best-performing stocks each year"
        ],
        correct: 1,
      },
      {
        question: "What is the key benefit of a Roth IRA?",
        options: [
          "You never have to pay any taxes at all",
          "The government matches your contributions",
          "All growth is tax-free when you withdraw in retirement",
          "You can withdraw money anytime with no penalties"
        ],
        correct: 2,
      },
      {
        question: "Why is starting to invest early so powerful?",
        options: [
          "Young investors get lower trading fees",
          "Stocks always go up for young people",
          "Compound interest gives your returns more time to grow exponentially",
          "The government gives bonuses to young investors"
        ],
        correct: 2,
      },
    ],
  },
  {
    id: 16,
    title: "What is an ETF?",
    category: "Beginner",
    duration: "3 min read",
    xpReward: 20,
    unlocksScenario: "market_crash_2008",
    content: `An Exchange Traded Fund, or ETF, is a basket of stocks bundled into a single ticker that you can buy and sell on the stock market just like a regular share. Instead of picking individual companies one by one, you can buy one share of an ETF and instantly own a tiny piece of dozens or even hundreds of companies. Think of it like a sampler platter at a restaurant — instead of committing to one dish, you get a taste of everything.

ETFs and mutual funds might sound similar, but there's an important difference in how they trade. An ETF trades on the stock exchange throughout the day, just like Apple or Nike stock — the price changes every second the market is open, and you can buy or sell anytime. Mutual funds, on the other hand, only trade once per day after the market closes. Everyone who bought or sold that day gets the same end-of-day price. ETFs also tend to have lower fees than mutual funds, making them more cost-effective for most investors.

Some of the most popular ETFs are SPY, which tracks the S&P 500 (the 500 largest U.S. companies), QQQ, which tracks the Nasdaq-100 (heavy on tech companies like Apple, Microsoft, and Google), and VTI, which tracks the total U.S. stock market — basically every publicly traded company in America. These are great starting points for any investor because they give you broad exposure to the market in a single purchase.

ETFs are especially great for beginners because they offer instant diversification with very low fees. Instead of researching individual companies and risking everything on one stock, you can spread your money across the entire market. If one company in the ETF does badly, the others can make up for it. Warren Buffett himself has said that most people would be better off just buying a low-cost S&P 500 index fund — and that's essentially what SPY is.`,
    quiz: [
      {
        question: "What does ETF stand for?",
        options: [
          "Exchange Traded Fund",
          "Electronic Trading Format",
          "Equity Transfer Fund",
          "Enhanced Tax Filing"
        ],
        correct: 0,
      },
      {
        question: "Why are ETFs good for beginners?",
        options: [
          "Instant diversification with low fees",
          "They guarantee profits",
          "They only go up",
          "They pay the highest dividends"
        ],
        correct: 0,
      },
      {
        question: "Which of these is a broad market ETF?",
        options: [
          "SPY",
          "AAPL",
          "BRK.B",
          "GME"
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 17,
    title: "Index Funds & Passive Investing",
    category: "Beginner",
    duration: "4 min read",
    xpReward: 20,
    content: `A stock market index is a way to measure how a group of stocks is performing overall. The S&P 500, for example, tracks the 500 largest publicly traded companies in the United States — names like Apple, Microsoft, Amazon, and JPMorgan. The Dow Jones Industrial Average is older and more famous, but it only tracks 30 large companies. The Nasdaq Composite is heavily weighted toward technology companies. When people say "the market was up today," they're usually talking about one of these indexes.

Passive investing means buying a fund that simply mirrors an index, rather than trying to pick individual winning stocks. An S&P 500 index fund, for example, owns all 500 stocks in the same proportions as the index itself. Active investing is the opposite — a fund manager researches companies, makes predictions, and picks stocks they think will outperform. Active funds charge higher fees because you're paying for the manager's expertise and research team.

Here's the surprising truth: most active fund managers fail to beat the index over long periods. According to the SPIVA scorecard, which tracks this data, over 90% of actively managed funds underperform the S&P 500 over a 15-year period. That means the vast majority of professional stock pickers — with teams of analysts, expensive data, and decades of experience — do worse than a simple index fund that just buys everything.

The most famous example of this is Warren Buffett's million-dollar bet. In 2007, Buffett bet a hedge fund manager $1 million that a simple S&P 500 index fund would outperform a basket of hedge funds over 10 years. By 2017, the result wasn't even close — the index fund returned 125% while the hedge funds returned only about 36%. Buffett won decisively, proving that for most people, passive investing in low-cost index funds is the smartest strategy.`,
    quiz: [
      {
        question: "What is the S&P 500?",
        options: [
          "An index tracking the 500 largest US companies",
          "A stock that costs $500",
          "A type of savings account",
          "A government bond"
        ],
        correct: 0,
      },
      {
        question: "What does passive investing mean?",
        options: [
          "Buying an index fund instead of picking stocks",
          "Not checking your portfolio",
          "Only buying bonds",
          "Investing less than $100"
        ],
        correct: 0,
      },
      {
        question: "Who famously bet that an index fund would beat hedge funds?",
        options: [
          "Warren Buffett",
          "Elon Musk",
          "Jeff Bezos",
          "Mark Zuckerberg"
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 18,
    title: "What is Crypto?",
    category: "Intermediate",
    duration: "5 min read",
    xpReward: 35,
    unlocksScenario: "ipo_frenzy",
    content: `Cryptocurrency runs on a technology called blockchain, which is essentially a digital ledger that records every transaction ever made. Unlike a bank, where one company controls all the records, a blockchain is decentralized — thousands of computers around the world each keep a copy of the ledger and verify new transactions together. No single person, company, or government controls it. This is what makes crypto fundamentally different from traditional money or stocks.

Bitcoin and Ethereum are the two biggest cryptocurrencies, but they serve very different purposes. Bitcoin, created in 2009 by the mysterious Satoshi Nakamoto, is often called "digital gold" — it's designed to be a store of value with a fixed supply of 21 million coins that will ever exist. Ethereum, launched in 2015, is more like a platform — it lets developers build applications on top of its blockchain, from digital art (NFTs) to decentralized finance (DeFi) tools. Think of Bitcoin as digital gold you hold, and Ethereum as a digital operating system.

Crypto is dramatically more volatile than stocks, and it's important to understand why. Crypto markets trade 24 hours a day, 7 days a week — there's no closing bell to cool things down. There are no company earnings or revenue to anchor the price to reality — crypto prices are driven almost entirely by sentiment, hype, and speculation. The total crypto market is also much smaller than the stock market, which means big trades can move prices much more. Bitcoin has dropped 50% or more multiple times in its history, only to recover and reach new highs. That kind of rollercoaster is normal in crypto but would be extraordinary for stocks.

There are real risks with crypto that every investor should understand. Unlike stocks, there's no company behind most cryptocurrencies — no CEO, no earnings reports, no board of directors. Regulation is still evolving, and governments could crack down at any time. Hacks and scams are common — billions of dollars have been stolen from crypto exchanges and DeFi protocols. Most financial experts suggest keeping crypto to a small portion of your portfolio — typically 1-5% at most — and only investing money you could afford to lose entirely.`,
    quiz: [
      {
        question: "What makes crypto different from stocks?",
        options: [
          "No company behind it and it trades 24/7",
          "It always goes up",
          "It's backed by the government",
          "It pays dividends"
        ],
        correct: 0,
      },
      {
        question: "What is Bitcoin often compared to?",
        options: [
          "Digital gold",
          "Digital cash",
          "Digital bonds",
          "Digital real estate"
        ],
        correct: 0,
      },
      {
        question: "What % of a portfolio do most experts suggest for crypto?",
        options: [
          "A small portion (1-5%)",
          "At least 50%",
          "All of it",
          "None ever"
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 19,
    title: "Understanding Bonds",
    category: "Intermediate",
    duration: "4 min read",
    xpReward: 35,
    unlocksScenario: "inflation",
    content: `A bond is essentially a loan that you make to a company or a government. When you buy a bond, you're lending your money for a set period of time, and in return, the borrower promises to pay you back the full amount (called the "face value" or "par value") plus regular interest payments along the way. The U.S. government issues Treasury bonds, which are considered some of the safest investments in the world because the government has never failed to pay its debts. Companies issue corporate bonds to raise money for expansion, new projects, or operations.

Bonds and stocks have very different risk profiles. Stocks represent ownership — you share in the company's profits and losses, and the price can swing wildly. Bonds represent debt — you're a lender, not an owner, and you get paid back before stockholders if a company goes bankrupt. This makes bonds generally safer than stocks, but the trade-off is lower returns. Over the long term, stocks have averaged about 10% annual returns while bonds have averaged about 4-5%. Bonds are like the tortoise in the race — slow and steady, but reliable.

Bonds and stocks often move in opposite directions, which is why they work so well together in a portfolio. When the economy is uncertain or a recession hits, investors tend to sell risky stocks and buy safe bonds — this is called a "flight to safety." The increased demand for bonds pushes their prices up. Conversely, when the economy is booming and everyone is optimistic, investors sell bonds to buy stocks, pushing bond prices down. This inverse relationship is one of the most important concepts in portfolio construction.

One of the trickiest things about bonds is how interest rates affect their prices — they move in opposite directions. When the Federal Reserve raises interest rates, new bonds are issued with higher rates, making existing bonds with lower rates less attractive. So existing bond prices fall. When rates drop, existing bonds with higher rates become more valuable, so their prices rise. This inverse relationship between rates and bond prices is crucial to understand. If you hold a bond to maturity, the price fluctuations don't matter — you'll get your full face value back. But if you need to sell early, interest rate changes can affect how much you get.`,
    quiz: [
      {
        question: "What is a bond?",
        options: [
          "A loan you make to a company or government",
          "A share of ownership in a company",
          "A type of cryptocurrency",
          "A savings account"
        ],
        correct: 0,
      },
      {
        question: "How do bonds compare to stocks in terms of risk?",
        options: [
          "Generally lower risk but lower returns",
          "Higher risk and higher returns",
          "Exactly the same risk",
          "No risk at all"
        ],
        correct: 0,
      },
      {
        question: "What happens to bond prices when interest rates rise?",
        options: [
          "Bond prices fall",
          "Bond prices rise",
          "Nothing changes",
          "Bonds expire"
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 20,
    title: "Building Your First Portfolio",
    category: "Advanced",
    duration: "5 min read",
    xpReward: 50,
    unlocksScenario: "side_hustle",
    content: `The classic 3-fund portfolio is one of the simplest and most effective investment strategies ever created. It consists of just three holdings: a U.S. stock index fund (like VTI), an international stock index fund (like VXUS), and a bond index fund (like BND). That's it. With just these three funds, you own a piece of virtually every publicly traded company in the world plus a cushion of bonds for stability. Many of the world's most successful investors have endorsed this approach because it provides maximum diversification with minimum complexity and fees.

How you split your money between stocks and bonds depends largely on your age and risk tolerance. A common guideline is the "110 minus your age" rule — subtract your age from 110 and put that percentage in stocks, with the rest in bonds. If you're 15, that means 95% stocks and 5% bonds. The logic is straightforward: when you're young, you have decades to ride out market crashes, so you can afford to be aggressive with more stocks. As you get older and closer to needing the money, you gradually shift toward bonds for stability. Within the stock portion, a typical split is about 60-70% U.S. and 30-40% international.

Rebalancing is the maintenance that keeps your portfolio on track. Let's say you start with 80% stocks and 20% bonds. After a great year for stocks, your allocation might drift to 90% stocks and 10% bonds — now you're taking on more risk than you planned. Rebalancing means selling some of the winners and buying more of the laggards to get back to your target percentages. Most experts recommend checking your allocation once or twice a year and rebalancing whenever it drifts more than 5% from your target. It feels counterintuitive to sell your winners, but it enforces the discipline of buying low and selling high.

Dollar cost averaging, or DCA, is the strategy of investing a fixed amount of money at regular intervals — say $50 every week or $200 every month — regardless of whether the market is up or down. When prices are high, your fixed amount buys fewer shares. When prices are low, it buys more shares. Over time, this averages out your purchase price and removes the impossible task of trying to time the market perfectly. Studies show that DCA reduces volatility in your portfolio and takes the emotion out of investing. Instead of agonizing over whether today is a good day to invest, you just invest consistently and let time do the heavy lifting.`,
    quiz: [
      {
        question: "What is the 3-fund portfolio?",
        options: [
          "US stocks, international stocks, and bonds",
          "Three different tech stocks",
          "Three cryptocurrencies",
          "Three savings accounts"
        ],
        correct: 0,
      },
      {
        question: "What is dollar cost averaging?",
        options: [
          "Investing a fixed amount regularly regardless of price",
          "Only buying when stocks are cheap",
          "Selling when prices double",
          "Putting all money in at once"
        ],
        correct: 0,
      },
      {
        question: "How often should you typically rebalance?",
        options: [
          "Once or twice per year",
          "Every day",
          "Every hour",
          "Never"
        ],
        correct: 0,
      },
    ],
  },
  // ─── DCA (Dollar Cost Averaging) ────────────────────────────
  {
    id: 21,
    title: "What is Dollar Cost Averaging?",
    category: "Beginner",
    duration: "3 min read",
    xpReward: 50,
    content: `Dollar Cost Averaging (DCA) is one of the simplest and most powerful investing strategies ever invented. The idea is beautifully simple: instead of trying to find the perfect moment to invest, you invest the same amount of money on a regular schedule — every week, every two weeks, or every month. Rain or shine, bull market or bear market, you keep investing.

Here's why it works: when prices are high, your fixed amount buys fewer shares. When prices are low, the same amount buys MORE shares. Over time, this means your average cost per share ends up lower than the average price of the stock. It's like a built-in discount that rewards consistency.

Let's say you invest $10 every week into a stock. Week 1, the stock is $100 — you get 0.10 shares. Week 2, it drops to $50 — you get 0.20 shares. Week 3, it's back to $100 — you get 0.10 shares. Your total: $30 spent, 0.40 shares owned. Your average cost? $75 per share. But the average PRICE of the stock was $83.33. You beat the average just by being consistent.

The biggest advantage of DCA isn't even mathematical — it's psychological. When the market crashes, most people panic and sell at the worst possible time. But if you have an auto-invest plan, you're BUYING during the crash, not selling. You're getting shares on sale while everyone else is running scared. This is exactly what Warren Buffett means when he says "be greedy when others are fearful."

DCA is especially powerful for young investors. You might not have thousands of dollars to invest at once, but $5 or $10 a week? That's totally doable. And because you're starting early, compound interest turns those small regular investments into serious wealth over decades. A teenager investing $10/week from age 15 to 65 at 10% average returns would have over $400,000 — from just $10 a week!`,
    quiz: [
      {
        question: "What is Dollar Cost Averaging?",
        options: [
          "Investing the same amount on a regular schedule",
          "Buying stocks only when they're cheap",
          "Putting all your money in at once",
          "Selling stocks every day"
        ],
        correct: 0,
      },
      {
        question: "When stock prices drop during DCA, what happens?",
        options: [
          "Your fixed amount buys MORE shares",
          "Your fixed amount buys fewer shares",
          "You should stop investing immediately",
          "Nothing changes"
        ],
        correct: 0,
      },
      {
        question: "Why is DCA good for young investors?",
        options: [
          "You can start with small amounts and build over time",
          "It guarantees you'll never lose money",
          "Stocks only go up for young people",
          "It works only with large amounts of money"
        ],
        correct: 0,
      },
    ],
  },
];
