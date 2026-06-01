'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   DATASET
═══════════════════════════════════════════════════════════════════════════ */
const STOCKS = [
  { symbol:'NVDA', name:'NVIDIA Corp',         sector:'Technology',   mcap:'3.52T',
    current:143.80,open:141.20,high:145.50,low:140.10,volume:412800000,
    signal:'buy',confidence:82,strength:'Strong',catalyst:'AI Capex Cycle',
    sellWindow:'Q2–Q3 2026', trend:'bull', y2025ret:171.2,
    // Valuation inputs
    fcfPerShare:2.20, fcfGrowth:42, wacc:9.5, termGrowth:3.0,
    fwdEPS:4.20, targetPE:36,
    // Scenarios (% from current)
    bearDn:28, bearProb:0.20, basePct:12, baseProb:0.50, bullUps:38, bullProb:0.30,
    // Monte Carlo
    sigma:52,
    // Factor scores (0-100)
    factors:{ momentum:88, value:32, quality:80, growth:95, risk:45 }
  },
  { symbol:'AAPL', name:'Apple Inc',            sector:'Technology',   mcap:'2.96T',
    current:194.50,open:192.80,high:196.20,low:192.10,volume:58300000,
    signal:'buy',confidence:74,strength:'Moderate',catalyst:'Services Growth',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:18.4,
    fcfPerShare:9.80, fcfGrowth:9, wacc:8.5, termGrowth:2.5,
    fwdEPS:7.45, targetPE:27,
    bearDn:15, bearProb:0.18, basePct:10, baseProb:0.54, bullUps:22, bullProb:0.28,
    sigma:24,
    factors:{ momentum:70, value:54, quality:92, growth:58, risk:76 }
  },
  { symbol:'MSFT', name:'Microsoft Corp',       sector:'Technology',   mcap:'3.14T',
    current:422.30,open:419.40,high:425.80,low:418.60,volume:22100000,
    signal:'buy',confidence:80,strength:'Strong',catalyst:'Azure + Copilot',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:14.2,
    fcfPerShare:15.80, fcfGrowth:14, wacc:8.5, termGrowth:2.5,
    fwdEPS:15.20, targetPE:30,
    bearDn:14, bearProb:0.16, basePct:13, baseProb:0.52, bullUps:24, bullProb:0.32,
    sigma:22,
    factors:{ momentum:74, value:50, quality:92, growth:72, risk:78 }
  },
  { symbol:'AMZN', name:'Amazon.com Inc',       sector:'Cons. Disc.',  mcap:'2.37T',
    current:224.10,open:221.50,high:226.30,low:220.80,volume:35700000,
    signal:'buy',confidence:77,strength:'Strong',catalyst:'AWS + Advertising',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:44.8,
    fcfPerShare:6.40, fcfGrowth:28, wacc:9.5, termGrowth:3.0,
    fwdEPS:5.80, targetPE:38,
    bearDn:20, bearProb:0.18, basePct:18, baseProb:0.52, bullUps:32, bullProb:0.30,
    sigma:28,
    factors:{ momentum:80, value:46, quality:82, growth:88, risk:68 }
  },
  { symbol:'GOOGL',name:'Alphabet Inc',         sector:'Technology',   mcap:'2.21T',
    current:178.60,open:176.30,high:180.10,low:175.90,volume:19400000,
    signal:'buy',confidence:71,strength:'Moderate',catalyst:'Gemini + Search',
    sellWindow:'Q2 2026', trend:'bull', y2025ret:26.5,
    fcfPerShare:7.50, fcfGrowth:16, wacc:9.0, termGrowth:2.5,
    fwdEPS:8.20, targetPE:23,
    bearDn:16, bearProb:0.18, basePct:14, baseProb:0.52, bullUps:26, bullProb:0.30,
    sigma:24,
    factors:{ momentum:76, value:60, quality:85, growth:74, risk:72 }
  },
  { symbol:'META', name:'Meta Platforms',       sector:'Technology',   mcap:'1.49T',
    current:588.40,open:582.70,high:594.20,low:580.30,volume:14200000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Ad Monetization',
    sellWindow:'Q1–Q2 2026', trend:'neut', y2025ret:65.3,
    fcfPerShare:22.00, fcfGrowth:18, wacc:9.5, termGrowth:2.5,
    fwdEPS:26.50, targetPE:23,
    bearDn:22, bearProb:0.22, basePct:8, baseProb:0.50, bullUps:20, bullProb:0.28,
    sigma:30,
    factors:{ momentum:62, value:56, quality:78, growth:60, risk:62 }
  },
  { symbol:'TSLA', name:'Tesla Inc',            sector:'Cons. Disc.',  mcap:'0.89T',
    current:276.80,open:280.30,high:283.10,low:272.40,volume:98600000,
    signal:'hold',confidence:52,strength:'Weak',catalyst:'FSD / Robotaxi',
    sellWindow:'Q4 2026', trend:'neut', y2025ret:-24.8,
    fcfPerShare:3.80, fcfGrowth:32, wacc:11.0, termGrowth:3.0,
    fwdEPS:4.20, targetPE:65,
    bearDn:40, bearProb:0.30, basePct:12, baseProb:0.45, bullUps:48, bullProb:0.25,
    sigma:65,
    factors:{ momentum:50, value:26, quality:55, growth:70, risk:30 }
  },
  { symbol:'AVGO', name:'Broadcom Inc',         sector:'Technology',   mcap:'0.91T',
    current:193.20,open:191.40,high:195.60,low:190.80,volume:18900000,
    signal:'buy',confidence:79,strength:'Strong',catalyst:'Custom AI Silicon',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:108.4,
    fcfPerShare:14.20, fcfGrowth:22, wacc:9.5, termGrowth:2.5,
    fwdEPS:16.40, targetPE:14,
    bearDn:20, bearProb:0.20, basePct:18, baseProb:0.50, bullUps:32, bullProb:0.30,
    sigma:34,
    factors:{ momentum:82, value:44, quality:84, growth:88, risk:64 }
  },
  { symbol:'BRK.B',name:'Berkshire Hathaway B', sector:'Financials',   mcap:'1.06T',
    current:458.90,open:456.30,high:462.10,low:455.70,volume:4200000,
    signal:'hold',confidence:62,strength:'Moderate',catalyst:'Value Stability',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:25.2,
    fcfPerShare:21.50, fcfGrowth:10, wacc:8.5, termGrowth:2.0,
    fwdEPS:18.20, targetPE:25,
    bearDn:10, bearProb:0.15, basePct:7, baseProb:0.57, bullUps:16, bullProb:0.28,
    sigma:16,
    factors:{ momentum:66, value:72, quality:88, growth:40, risk:83 }
  },
  { symbol:'JPM',  name:'JPMorgan Chase',       sector:'Financials',   mcap:'0.70T',
    current:244.70,open:242.10,high:247.30,low:241.80,volume:9800000,
    signal:'sell',confidence:63,strength:'Moderate',catalyst:'Rate Plateau',
    sellWindow:'Q1 2026', trend:'bear', y2025ret:43.7,
    fcfPerShare:19.80, fcfGrowth:8, wacc:10.0, termGrowth:2.0,
    fwdEPS:19.40, targetPE:13,
    bearDn:18, bearProb:0.28, basePct:5, baseProb:0.47, bullUps:15, bullProb:0.25,
    sigma:22,
    factors:{ momentum:46, value:70, quality:80, growth:36, risk:62 }
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   EXTENDED STOCK DATABASE  (STOCKS above + additional searchable stocks)
═══════════════════════════════════════════════════════════════════════════ */
const STOCK_DB = [
  ...STOCKS,
  { symbol:'AMD',  name:'Advanced Micro Devices', sector:'Technology',   mcap:'0.27T',
    current:163.40,open:160.80,high:165.90,low:159.20,volume:44200000,
    signal:'buy', confidence:72,strength:'Moderate',catalyst:'MI300 AI GPU',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:9.0,
    fcfPerShare:3.80,fcfGrowth:34,wacc:10.0,termGrowth:2.5,fwdEPS:5.20,targetPE:32,
    bearDn:32,bearProb:0.22,basePct:18,baseProb:0.50,bullUps:42,bullProb:0.28,sigma:48,
    factors:{momentum:72,value:40,quality:70,growth:88,risk:46}},
  { symbol:'INTC', name:'Intel Corporation',       sector:'Technology',   mcap:'0.09T',
    current:20.40, open:20.10, high:20.90, low:19.80, volume:62000000,
    signal:'hold',confidence:44,strength:'Weak',    catalyst:'Foundry Turnaround',
    sellWindow:'Q2 2026', trend:'bear', y2025ret:-52.0,
    fcfPerShare:0.80,fcfGrowth:5,wacc:10.5,termGrowth:2.0,fwdEPS:0.80,targetPE:18,
    bearDn:25,bearProb:0.35,basePct:5,baseProb:0.45,bullUps:28,bullProb:0.20,sigma:38,
    factors:{momentum:28,value:52,quality:40,growth:22,risk:35}},
  { symbol:'QCOM', name:'Qualcomm Inc',             sector:'Technology',   mcap:'0.16T',
    current:140.20,open:138.40,high:142.60,low:137.90,volume:8800000,
    signal:'hold',confidence:55,strength:'Moderate',catalyst:'Snapdragon AI',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-18.0,
    fcfPerShare:10.40,fcfGrowth:8,wacc:9.5,termGrowth:2.0,fwdEPS:11.20,targetPE:13,
    bearDn:15,bearProb:0.25,basePct:10,baseProb:0.50,bullUps:22,bullProb:0.25,sigma:26,
    factors:{momentum:50,value:68,quality:75,growth:45,risk:65}},
  { symbol:'ORCL', name:'Oracle Corporation',       sector:'Technology',   mcap:'0.54T',
    current:192.60,open:190.30,high:195.20,low:189.80,volume:7600000,
    signal:'buy', confidence:68,strength:'Moderate',catalyst:'Cloud DB Growth',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:68.0,
    fcfPerShare:7.20,fcfGrowth:14,wacc:9.0,termGrowth:2.0,fwdEPS:7.80,targetPE:26,
    bearDn:18,bearProb:0.20,basePct:12,baseProb:0.52,bullUps:28,bullProb:0.28,sigma:26,
    factors:{momentum:76,value:50,quality:78,growth:68,risk:62}},
  { symbol:'CRM',  name:'Salesforce Inc',           sector:'Technology',   mcap:'0.31T',
    current:320.80,open:317.50,high:324.20,low:315.90,volume:4200000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'Agentforce AI',
    sellWindow:'Q2–Q3 2026', trend:'neut', y2025ret:4.0,
    fcfPerShare:12.40,fcfGrowth:16,wacc:9.5,termGrowth:2.5,fwdEPS:11.20,targetPE:30,
    bearDn:20,bearProb:0.22,basePct:10,baseProb:0.52,bullUps:25,bullProb:0.26,sigma:28,
    factors:{momentum:58,value:46,quality:80,growth:65,risk:64}},
  { symbol:'NFLX', name:'Netflix Inc',              sector:'Comm. Svcs.', mcap:'0.43T',
    current:1018.30,open:1010.40,high:1026.80,low:1006.20,volume:2800000,
    signal:'buy', confidence:71,strength:'Moderate',catalyst:'Ad-Tier Scale',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:89.0,
    fcfPerShare:22.60,fcfGrowth:22,wacc:9.0,termGrowth:2.5,fwdEPS:24.80,targetPE:42,
    bearDn:20,bearProb:0.20,basePct:16,baseProb:0.52,bullUps:30,bullProb:0.28,sigma:32,
    factors:{momentum:78,value:36,quality:82,growth:78,risk:60}},
  { symbol:'V',    name:'Visa Inc',                 sector:'Financials',  mcap:'0.65T',
    current:340.20,open:338.10,high:343.60,low:336.80,volume:4100000,
    signal:'buy', confidence:75,strength:'Moderate',catalyst:'Payment Volume',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:24.0,
    fcfPerShare:16.80,fcfGrowth:12,wacc:8.5,termGrowth:2.5,fwdEPS:14.20,targetPE:25,
    bearDn:12,bearProb:0.16,basePct:12,baseProb:0.54,bullUps:22,bullProb:0.30,sigma:18,
    factors:{momentum:72,value:56,quality:92,growth:62,risk:80}},
  { symbol:'MA',   name:'Mastercard Inc',           sector:'Financials',  mcap:'0.54T',
    current:560.40,open:555.80,high:565.20,low:553.60,volume:2600000,
    signal:'buy', confidence:74,strength:'Moderate',catalyst:'Cross-border Spend',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:22.0,
    fcfPerShare:18.60,fcfGrowth:13,wacc:8.5,termGrowth:2.5,fwdEPS:16.40,targetPE:35,
    bearDn:12,bearProb:0.16,basePct:13,baseProb:0.54,bullUps:24,bullProb:0.30,sigma:18,
    factors:{momentum:74,value:52,quality:92,growth:64,risk:80}},
  { symbol:'BAC',  name:'Bank of America',          sector:'Financials',  mcap:'0.34T',
    current:44.20, open:43.60, high:44.80, low:43.30, volume:32000000,
    signal:'hold',confidence:55,strength:'Weak',    catalyst:'Rate Environment',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:38.0,
    fcfPerShare:3.40,fcfGrowth:6,wacc:10.5,termGrowth:2.0,fwdEPS:3.60,targetPE:12,
    bearDn:16,bearProb:0.25,basePct:6,baseProb:0.50,bullUps:14,bullProb:0.25,sigma:22,
    factors:{momentum:54,value:68,quality:70,growth:34,risk:58}},
  { symbol:'GS',   name:'Goldman Sachs',            sector:'Financials',  mcap:'0.22T',
    current:618.40,open:613.80,high:624.60,low:610.20,volume:2400000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'Investment Banking',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:48.0,
    fcfPerShare:28.40,fcfGrowth:8,wacc:10.5,termGrowth:2.0,fwdEPS:40.20,targetPE:15,
    bearDn:18,bearProb:0.24,basePct:7,baseProb:0.50,bullUps:16,bullProb:0.26,sigma:26,
    factors:{momentum:62,value:66,quality:76,growth:38,risk:60}},
  { symbol:'XOM',  name:'ExxonMobil Corp',          sector:'Energy',      mcap:'0.49T',
    current:114.60,open:113.20,high:116.20,low:112.80,volume:12200000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Permian Basin',
    sellWindow:'Q1–Q2 2026', trend:'neut', y2025ret:12.0,
    fcfPerShare:9.80,fcfGrowth:5,wacc:9.0,termGrowth:1.5,fwdEPS:9.20,targetPE:13,
    bearDn:14,bearProb:0.28,basePct:7,baseProb:0.48,bullUps:18,bullProb:0.24,sigma:22,
    factors:{momentum:54,value:72,quality:74,growth:30,risk:62}},
  { symbol:'CVX',  name:'Chevron Corporation',      sector:'Energy',      mcap:'0.27T',
    current:146.80,open:145.20,high:148.60,low:144.40,volume:9400000,
    signal:'hold',confidence:56,strength:'Moderate',catalyst:'Tengiz + Buybacks',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:-6.0,
    fcfPerShare:11.20,fcfGrowth:4,wacc:9.0,termGrowth:1.5,fwdEPS:11.80,targetPE:13,
    bearDn:14,bearProb:0.28,basePct:6,baseProb:0.48,bullUps:16,bullProb:0.24,sigma:22,
    factors:{momentum:50,value:72,quality:72,growth:28,risk:62}},
  { symbol:'JNJ',  name:'Johnson & Johnson',        sector:'Healthcare',  mcap:'0.38T',
    current:162.40,open:161.20,high:163.90,low:160.60,volume:6400000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'MedTech + Pharma',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-8.0,
    fcfPerShare:11.40,fcfGrowth:7,wacc:8.5,termGrowth:2.0,fwdEPS:10.20,targetPE:16,
    bearDn:10,bearProb:0.18,basePct:8,baseProb:0.55,bullUps:16,bullProb:0.27,sigma:14,
    factors:{momentum:46,value:70,quality:88,growth:38,risk:82}},
  { symbol:'PFE',  name:'Pfizer Inc',               sector:'Healthcare',  mcap:'0.13T',
    current:22.60, open:22.20, high:23.10, low:22.00, volume:28000000,
    signal:'sell',confidence:66,strength:'Moderate',catalyst:'Pipeline Reset',
    sellWindow:'Q1 2026', trend:'bear', y2025ret:-44.0,
    fcfPerShare:2.20,fcfGrowth:3,wacc:9.5,termGrowth:1.5,fwdEPS:2.40,targetPE:10,
    bearDn:16,bearProb:0.32,basePct:4,baseProb:0.45,bullUps:18,bullProb:0.23,sigma:22,
    factors:{momentum:32,value:70,quality:65,growth:28,risk:55}},
  { symbol:'UNH',  name:'UnitedHealth Group',       sector:'Healthcare',  mcap:'0.44T',
    current:484.20,open:480.60,high:488.80,low:479.40,volume:3200000,
    signal:'hold',confidence:56,strength:'Moderate',catalyst:'Medicare Advantage',
    sellWindow:'Q4 2026', trend:'neut', y2025ret:-18.0,
    fcfPerShare:24.80,fcfGrowth:10,wacc:9.0,termGrowth:2.0,fwdEPS:26.40,targetPE:20,
    bearDn:12,bearProb:0.22,basePct:8,baseProb:0.52,bullUps:18,bullProb:0.26,sigma:20,
    factors:{momentum:44,value:62,quality:86,growth:46,risk:72}},
  { symbol:'WMT',  name:'Walmart Inc',              sector:'Cons. Staples',mcap:'0.76T',
    current:94.60, open:93.80, high:95.40, low:93.20, volume:9200000,
    signal:'buy', confidence:67,strength:'Moderate',catalyst:'eCommerce + Ads',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:72.0,
    fcfPerShare:4.20,fcfGrowth:10,wacc:8.0,termGrowth:2.0,fwdEPS:3.10,targetPE:30,
    bearDn:8, bearProb:0.15,basePct:8,baseProb:0.57,bullUps:15,bullProb:0.28,sigma:14,
    factors:{momentum:72,value:50,quality:86,growth:52,risk:82}},
  { symbol:'COST', name:'Costco Wholesale',         sector:'Cons. Staples',mcap:'0.43T',
    current:970.20,open:964.60,high:978.40,low:961.80,volume:2200000,
    signal:'hold',confidence:65,strength:'Moderate',catalyst:'Membership Growth',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:42.0,
    fcfPerShare:22.40,fcfGrowth:10,wacc:8.5,termGrowth:2.0,fwdEPS:20.80,targetPE:46,
    bearDn:12,bearProb:0.18,basePct:10,baseProb:0.54,bullUps:18,bullProb:0.28,sigma:16,
    factors:{momentum:68,value:36,quality:90,growth:54,risk:80}},
  { symbol:'HD',   name:'Home Depot Inc',           sector:'Cons. Disc.', mcap:'0.39T',
    current:364.20,open:361.40,high:367.60,low:359.80,volume:2800000,
    signal:'hold',confidence:61,strength:'Moderate',catalyst:'Housing Recovery',
    sellWindow:'Q4 2026', trend:'neut', y2025ret:10.0,
    fcfPerShare:18.60,fcfGrowth:8,wacc:8.5,termGrowth:2.0,fwdEPS:16.40,targetPE:23,
    bearDn:14,bearProb:0.20,basePct:9,baseProb:0.52,bullUps:20,bullProb:0.28,sigma:18,
    factors:{momentum:58,value:56,quality:84,growth:44,risk:72}},
  { symbol:'PLTR', name:'Palantir Technologies',   sector:'Technology',   mcap:'0.27T',
    current:118.60,open:115.80,high:121.40,low:114.20,volume:62000000,
    signal:'buy', confidence:68,strength:'Moderate',catalyst:'AIP Gov Deals',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:340.0,
    fcfPerShare:0.80,fcfGrowth:38,wacc:12.0,termGrowth:3.0,fwdEPS:0.48,targetPE:240,
    bearDn:40,bearProb:0.28,basePct:22,baseProb:0.45,bullUps:55,bullProb:0.27,sigma:72,
    factors:{momentum:85,value:18,quality:65,growth:92,risk:32}},
  { symbol:'SNOW', name:'Snowflake Inc',            sector:'Technology',   mcap:'0.055T',
    current:160.40,open:157.80,high:163.20,low:156.40,volume:6200000,
    signal:'hold',confidence:55,strength:'Weak',    catalyst:'AI Data Cloud',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:-24.0,
    fcfPerShare:0.60,fcfGrowth:28,wacc:12.0,termGrowth:2.5,fwdEPS:1.20,targetPE:130,
    bearDn:35,bearProb:0.28,basePct:12,baseProb:0.45,bullUps:42,bullProb:0.27,sigma:55,
    factors:{momentum:48,value:22,quality:55,growth:82,risk:38}},
  { symbol:'SPOT', name:'Spotify Technology',      sector:'Comm. Svcs.', mcap:'0.10T',
    current:494.80,open:490.20,high:500.40,low:488.60,volume:1600000,
    signal:'buy', confidence:66,strength:'Moderate',catalyst:'Podcast + Audiobook',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:142.0,
    fcfPerShare:4.80,fcfGrowth:32,wacc:10.5,termGrowth:2.5,fwdEPS:8.20,targetPE:62,
    bearDn:28,bearProb:0.22,basePct:18,baseProb:0.50,bullUps:38,bullProb:0.28,sigma:42,
    factors:{momentum:78,value:30,quality:62,growth:88,risk:50}},
  { symbol:'DIS',  name:'Walt Disney Co',          sector:'Comm. Svcs.', mcap:'0.20T',
    current:112.40,open:111.20,high:114.20,low:110.40,volume:9800000,
    signal:'hold',confidence:52,strength:'Weak',    catalyst:'Streaming Profit',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:14.0,
    fcfPerShare:4.40,fcfGrowth:12,wacc:9.5,termGrowth:2.0,fwdEPS:5.60,targetPE:22,
    bearDn:18,bearProb:0.26,basePct:8,baseProb:0.48,bullUps:22,bullProb:0.26,sigma:26,
    factors:{momentum:50,value:54,quality:62,growth:50,risk:58}},
  { symbol:'TSMC', name:'Taiwan Semiconductor',    sector:'Technology',   mcap:'0.94T',
    current:178.40,open:176.20,high:180.60,low:175.40,volume:8400000,
    signal:'buy', confidence:76,strength:'Strong',  catalyst:'3nm / AI Chip Demand',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:98.0,
    fcfPerShare:9.60,fcfGrowth:20,wacc:9.5,termGrowth:2.5,fwdEPS:10.40,targetPE:18,
    bearDn:22,bearProb:0.20,basePct:15,baseProb:0.52,bullUps:32,bullProb:0.28,sigma:30,
    factors:{momentum:80,value:56,quality:82,growth:84,risk:54}},
  { symbol:'ARM',  name:'Arm Holdings',            sector:'Technology',   mcap:'0.19T',
    current:120.60,open:118.20,high:123.40,low:117.40,volume:7800000,
    signal:'buy', confidence:70,strength:'Moderate',catalyst:'AI Chip Architecture',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:88.0,
    fcfPerShare:1.80,fcfGrowth:30,wacc:11.0,termGrowth:3.0,fwdEPS:1.60,targetPE:80,
    bearDn:36,bearProb:0.24,basePct:20,baseProb:0.48,bullUps:48,bullProb:0.28,sigma:58,
    factors:{momentum:78,value:28,quality:72,growth:90,risk:42}},
  { symbol:'MU',   name:'Micron Technology',       sector:'Technology',   mcap:'0.12T',
    current:103.40,open:101.20,high:105.80,low:100.40,volume:22000000,
    signal:'buy', confidence:69,strength:'Moderate',catalyst:'HBM3 AI Memory',
    sellWindow:'Q2–Q3 2026', trend:'bull', y2025ret:34.0,
    fcfPerShare:2.40,fcfGrowth:42,wacc:10.5,termGrowth:2.5,fwdEPS:8.40,targetPE:14,
    bearDn:30,bearProb:0.24,basePct:22,baseProb:0.48,bullUps:42,bullProb:0.28,sigma:42,
    factors:{momentum:72,value:52,quality:65,growth:88,risk:48}},
  { symbol:'UBER', name:'Uber Technologies',       sector:'Cons. Disc.', mcap:'0.18T',
    current:82.40, open:81.20, high:84.20, low:80.60, volume:18000000,
    signal:'buy', confidence:68,strength:'Moderate',catalyst:'Autonomous Rides',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:22.0,
    fcfPerShare:2.40,fcfGrowth:28,wacc:11.0,termGrowth:3.0,fwdEPS:2.80,targetPE:32,
    bearDn:24,bearProb:0.22,basePct:18,baseProb:0.50,bullUps:36,bullProb:0.28,sigma:38,
    factors:{momentum:70,value:42,quality:62,growth:80,risk:52}},
  { symbol:'COIN', name:'Coinbase Global',         sector:'Financials',  mcap:'0.065T',
    current:252.40,open:248.60,high:258.20,low:246.80,volume:7600000,
    signal:'hold',confidence:52,strength:'Weak',    catalyst:'Crypto Regulation',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:38.0,
    fcfPerShare:3.80,fcfGrowth:20,wacc:14.0,termGrowth:3.0,fwdEPS:6.20,targetPE:42,
    bearDn:45,bearProb:0.30,basePct:15,baseProb:0.42,bullUps:60,bullProb:0.28,sigma:85,
    factors:{momentum:56,value:30,quality:48,growth:70,risk:26}},

  // ── Healthcare / Biopharma ────────────────────────────────────────────
  { symbol:'LLY',  name:'Eli Lilly & Co',          sector:'Healthcare',  mcap:'0.76T',
    current:800.40,open:793.20,high:808.60,low:790.80,volume:2800000,
    signal:'buy', confidence:78,strength:'Strong',  catalyst:'GLP-1 Obesity',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:32.0,
    fcfPerShare:8.40,fcfGrowth:38,wacc:9.0,termGrowth:3.0,fwdEPS:22.40,targetPE:40,
    bearDn:20,bearProb:0.18,basePct:18,baseProb:0.52,bullUps:35,bullProb:0.30,sigma:28,
    factors:{momentum:82,value:28,quality:86,growth:94,risk:58}},
  { symbol:'ABBV', name:'AbbVie Inc',               sector:'Healthcare',  mcap:'0.31T',
    current:178.60,open:176.80,high:180.40,low:175.20,volume:6200000,
    signal:'hold',confidence:62,strength:'Moderate',catalyst:'Skyrizi + Rinvoq',
    sellWindow:'Q2–Q3 2026', trend:'neut', y2025ret:8.0,
    fcfPerShare:11.20,fcfGrowth:9,wacc:9.0,termGrowth:2.0,fwdEPS:12.40,targetPE:15,
    bearDn:12,bearProb:0.22,basePct:8,baseProb:0.52,bullUps:18,bullProb:0.26,sigma:18,
    factors:{momentum:58,value:66,quality:78,growth:50,risk:70}},
  { symbol:'MRK',  name:'Merck & Co',               sector:'Healthcare',  mcap:'0.28T',
    current:111.40,open:109.80,high:113.20,low:108.60,volume:9400000,
    signal:'hold',confidence:59,strength:'Moderate',catalyst:'Keytruda Pipeline',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:-14.0,
    fcfPerShare:8.20,fcfGrowth:6,wacc:9.0,termGrowth:1.5,fwdEPS:9.40,targetPE:13,
    bearDn:14,bearProb:0.25,basePct:7,baseProb:0.50,bullUps:16,bullProb:0.25,sigma:18,
    factors:{momentum:44,value:68,quality:84,growth:42,risk:74}},
  { symbol:'TMO',  name:'Thermo Fisher Scientific', sector:'Healthcare',  mcap:'0.21T',
    current:534.20,open:529.60,high:540.40,low:527.20,volume:1800000,
    signal:'hold',confidence:63,strength:'Moderate',catalyst:'Lab Instruments',
    sellWindow:'Q4 2026', trend:'neut', y2025ret:-12.0,
    fcfPerShare:22.40,fcfGrowth:10,wacc:9.0,termGrowth:2.0,fwdEPS:22.80,targetPE:25,
    bearDn:14,bearProb:0.20,basePct:10,baseProb:0.53,bullUps:20,bullProb:0.27,sigma:20,
    factors:{momentum:48,value:56,quality:88,growth:52,risk:72}},
  { symbol:'AMGN', name:'Amgen Inc',                sector:'Healthcare',  mcap:'0.16T',
    current:272.40,open:269.80,high:276.20,low:268.40,volume:3200000,
    signal:'hold',confidence:57,strength:'Moderate',catalyst:'MariTide Obesity',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-4.0,
    fcfPerShare:18.40,fcfGrowth:7,wacc:9.5,termGrowth:2.0,fwdEPS:20.20,targetPE:15,
    bearDn:12,bearProb:0.22,basePct:7,baseProb:0.52,bullUps:18,bullProb:0.26,sigma:18,
    factors:{momentum:50,value:66,quality:80,growth:40,risk:72}},
  { symbol:'REGN', name:'Regeneron Pharma',         sector:'Healthcare',  mcap:'0.08T',
    current:724.80,open:718.40,high:732.60,low:715.20,volume:580000,
    signal:'buy', confidence:65,strength:'Moderate',catalyst:'Dupixent + Eylea',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:18.0,
    fcfPerShare:44.80,fcfGrowth:12,wacc:9.5,termGrowth:2.0,fwdEPS:46.20,targetPE:17,
    bearDn:16,bearProb:0.20,basePct:12,baseProb:0.52,bullUps:24,bullProb:0.28,sigma:22,
    factors:{momentum:64,value:58,quality:86,growth:56,risk:70}},
  { symbol:'VRTX', name:'Vertex Pharmaceuticals',   sector:'Healthcare',  mcap:'0.12T',
    current:462.40,open:457.80,high:468.20,low:455.60,volume:960000,
    signal:'buy', confidence:70,strength:'Moderate',catalyst:'CF Monopoly + Pain',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:22.0,
    fcfPerShare:22.60,fcfGrowth:16,wacc:9.5,termGrowth:2.5,fwdEPS:20.40,targetPE:26,
    bearDn:14,bearProb:0.18,basePct:14,baseProb:0.54,bullUps:26,bullProb:0.28,sigma:24,
    factors:{momentum:68,value:52,quality:88,growth:68,risk:72}},
  { symbol:'GILD', name:'Gilead Sciences',          sector:'Healthcare',  mcap:'0.13T',
    current:103.40,open:101.80,high:105.20,low:100.60,volume:5200000,
    signal:'hold',confidence:55,strength:'Moderate',catalyst:'HIV Lenacapavir',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:24.0,
    fcfPerShare:8.40,fcfGrowth:7,wacc:9.0,termGrowth:1.5,fwdEPS:8.60,targetPE:13,
    bearDn:12,bearProb:0.25,basePct:7,baseProb:0.50,bullUps:16,bullProb:0.25,sigma:16,
    factors:{momentum:60,value:72,quality:76,growth:38,risk:72}},
  { symbol:'ISRG', name:'Intuitive Surgical',       sector:'Healthcare',  mcap:'0.19T',
    current:538.20,open:532.40,high:544.60,low:529.80,volume:820000,
    signal:'buy', confidence:72,strength:'Moderate',catalyst:'da Vinci 5 Rollout',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:46.0,
    fcfPerShare:8.40,fcfGrowth:20,wacc:9.0,termGrowth:2.5,fwdEPS:8.20,targetPE:70,
    bearDn:18,bearProb:0.18,basePct:16,baseProb:0.53,bullUps:30,bullProb:0.29,sigma:26,
    factors:{momentum:74,value:30,quality:88,growth:76,risk:68}},
  { symbol:'MDT',  name:'Medtronic Plc',            sector:'Healthcare',  mcap:'0.11T',
    current:84.20, open:83.20, high:85.60, low:82.40, volume:7600000,
    signal:'hold',confidence:54,strength:'Weak',    catalyst:'Cardiac AI',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:-4.0,
    fcfPerShare:4.60,fcfGrowth:5,wacc:9.0,termGrowth:1.5,fwdEPS:5.40,targetPE:17,
    bearDn:12,bearProb:0.24,basePct:6,baseProb:0.51,bullUps:14,bullProb:0.25,sigma:16,
    factors:{momentum:44,value:66,quality:76,growth:34,risk:72}},
  { symbol:'ABT',  name:'Abbott Laboratories',      sector:'Healthcare',  mcap:'0.23T',
    current:131.40,open:129.80,high:133.20,low:128.80,volume:5200000,
    signal:'hold',confidence:61,strength:'Moderate',catalyst:'CGM + MedDevice',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:4.0,
    fcfPerShare:6.20,fcfGrowth:9,wacc:8.5,termGrowth:2.0,fwdEPS:5.60,targetPE:26,
    bearDn:10,bearProb:0.18,basePct:9,baseProb:0.54,bullUps:18,bullProb:0.28,sigma:16,
    factors:{momentum:58,value:58,quality:86,growth:48,risk:76}},

  // ── SaaS / Cloud Security ──────────────────────────────────────────────
  { symbol:'NOW',  name:'ServiceNow Inc',           sector:'Technology',  mcap:'0.21T',
    current:1018.60,open:1009.40,high:1028.80,low:1005.20,volume:1200000,
    signal:'buy', confidence:75,strength:'Strong',  catalyst:'AI Workflow Agents',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:44.0,
    fcfPerShare:18.40,fcfGrowth:24,wacc:10.0,termGrowth:3.0,fwdEPS:16.60,targetPE:66,
    bearDn:22,bearProb:0.18,basePct:18,baseProb:0.52,bullUps:34,bullProb:0.30,sigma:30,
    factors:{momentum:80,value:30,quality:84,growth:86,risk:58}},
  { symbol:'INTU', name:'Intuit Inc',               sector:'Technology',  mcap:'0.18T',
    current:624.80,open:618.40,high:632.20,low:614.80,volume:1600000,
    signal:'buy', confidence:69,strength:'Moderate',catalyst:'AI Financial Tools',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:16.0,
    fcfPerShare:18.80,fcfGrowth:16,wacc:9.5,termGrowth:2.5,fwdEPS:19.60,targetPE:34,
    bearDn:16,bearProb:0.18,basePct:13,baseProb:0.54,bullUps:24,bullProb:0.28,sigma:24,
    factors:{momentum:68,value:42,quality:84,growth:68,risk:62}},
  { symbol:'ADSK', name:'Autodesk Inc',             sector:'Technology',  mcap:'0.057T',
    current:264.80,open:261.60,high:268.40,low:259.80,volume:2400000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Cloud + AI Design',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:12.0,
    fcfPerShare:9.60,fcfGrowth:14,wacc:9.5,termGrowth:2.0,fwdEPS:8.80,targetPE:32,
    bearDn:18,bearProb:0.22,basePct:9,baseProb:0.50,bullUps:22,bullProb:0.28,sigma:26,
    factors:{momentum:56,value:46,quality:78,growth:58,risk:60}},
  { symbol:'WDAY', name:'Workday Inc',              sector:'Technology',  mcap:'0.065T',
    current:262.40,open:259.20,high:266.80,low:257.40,volume:2200000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'AI HR Platform',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:2.0,
    fcfPerShare:9.40,fcfGrowth:18,wacc:10.0,termGrowth:2.5,fwdEPS:8.60,targetPE:32,
    bearDn:20,bearProb:0.22,basePct:10,baseProb:0.50,bullUps:26,bullProb:0.28,sigma:28,
    factors:{momentum:54,value:42,quality:76,growth:68,risk:58}},
  { symbol:'TEAM', name:'Atlassian Corporation',    sector:'Technology',  mcap:'0.053T',
    current:208.40,open:205.20,high:212.60,low:203.80,volume:2400000,
    signal:'hold',confidence:57,strength:'Moderate',catalyst:'AI Teamwork',
    sellWindow:'Q2–Q3 2026', trend:'neut', y2025ret:-12.0,
    fcfPerShare:4.20,fcfGrowth:18,wacc:11.0,termGrowth:2.5,fwdEPS:3.60,targetPE:58,
    bearDn:26,bearProb:0.26,basePct:10,baseProb:0.48,bullUps:32,bullProb:0.26,sigma:34,
    factors:{momentum:48,value:36,quality:68,growth:72,risk:52}},
  { symbol:'PANW', name:'Palo Alto Networks',       sector:'Technology',  mcap:'0.12T',
    current:192.60,open:189.80,high:196.40,low:188.20,volume:4800000,
    signal:'buy', confidence:71,strength:'Moderate',catalyst:'Platformization',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:6.0,
    fcfPerShare:4.60,fcfGrowth:24,wacc:10.5,termGrowth:2.5,fwdEPS:2.60,targetPE:72,
    bearDn:24,bearProb:0.20,basePct:14,baseProb:0.52,bullUps:32,bullProb:0.28,sigma:32,
    factors:{momentum:68,value:30,quality:76,growth:80,risk:54}},
  { symbol:'CRWD', name:'CrowdStrike Holdings',     sector:'Technology',  mcap:'0.094T',
    current:382.40,open:377.60,high:388.20,low:375.40,volume:3200000,
    signal:'buy', confidence:73,strength:'Moderate',catalyst:'Falcon Platform',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:60.0,
    fcfPerShare:3.80,fcfGrowth:34,wacc:11.0,termGrowth:3.0,fwdEPS:4.60,targetPE:84,
    bearDn:30,bearProb:0.22,basePct:20,baseProb:0.50,bullUps:42,bullProb:0.28,sigma:40,
    factors:{momentum:76,value:22,quality:72,growth:88,risk:48}},
  { symbol:'ZS',   name:'Zscaler Inc',              sector:'Technology',  mcap:'0.029T',
    current:196.40,open:193.20,high:200.20,low:191.60,volume:2800000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Zero Trust SASE',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-10.0,
    fcfPerShare:2.60,fcfGrowth:28,wacc:12.0,termGrowth:3.0,fwdEPS:2.40,targetPE:82,
    bearDn:30,bearProb:0.24,basePct:14,baseProb:0.48,bullUps:36,bullProb:0.28,sigma:42,
    factors:{momentum:52,value:24,quality:68,growth:82,risk:46}},
  { symbol:'NET',  name:'Cloudflare Inc',           sector:'Technology',  mcap:'0.037T',
    current:112.60,open:110.20,high:115.40,low:108.80,volume:6400000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'AI Security Edge',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:22.0,
    fcfPerShare:1.00,fcfGrowth:32,wacc:12.0,termGrowth:3.0,fwdEPS:0.60,targetPE:188,
    bearDn:32,bearProb:0.24,basePct:16,baseProb:0.48,bullUps:42,bullProb:0.28,sigma:46,
    factors:{momentum:62,value:20,quality:62,growth:86,risk:42}},
  { symbol:'DDOG', name:'Datadog Inc',              sector:'Technology',  mcap:'0.044T',
    current:138.40,open:135.80,high:141.60,low:134.20,volume:3800000,
    signal:'buy', confidence:66,strength:'Moderate',catalyst:'AI Observability',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:26.0,
    fcfPerShare:2.20,fcfGrowth:26,wacc:11.5,termGrowth:3.0,fwdEPS:1.80,targetPE:80,
    bearDn:28,bearProb:0.22,basePct:18,baseProb:0.50,bullUps:40,bullProb:0.28,sigma:40,
    factors:{momentum:68,value:26,quality:70,growth:84,risk:48}},

  // ── eCommerce ──────────────────────────────────────────────────────────
  { symbol:'SHOP', name:'Shopify Inc',              sector:'Technology',  mcap:'0.14T',
    current:111.40,open:109.20,high:114.20,low:108.40,volume:8400000,
    signal:'hold',confidence:62,strength:'Moderate',catalyst:'Merchant AI Tools',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:30.0,
    fcfPerShare:1.80,fcfGrowth:30,wacc:11.0,termGrowth:3.0,fwdEPS:1.60,targetPE:72,
    bearDn:28,bearProb:0.24,basePct:14,baseProb:0.50,bullUps:36,bullProb:0.26,sigma:42,
    factors:{momentum:64,value:28,quality:62,growth:82,risk:48}},
  { symbol:'MELI', name:'MercadoLibre Inc',         sector:'Cons. Disc.', mcap:'0.095T',
    current:1876.40,open:1858.20,high:1896.80,low:1844.60,volume:480000,
    signal:'buy', confidence:72,strength:'Moderate',catalyst:'LatAm eCommerce',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:42.0,
    fcfPerShare:42.40,fcfGrowth:28,wacc:11.0,termGrowth:3.0,fwdEPS:52.40,targetPE:38,
    bearDn:22,bearProb:0.20,basePct:18,baseProb:0.52,bullUps:36,bullProb:0.28,sigma:34,
    factors:{momentum:74,value:40,quality:72,growth:88,risk:52}},

  // ── Semiconductor Equipment ────────────────────────────────────────────
  { symbol:'ASML', name:'ASML Holding',             sector:'Technology',  mcap:'0.27T',
    current:684.20,open:677.40,high:692.80,low:673.60,volume:1400000,
    signal:'buy', confidence:74,strength:'Strong',  catalyst:'EUV Monopoly',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:6.0,
    fcfPerShare:16.80,fcfGrowth:18,wacc:9.0,termGrowth:2.5,fwdEPS:28.40,targetPE:26,
    bearDn:20,bearProb:0.20,basePct:16,baseProb:0.52,bullUps:30,bullProb:0.28,sigma:28,
    factors:{momentum:70,value:46,quality:84,growth:76,risk:62}},
  { symbol:'TXN',  name:'Texas Instruments',        sector:'Technology',  mcap:'0.17T',
    current:182.40,open:180.20,high:185.40,low:178.80,volume:4800000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Analog Cycle Recovery',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-4.0,
    fcfPerShare:5.20,fcfGrowth:10,wacc:9.0,termGrowth:2.0,fwdEPS:5.80,targetPE:34,
    bearDn:14,bearProb:0.22,basePct:8,baseProb:0.52,bullUps:18,bullProb:0.26,sigma:20,
    factors:{momentum:52,value:56,quality:82,growth:42,risk:72}},
  { symbol:'AMAT', name:'Applied Materials',        sector:'Technology',  mcap:'0.13T',
    current:152.40,open:149.80,high:155.60,low:148.40,volume:6800000,
    signal:'buy', confidence:68,strength:'Moderate',catalyst:'Advanced Node Spend',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:12.0,
    fcfPerShare:8.60,fcfGrowth:16,wacc:9.5,termGrowth:2.5,fwdEPS:9.20,targetPE:18,
    bearDn:20,bearProb:0.22,basePct:14,baseProb:0.50,bullUps:28,bullProb:0.28,sigma:30,
    factors:{momentum:68,value:54,quality:78,growth:68,risk:58}},
  { symbol:'LRCX', name:'Lam Research Corp',        sector:'Technology',  mcap:'0.096T',
    current:842.40,open:831.60,high:854.80,low:828.20,volume:1800000,
    signal:'buy', confidence:70,strength:'Moderate',catalyst:'NAND Recovery',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:22.0,
    fcfPerShare:36.40,fcfGrowth:18,wacc:9.5,termGrowth:2.5,fwdEPS:36.60,targetPE:24,
    bearDn:22,bearProb:0.22,basePct:16,baseProb:0.50,bullUps:30,bullProb:0.28,sigma:32,
    factors:{momentum:70,value:54,quality:80,growth:70,risk:58}},
  { symbol:'KLAC', name:'KLA Corporation',          sector:'Technology',  mcap:'0.094T',
    current:742.40,open:733.80,high:752.60,low:729.40,volume:1200000,
    signal:'buy', confidence:69,strength:'Moderate',catalyst:'Process Control',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:16.0,
    fcfPerShare:32.80,fcfGrowth:16,wacc:9.5,termGrowth:2.5,fwdEPS:32.40,targetPE:24,
    bearDn:20,bearProb:0.20,basePct:14,baseProb:0.52,bullUps:28,bullProb:0.28,sigma:28,
    factors:{momentum:70,value:54,quality:82,growth:68,risk:60}},
  { symbol:'MRVL', name:'Marvell Technology',       sector:'Technology',  mcap:'0.064T',
    current:76.40, open:74.80, high:78.20, low:73.60, volume:18000000,
    signal:'buy', confidence:72,strength:'Moderate',catalyst:'Custom AI ASICs',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:68.0,
    fcfPerShare:1.60,fcfGrowth:42,wacc:10.5,termGrowth:3.0,fwdEPS:2.20,targetPE:36,
    bearDn:28,bearProb:0.22,basePct:22,baseProb:0.50,bullUps:46,bullProb:0.28,sigma:46,
    factors:{momentum:76,value:36,quality:68,growth:92,risk:44}},

  // ── Financials ─────────────────────────────────────────────────────────
  { symbol:'AXP',  name:'American Express Co',      sector:'Financials',  mcap:'0.22T',
    current:296.40,open:293.20,high:300.60,low:291.20,volume:2800000,
    signal:'buy', confidence:67,strength:'Moderate',catalyst:'Premium Spend',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:62.0,
    fcfPerShare:16.40,fcfGrowth:12,wacc:9.5,termGrowth:2.0,fwdEPS:16.80,targetPE:19,
    bearDn:14,bearProb:0.20,basePct:10,baseProb:0.52,bullUps:22,bullProb:0.28,sigma:22,
    factors:{momentum:70,value:62,quality:82,growth:56,risk:64}},
  { symbol:'BLK',  name:'BlackRock Inc',            sector:'Financials',  mcap:'0.13T',
    current:1016.40,open:1006.80,high:1028.60,low:1003.40,volume:640000,
    signal:'buy', confidence:68,strength:'Moderate',catalyst:'ETF + Private Markets',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:28.0,
    fcfPerShare:52.40,fcfGrowth:11,wacc:9.5,termGrowth:2.0,fwdEPS:48.20,targetPE:22,
    bearDn:14,bearProb:0.18,basePct:10,baseProb:0.54,bullUps:20,bullProb:0.28,sigma:20,
    factors:{momentum:68,value:56,quality:84,growth:50,risk:68}},
  { symbol:'SCHW', name:'Charles Schwab Corp',      sector:'Financials',  mcap:'0.14T',
    current:77.40, open:76.20, high:78.80, low:75.60, volume:9800000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Rate Normalization',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:12.0,
    fcfPerShare:4.20,fcfGrowth:15,wacc:10.0,termGrowth:2.0,fwdEPS:4.60,targetPE:18,
    bearDn:16,bearProb:0.22,basePct:8,baseProb:0.52,bullUps:18,bullProb:0.26,sigma:24,
    factors:{momentum:58,value:64,quality:72,growth:44,risk:60}},
  { symbol:'WFC',  name:'Wells Fargo & Co',         sector:'Financials',  mcap:'0.24T',
    current:72.40, open:71.20, high:73.80, low:70.40, volume:16000000,
    signal:'hold',confidence:57,strength:'Moderate',catalyst:'Asset Cap Lift',
    sellWindow:'Q2–Q3 2026', trend:'neut', y2025ret:52.0,
    fcfPerShare:6.60,fcfGrowth:8,wacc:10.5,termGrowth:2.0,fwdEPS:6.40,targetPE:12,
    bearDn:16,bearProb:0.24,basePct:7,baseProb:0.50,bullUps:16,bullProb:0.26,sigma:24,
    factors:{momentum:58,value:68,quality:68,growth:36,risk:58}},
  { symbol:'C',    name:'Citigroup Inc',            sector:'Financials',  mcap:'0.12T',
    current:64.40, open:63.20, high:65.60, low:62.40, volume:14400000,
    signal:'hold',confidence:54,strength:'Moderate',catalyst:'Transformation Plan',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:36.0,
    fcfPerShare:7.80,fcfGrowth:10,wacc:11.0,termGrowth:2.0,fwdEPS:7.20,targetPE:9,
    bearDn:18,bearProb:0.28,basePct:7,baseProb:0.48,bullUps:18,bullProb:0.24,sigma:26,
    factors:{momentum:58,value:72,quality:60,growth:38,risk:52}},
  { symbol:'MS',   name:'Morgan Stanley',           sector:'Financials',  mcap:'0.21T',
    current:124.60,open:122.80,high:126.80,low:121.40,volume:8400000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'Wealth Management',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:42.0,
    fcfPerShare:9.60,fcfGrowth:10,wacc:10.5,termGrowth:2.0,fwdEPS:10.20,targetPE:13,
    bearDn:16,bearProb:0.22,basePct:8,baseProb:0.52,bullUps:18,bullProb:0.26,sigma:22,
    factors:{momentum:62,value:64,quality:76,growth:42,risk:62}},
  { symbol:'SPGI', name:'S&P Global Inc',           sector:'Financials',  mcap:'0.16T',
    current:512.40,open:507.20,high:518.80,low:504.60,volume:1200000,
    signal:'buy', confidence:70,strength:'Moderate',catalyst:'Ratings + Data',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:18.0,
    fcfPerShare:18.60,fcfGrowth:12,wacc:8.5,termGrowth:2.5,fwdEPS:17.80,targetPE:30,
    bearDn:12,bearProb:0.18,basePct:11,baseProb:0.54,bullUps:22,bullProb:0.28,sigma:18,
    factors:{momentum:68,value:52,quality:88,growth:58,risk:72}},
  { symbol:'CME',  name:'CME Group Inc',            sector:'Financials',  mcap:'0.083T',
    current:230.40,open:228.20,high:233.60,low:226.80,volume:1600000,
    signal:'hold',confidence:62,strength:'Moderate',catalyst:'Volatility + Volume',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:8.0,
    fcfPerShare:13.40,fcfGrowth:8,wacc:8.5,termGrowth:2.0,fwdEPS:11.20,targetPE:22,
    bearDn:12,bearProb:0.20,basePct:7,baseProb:0.53,bullUps:16,bullProb:0.27,sigma:16,
    factors:{momentum:58,value:64,quality:84,growth:36,risk:74}},
  { symbol:'PYPL', name:'PayPal Holdings',          sector:'Financials',  mcap:'0.076T',
    current:69.40, open:68.20, high:71.20, low:67.40, volume:9200000,
    signal:'hold',confidence:52,strength:'Weak',    catalyst:'Braintree + Venmo',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:18.0,
    fcfPerShare:5.60,fcfGrowth:8,wacc:10.5,termGrowth:2.0,fwdEPS:5.40,targetPE:14,
    bearDn:20,bearProb:0.28,basePct:7,baseProb:0.46,bullUps:22,bullProb:0.26,sigma:30,
    factors:{momentum:48,value:64,quality:62,growth:36,risk:52}},

  // ── Consumer Staples / Discretionary ──────────────────────────────────
  { symbol:'KO',   name:'Coca-Cola Co',             sector:'Cons. Staples',mcap:'0.31T',
    current:71.40, open:70.60, high:72.40, low:69.80, volume:14400000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Emerging Markets',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:6.0,
    fcfPerShare:2.80,fcfGrowth:5,wacc:7.5,termGrowth:1.5,fwdEPS:2.96,targetPE:26,
    bearDn:8, bearProb:0.16,basePct:5,baseProb:0.57,bullUps:12,bullProb:0.27,sigma:12,
    factors:{momentum:52,value:60,quality:88,growth:28,risk:84}},
  { symbol:'PEP',  name:'PepsiCo Inc',              sector:'Cons. Staples',mcap:'0.19T',
    current:137.80,open:136.40,high:139.60,low:135.20,volume:5400000,
    signal:'hold',confidence:57,strength:'Moderate',catalyst:'Snacks + Beverages',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:-14.0,
    fcfPerShare:7.20,fcfGrowth:5,wacc:7.5,termGrowth:1.5,fwdEPS:8.20,targetPE:19,
    bearDn:10,bearProb:0.18,basePct:5,baseProb:0.55,bullUps:13,bullProb:0.27,sigma:12,
    factors:{momentum:44,value:62,quality:86,growth:30,risk:80}},
  { symbol:'PG',   name:'Procter & Gamble Co',      sector:'Cons. Staples',mcap:'0.40T',
    current:171.40,open:169.80,high:173.20,low:168.60,volume:5200000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'Pricing Power',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:2.0,
    fcfPerShare:7.40,fcfGrowth:5,wacc:7.5,termGrowth:1.5,fwdEPS:7.60,targetPE:24,
    bearDn:8, bearProb:0.16,basePct:6,baseProb:0.57,bullUps:12,bullProb:0.27,sigma:12,
    factors:{momentum:52,value:58,quality:90,growth:28,risk:84}},
  { symbol:'MCD',  name:"McDonald's Corp",          sector:'Cons. Disc.', mcap:'0.22T',
    current:297.40,open:294.20,high:301.60,low:292.40,volume:3200000,
    signal:'hold',confidence:61,strength:'Moderate',catalyst:'Value Menu + Digital',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:4.0,
    fcfPerShare:11.20,fcfGrowth:7,wacc:8.0,termGrowth:2.0,fwdEPS:12.40,targetPE:25,
    bearDn:10,bearProb:0.18,basePct:7,baseProb:0.55,bullUps:14,bullProb:0.27,sigma:14,
    factors:{momentum:52,value:54,quality:86,growth:36,risk:74}},
  { symbol:'NKE',  name:'Nike Inc',                 sector:'Cons. Disc.', mcap:'0.11T',
    current:70.40, open:69.20, high:72.20, low:68.40, volume:8200000,
    signal:'hold',confidence:52,strength:'Weak',    catalyst:'China Recovery',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:-28.0,
    fcfPerShare:3.60,fcfGrowth:6,wacc:9.0,termGrowth:2.0,fwdEPS:3.60,targetPE:22,
    bearDn:14,bearProb:0.28,basePct:7,baseProb:0.48,bullUps:18,bullProb:0.24,sigma:22,
    factors:{momentum:38,value:52,quality:76,growth:36,risk:58}},
  { symbol:'SBUX', name:'Starbucks Corp',           sector:'Cons. Disc.', mcap:'0.096T',
    current:84.40, open:83.20, high:86.20, low:82.20, volume:7600000,
    signal:'hold',confidence:54,strength:'Moderate',catalyst:'Turnaround Plan',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-16.0,
    fcfPerShare:3.40,fcfGrowth:8,wacc:9.5,termGrowth:2.0,fwdEPS:4.20,targetPE:22,
    bearDn:14,bearProb:0.26,basePct:8,baseProb:0.50,bullUps:20,bullProb:0.24,sigma:22,
    factors:{momentum:44,value:48,quality:72,growth:42,risk:58}},
  { symbol:'PM',   name:'Philip Morris Intl',       sector:'Cons. Staples',mcap:'0.24T',
    current:148.40,open:146.60,high:150.60,low:145.40,volume:4200000,
    signal:'buy', confidence:67,strength:'Moderate',catalyst:'IQOS + ZYN Growth',
    sellWindow:'Q3 2026', trend:'bull', y2025ret:72.0,
    fcfPerShare:8.20,fcfGrowth:8,wacc:8.5,termGrowth:1.5,fwdEPS:7.40,targetPE:21,
    bearDn:10,bearProb:0.20,basePct:9,baseProb:0.53,bullUps:18,bullProb:0.27,sigma:16,
    factors:{momentum:72,value:66,quality:78,growth:44,risk:68}},
  { symbol:'MO',   name:'Altria Group Inc',         sector:'Cons. Staples',mcap:'0.097T',
    current:55.40, open:54.60, high:56.40, low:54.00, volume:8800000,
    signal:'hold',confidence:55,strength:'Moderate',catalyst:'On! + Smoke-Free',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:22.0,
    fcfPerShare:5.60,fcfGrowth:3,wacc:8.5,termGrowth:1.0,fwdEPS:5.40,targetPE:11,
    bearDn:10,bearProb:0.25,basePct:5,baseProb:0.50,bullUps:14,bullProb:0.25,sigma:14,
    factors:{momentum:56,value:78,quality:74,growth:22,risk:66}},

  // ── Industrials / Defense ──────────────────────────────────────────────
  { symbol:'CAT',  name:'Caterpillar Inc',          sector:'Industrials', mcap:'0.16T',
    current:338.40,open:334.60,high:343.20,low:331.80,volume:2200000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'Infrastructure + Mining',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:4.0,
    fcfPerShare:20.40,fcfGrowth:8,wacc:9.0,termGrowth:2.0,fwdEPS:22.40,targetPE:16,
    bearDn:14,bearProb:0.22,basePct:8,baseProb:0.52,bullUps:18,bullProb:0.26,sigma:20,
    factors:{momentum:56,value:62,quality:80,growth:42,risk:66}},
  { symbol:'DE',   name:'Deere & Company',          sector:'Industrials', mcap:'0.13T',
    current:408.40,open:403.20,high:414.20,low:400.60,volume:1800000,
    signal:'hold',confidence:57,strength:'Moderate',catalyst:'Precision Ag Tech',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-14.0,
    fcfPerShare:28.40,fcfGrowth:6,wacc:9.0,termGrowth:2.0,fwdEPS:26.40,targetPE:16,
    bearDn:16,bearProb:0.26,basePct:7,baseProb:0.49,bullUps:18,bullProb:0.25,sigma:22,
    factors:{momentum:46,value:64,quality:80,growth:38,risk:64}},
  { symbol:'GE',   name:'GE Aerospace',             sector:'Industrials', mcap:'0.23T',
    current:208.40,open:205.60,high:212.60,low:203.20,volume:5400000,
    signal:'buy', confidence:71,strength:'Moderate',catalyst:'LEAP Engine Backlog',
    sellWindow:'Q3–Q4 2026', trend:'bull', y2025ret:88.0,
    fcfPerShare:5.40,fcfGrowth:24,wacc:9.0,termGrowth:2.5,fwdEPS:5.20,targetPE:44,
    bearDn:14,bearProb:0.18,basePct:15,baseProb:0.54,bullUps:28,bullProb:0.28,sigma:22,
    factors:{momentum:76,value:46,quality:76,growth:78,risk:60}},
  { symbol:'HON',  name:'Honeywell Intl',           sector:'Industrials', mcap:'0.13T',
    current:207.40,open:205.20,high:210.60,low:203.40,volume:2800000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'Aerospace + PMT Split',
    sellWindow:'Q2–Q3 2026', trend:'neut', y2025ret:-6.0,
    fcfPerShare:9.80,fcfGrowth:7,wacc:8.5,termGrowth:2.0,fwdEPS:10.40,targetPE:21,
    bearDn:12,bearProb:0.22,basePct:7,baseProb:0.52,bullUps:16,bullProb:0.26,sigma:18,
    factors:{momentum:50,value:60,quality:82,growth:40,risk:68}},
  { symbol:'BA',   name:'Boeing Co',                sector:'Industrials', mcap:'0.14T',
    current:181.40,open:178.60,high:184.80,low:177.20,volume:7200000,
    signal:'hold',confidence:48,strength:'Weak',    catalyst:'737 MAX Production',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:16.0,
    fcfPerShare:1.20,fcfGrowth:60,wacc:11.5,termGrowth:2.0,fwdEPS:1.40,targetPE:0,
    bearDn:24,bearProb:0.32,basePct:8,baseProb:0.44,bullUps:28,bullProb:0.24,sigma:36,
    factors:{momentum:50,value:40,quality:46,growth:60,risk:34}},
  { symbol:'RTX',  name:'RTX Corporation',          sector:'Industrials', mcap:'0.17T',
    current:126.40,open:124.80,high:128.20,low:123.60,volume:5200000,
    signal:'buy', confidence:69,strength:'Moderate',catalyst:'Defense Backlog',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:46.0,
    fcfPerShare:5.60,fcfGrowth:12,wacc:9.0,termGrowth:2.0,fwdEPS:6.20,targetPE:22,
    bearDn:12,bearProb:0.18,basePct:11,baseProb:0.54,bullUps:22,bullProb:0.28,sigma:18,
    factors:{momentum:70,value:56,quality:78,growth:52,risk:66}},
  { symbol:'LMT',  name:'Lockheed Martin Corp',     sector:'Industrials', mcap:'0.11T',
    current:474.40,open:469.80,high:480.20,low:467.20,volume:1200000,
    signal:'hold',confidence:62,strength:'Moderate',catalyst:'F-35 + Hypersonics',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:8.0,
    fcfPerShare:28.40,fcfGrowth:6,wacc:8.5,termGrowth:1.5,fwdEPS:28.80,targetPE:17,
    bearDn:10,bearProb:0.20,basePct:7,baseProb:0.53,bullUps:16,bullProb:0.27,sigma:14,
    factors:{momentum:58,value:64,quality:84,growth:36,risk:72}},

  // ── Telecom ────────────────────────────────────────────────────────────
  { symbol:'T',    name:'AT&T Inc',                 sector:'Comm. Svcs.', mcap:'0.16T',
    current:22.40, open:22.10, high:22.80, low:21.90, volume:52000000,
    signal:'hold',confidence:55,strength:'Moderate',catalyst:'5G + Fiber Scale',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:42.0,
    fcfPerShare:2.20,fcfGrowth:5,wacc:9.5,termGrowth:1.5,fwdEPS:2.40,targetPE:10,
    bearDn:12,bearProb:0.28,basePct:5,baseProb:0.48,bullUps:14,bullProb:0.24,sigma:14,
    factors:{momentum:58,value:74,quality:62,growth:24,risk:60}},
  { symbol:'VZ',   name:'Verizon Communications',   sector:'Comm. Svcs.', mcap:'0.19T',
    current:44.80, open:44.20, high:45.60, low:43.80, volume:18000000,
    signal:'hold',confidence:53,strength:'Moderate',catalyst:'Frontier Acquisition',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:8.0,
    fcfPerShare:4.20,fcfGrowth:3,wacc:9.0,termGrowth:1.5,fwdEPS:4.80,targetPE:10,
    bearDn:10,bearProb:0.25,basePct:5,baseProb:0.50,bullUps:12,bullProb:0.25,sigma:12,
    factors:{momentum:50,value:76,quality:64,growth:20,risk:62}},
  { symbol:'CMCSA',name:'Comcast Corporation',      sector:'Comm. Svcs.', mcap:'0.16T',
    current:35.40, open:34.80, high:36.20, low:34.40, volume:24000000,
    signal:'hold',confidence:52,strength:'Moderate',catalyst:'Broadband + Theme Parks',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:-18.0,
    fcfPerShare:4.40,fcfGrowth:5,wacc:9.0,termGrowth:1.5,fwdEPS:4.60,targetPE:9,
    bearDn:12,bearProb:0.28,basePct:5,baseProb:0.48,bullUps:14,bullProb:0.24,sigma:16,
    factors:{momentum:42,value:74,quality:68,growth:26,risk:58}},

  // ── Utilities ──────────────────────────────────────────────────────────
  { symbol:'NEE',  name:'NextEra Energy Inc',       sector:'Utilities',   mcap:'0.15T',
    current:71.40, open:70.40, high:72.60, low:69.80, volume:9400000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'Solar + Storage',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:4.0,
    fcfPerShare:1.60,fcfGrowth:8,wacc:7.5,termGrowth:2.0,fwdEPS:3.40,targetPE:22,
    bearDn:10,bearProb:0.22,basePct:7,baseProb:0.53,bullUps:16,bullProb:0.25,sigma:16,
    factors:{momentum:54,value:54,quality:78,growth:44,risk:72}},
  { symbol:'DUK',  name:'Duke Energy Corp',         sector:'Utilities',   mcap:'0.085T',
    current:112.40,open:111.20,high:114.20,low:110.40,volume:3600000,
    signal:'hold',confidence:57,strength:'Moderate',catalyst:'Rate Base + Grid',
    sellWindow:'Q2 2026', trend:'neut', y2025ret:8.0,
    fcfPerShare:3.40,fcfGrowth:5,wacc:7.0,termGrowth:1.5,fwdEPS:5.80,targetPE:20,
    bearDn:8, bearProb:0.20,basePct:5,baseProb:0.54,bullUps:12,bullProb:0.26,sigma:12,
    factors:{momentum:52,value:58,quality:78,growth:30,risk:76}},

  // ── Materials / Real Estate ────────────────────────────────────────────
  { symbol:'LIN',  name:'Linde Plc',                sector:'Materials',   mcap:'0.22T',
    current:452.40,open:447.80,high:458.20,low:444.60,volume:1400000,
    signal:'buy', confidence:67,strength:'Moderate',catalyst:'Industrial Gas + H2',
    sellWindow:'Q4 2026', trend:'bull', y2025ret:10.0,
    fcfPerShare:15.40,fcfGrowth:9,wacc:8.0,termGrowth:2.0,fwdEPS:16.20,targetPE:30,
    bearDn:10,bearProb:0.18,basePct:9,baseProb:0.55,bullUps:18,bullProb:0.27,sigma:14,
    factors:{momentum:64,value:52,quality:88,growth:44,risk:74}},
  { symbol:'PLD',  name:'Prologis Inc',             sector:'Real Estate', mcap:'0.096T',
    current:104.40,open:102.80,high:106.40,low:101.80,volume:5200000,
    signal:'hold',confidence:59,strength:'Moderate',catalyst:'eCommerce Logistics',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:-10.0,
    fcfPerShare:3.20,fcfGrowth:7,wacc:8.0,termGrowth:2.0,fwdEPS:3.60,targetPE:32,
    bearDn:12,bearProb:0.22,basePct:7,baseProb:0.52,bullUps:16,bullProb:0.26,sigma:18,
    factors:{momentum:52,value:50,quality:82,growth:38,risk:66}},
  { symbol:'AMT',  name:'American Tower Corp',      sector:'Real Estate', mcap:'0.095T',
    current:210.40,open:207.80,high:213.80,low:206.20,volume:2200000,
    signal:'hold',confidence:58,strength:'Moderate',catalyst:'5G + Data Centers',
    sellWindow:'Q3 2026', trend:'neut', y2025ret:4.0,
    fcfPerShare:8.40,fcfGrowth:7,wacc:8.0,termGrowth:2.0,fwdEPS:7.60,targetPE:30,
    bearDn:12,bearProb:0.22,basePct:7,baseProb:0.52,bullUps:16,bullProb:0.26,sigma:18,
    factors:{momentum:52,value:50,quality:82,growth:38,risk:66}},
  { symbol:'SHW',  name:'Sherwin-Williams Co',      sector:'Materials',   mcap:'0.089T',
    current:347.40,open:343.20,high:352.60,low:340.80,volume:1600000,
    signal:'hold',confidence:60,strength:'Moderate',catalyst:'Housing + Pro Market',
    sellWindow:'Q4 2026', trend:'neut', y2025ret:10.0,
    fcfPerShare:14.20,fcfGrowth:8,wacc:8.5,termGrowth:2.0,fwdEPS:13.60,targetPE:27,
    bearDn:12,bearProb:0.20,basePct:8,baseProb:0.54,bullUps:16,bullProb:0.26,sigma:18,
    factors:{momentum:56,value:50,quality:84,growth:42,risk:68}},
  { symbol:'ADBE', name:'Adobe Inc',                sector:'Technology',  mcap:'0.16T',
    current:368.40,open:364.20,high:374.60,low:361.80,volume:3800000,
    signal:'hold',confidence:62,strength:'Moderate',catalyst:'AI Creative + Firefly',
    sellWindow:'Q3–Q4 2026', trend:'neut', y2025ret:-12.0,
    fcfPerShare:16.40,fcfGrowth:12,wacc:9.5,termGrowth:2.5,fwdEPS:18.20,targetPE:22,
    bearDn:20,bearProb:0.22,basePct:10,baseProb:0.50,bullUps:24,bullProb:0.28,sigma:26,
    factors:{momentum:54,value:44,quality:86,growth:62,risk:62}},
];

const IND = [
    {symbol:'NVDA', rsi:64.2,macd: 3.84,ema:'Up',     vol:'Rising', w52h:153.20,w52l: 47.32},
    {symbol:'AAPL', rsi:56.8,macd: 1.12,ema:'Up',     vol:'Steady', w52h:199.62,w52l:164.08},
    {symbol:'MSFT', rsi:60.4,macd: 2.21,ema:'Up',     vol:'Rising', w52h:430.80,w52l:366.80},
    {symbol:'AMZN', rsi:62.1,macd: 2.76,ema:'Up',     vol:'Rising', w52h:230.40,w52l:153.70},
    {symbol:'GOOGL',rsi:58.3,macd: 1.58,ema:'Up',     vol:'Steady', w52h:184.20,w52l:135.60},
    {symbol:'META', rsi:67.9,macd: 1.04,ema:'Neutral',vol:'Falling',w52h:611.00,w52l:380.50},
    {symbol:'TSLA', rsi:48.5,macd:-1.44,ema:'Down',   vol:'Rising', w52h:358.60,w52l:138.80},
    {symbol:'AVGO', rsi:63.7,macd: 2.40,ema:'Up',     vol:'Rising', w52h:201.80,w52l: 84.70},
    {symbol:'BRK.B',rsi:54.2,macd: 0.88,ema:'Neutral',vol:'Steady', w52h:465.00,w52l:353.00},
    {symbol:'JPM',  rsi:44.6,macd:-0.72,ema:'Down',   vol:'Falling',w52h:261.40,w52l:167.90},
];

/* ═══════════════════════════════════════════════════════════════════════════
   METRICS DATABASE  (beta · multiples · fundamentals · capital returns)
   Fields: beta, pb, ps, evEbitda, roe, roic, netMargin, revGrowth,
           debtEq, divYield, payoutRatio, buybackYield
═══════════════════════════════════════════════════════════════════════════ */
// Sentinel for negative book value / negative earnings (display as N/A)
const neg = null;
const METRICS_DB = {
  //             beta   pb    ps   evEb  roe   roic  netMg  revGr  d/e  divY  pyRt  bbYd
  NVDA:  {beta:1.72,pb:42.0,ps:26.0,evEbitda:48.0,roe:124.0,roic:68.0,netMargin:48.6,revGrowth:122.4,debtEq:0.42,divYield:0.03,payoutRatio:1.2, buybackYield:0.0},
  AAPL:  {beta:1.25,pb:46.2,ps:8.2, evEbitda:24.8,roe:160.6,roic:58.2,netMargin:26.3,revGrowth:2.8,  debtEq:1.72,divYield:0.44,payoutRatio:15.6,buybackYield:3.1},
  MSFT:  {beta:0.90,pb:12.2,ps:12.8,evEbitda:28.4,roe:38.8, roic:30.2,netMargin:36.0,revGrowth:15.7, debtEq:0.44,divYield:0.72,payoutRatio:22.4,buybackYield:0.8},
  AMZN:  {beta:1.42,pb:8.0, ps:3.3, evEbitda:22.6,roe:22.0, roic:14.8,netMargin:9.9, revGrowth:10.5, debtEq:0.52,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  GOOGL: {beta:1.06,pb:6.4, ps:6.2, evEbitda:18.4,roe:30.8, roic:26.4,netMargin:27.2,revGrowth:14.6, debtEq:0.08,divYield:0.48,payoutRatio:7.8, buybackYield:1.6},
  META:  {beta:1.32,pb:8.4, ps:8.6, evEbitda:18.2,roe:36.2, roic:28.4,netMargin:40.8,revGrowth:21.6, debtEq:0.14,divYield:0.38,payoutRatio:8.4, buybackYield:1.2},
  TSLA:  {beta:2.28,pb:9.6, ps:7.4, evEbitda:62.4,roe:14.2, roic:11.2,netMargin:7.8, revGrowth:-1.1, debtEq:0.28,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  AVGO:  {beta:1.14,pb:15.8,ps:10.2,evEbitda:26.4,roe:62.4, roic:22.8,netMargin:37.2,revGrowth:44.2, debtEq:1.16,divYield:1.18,payoutRatio:44.6,buybackYield:0.6},
  'BRK.B':{beta:0.88,pb:1.56,ps:2.2,evEbitda:12.4,roe:14.8, roic:10.6,netMargin:22.4,revGrowth:4.2,  debtEq:0.28,divYield:0.0, payoutRatio:0.0, buybackYield:0.2},
  JPM:   {beta:1.12,pb:1.88,ps:3.4, evEbitda:11.6,roe:16.8, roic:14.2,netMargin:28.4,revGrowth:8.6,  debtEq:1.42,divYield:2.22,payoutRatio:28.4,buybackYield:2.4},
  AMD:   {beta:1.82,pb:3.8, ps:8.4, evEbitda:42.4,roe:4.2,  roic:3.8, netMargin:5.6, revGrowth:12.4, debtEq:0.16,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  INTC:  {beta:0.92,pb:0.94,ps:1.6, evEbitda:14.2,roe:-18.4,roic:-8.2,netMargin:-9.8,revGrowth:-7.8, debtEq:0.52,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  QCOM:  {beta:1.38,pb:6.8, ps:4.2, evEbitda:14.4,roe:42.6, roic:24.2,netMargin:25.4,revGrowth:9.6,  debtEq:1.06,divYield:2.16,payoutRatio:44.2,buybackYield:2.8},
  ORCL:  {beta:1.02,pb:34.2,ps:7.8, evEbitda:22.6,roe:212.4,roic:18.4,netMargin:24.8,revGrowth:6.8,  debtEq:9.40,divYield:1.24,payoutRatio:44.8,buybackYield:0.6},
  CRM:   {beta:1.24,pb:4.4, ps:7.8, evEbitda:32.4,roe:9.6,  roic:8.2, netMargin:16.2,revGrowth:8.8,  debtEq:0.28,divYield:0.0, payoutRatio:0.0, buybackYield:0.6},
  NFLX:  {beta:1.42,pb:16.8,ps:8.4, evEbitda:36.4,roe:40.6, roic:22.4,netMargin:24.4,revGrowth:15.2, debtEq:0.74,divYield:0.0, payoutRatio:0.0, buybackYield:1.2},
  V:     {beta:0.94,pb:12.8,ps:14.2,evEbitda:22.4,roe:42.8, roic:36.4,netMargin:52.6,revGrowth:10.2, debtEq:0.62,divYield:0.72,payoutRatio:22.6,buybackYield:2.6},
  MA:    {beta:0.98,pb:54.8,ps:16.4,evEbitda:28.6,roe:210.4,roic:48.2,netMargin:46.8,revGrowth:12.4, debtEq:2.62,divYield:0.56,payoutRatio:20.8,buybackYield:2.2},
  BAC:   {beta:1.42,pb:1.22,ps:3.2, evEbitda:8.2, roe:9.8,  roic:7.4, netMargin:26.4,revGrowth:4.2,  debtEq:1.28,divYield:2.36,payoutRatio:28.4,buybackYield:1.6},
  GS:    {beta:1.38,pb:1.62,ps:2.8, evEbitda:10.4,roe:10.8, roic:9.2, netMargin:22.6,revGrowth:16.4, debtEq:2.42,divYield:2.08,payoutRatio:24.6,buybackYield:2.4},
  XOM:   {beta:0.84,pb:1.92,ps:1.42,evEbitda:7.8, roe:14.8, roic:11.4,netMargin:9.6, revGrowth:-6.4, debtEq:0.22,divYield:3.42,payoutRatio:44.8,buybackYield:3.2},
  CVX:   {beta:0.88,pb:1.78,ps:1.32,evEbitda:8.2, roe:11.6, roic:9.2, netMargin:8.4, revGrowth:-8.2, debtEq:0.18,divYield:4.12,payoutRatio:52.4,buybackYield:4.2},
  JNJ:   {beta:0.52,pb:5.8, ps:4.2, evEbitda:14.6,roe:22.4, roic:14.6,netMargin:22.8,revGrowth:4.4,  debtEq:0.46,divYield:3.22,payoutRatio:44.6,buybackYield:0.8},
  PFE:   {beta:0.58,pb:1.72,ps:2.6, evEbitda:8.6, roe:6.4,  roic:4.2, netMargin:10.6,revGrowth:-44.2,debtEq:0.64,divYield:7.22,payoutRatio:88.4,buybackYield:0.0},
  UNH:   {beta:0.62,pb:5.4, ps:0.72,evEbitda:12.8,roe:26.8, roic:18.6,netMargin:6.2, revGrowth:7.4,  debtEq:0.62,divYield:1.88,payoutRatio:34.8,buybackYield:1.2},
  WMT:   {beta:0.52,pb:8.4, ps:0.88,evEbitda:28.4,roe:22.4, roic:14.8,netMargin:2.4, revGrowth:5.6,  debtEq:0.44,divYield:0.88,payoutRatio:34.4,buybackYield:0.8},
  COST:  {beta:0.92,pb:16.2,ps:1.62,evEbitda:38.4,roe:32.4, roic:24.4,netMargin:2.86,revGrowth:7.2,  debtEq:0.38,divYield:0.52,payoutRatio:28.4,buybackYield:0.4},
  HD:    {beta:1.02,pb:68.2,ps:2.22,evEbitda:16.8,roe:neg,  roic:38.4,netMargin:9.8, revGrowth:-3.2, debtEq:99.0,divYield:2.44,payoutRatio:50.4,buybackYield:1.6},
  PLTR:  {beta:2.62,pb:28.4,ps:28.6,evEbitda:142.4,roe:8.4, roic:6.2, netMargin:14.2,revGrowth:28.4, debtEq:0.06,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  SNOW:  {beta:1.92,pb:8.6, ps:14.6,evEbitda:neg, roe:-6.4, roic:-4.8,netMargin:-14.2,revGrowth:26.4,debtEq:0.12,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  SPOT:  {beta:1.58,pb:12.6,ps:4.2, evEbitda:82.4,roe:22.4, roic:16.4,netMargin:8.4, revGrowth:19.2, debtEq:0.48,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  DIS:   {beta:1.22,pb:1.94,ps:1.96,evEbitda:16.4,roe:6.4,  roic:5.2, netMargin:5.6, revGrowth:2.4,  debtEq:0.52,divYield:0.88,payoutRatio:28.4,buybackYield:0.4},
  TSMC:  {beta:1.18,pb:6.4, ps:8.2, evEbitda:14.6,roe:32.4, roic:26.8,netMargin:42.4,revGrowth:32.8, debtEq:0.32,divYield:1.42,payoutRatio:42.4,buybackYield:0.4},
  ARM:   {beta:1.72,pb:22.4,ps:30.4,evEbitda:82.4,roe:18.4, roic:14.2,netMargin:28.4,revGrowth:46.8, debtEq:0.14,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  MU:    {beta:1.68,pb:2.48,ps:3.2, evEbitda:8.6, roe:14.2, roic:10.4,netMargin:22.4,revGrowth:61.2, debtEq:0.28,divYield:0.42,payoutRatio:6.2, buybackYield:0.6},
  UBER:  {beta:1.62,pb:12.4,ps:3.6, evEbitda:44.2,roe:28.4, roic:14.2,netMargin:7.8, revGrowth:17.6, debtEq:0.82,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  COIN:  {beta:3.62,pb:6.8, ps:8.4, evEbitda:32.4,roe:22.4, roic:14.2,netMargin:28.6,revGrowth:102.4,debtEq:0.48,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  LLY:   {beta:0.44,pb:54.2,ps:18.4,evEbitda:62.4,roe:78.4, roic:32.4,netMargin:28.4,revGrowth:32.4, debtEq:1.14,divYield:0.64,payoutRatio:22.4,buybackYield:0.4},
  ABBV:  {beta:0.62,pb:34.8,ps:4.4, evEbitda:14.2,roe:neg,  roic:18.6,netMargin:18.2,revGrowth:3.2,  debtEq:8.42,divYield:3.62,payoutRatio:58.4,buybackYield:0.4},
  MRK:   {beta:0.52,pb:5.8, ps:3.2, evEbitda:11.6,roe:28.4, roic:16.4,netMargin:22.6,revGrowth:-1.8, debtEq:0.68,divYield:3.42,payoutRatio:44.2,buybackYield:1.2},
  TMO:   {beta:0.72,pb:5.4, ps:4.2, evEbitda:18.4,roe:12.4, roic:8.6, netMargin:14.6,revGrowth:-4.2, debtEq:0.78,divYield:0.32,payoutRatio:12.4,buybackYield:0.8},
  AMGN:  {beta:0.58,pb:neg, ps:5.4, evEbitda:12.4,roe:neg,  roic:18.2,netMargin:28.4,revGrowth:3.8,  debtEq:22.4,divYield:3.22,payoutRatio:58.4,buybackYield:1.6},
  REGN:  {beta:0.42,pb:5.2, ps:6.8, evEbitda:12.6,roe:20.4, roic:16.2,netMargin:32.4,revGrowth:4.4,  debtEq:0.28,divYield:0.0, payoutRatio:0.0, buybackYield:2.8},
  VRTX:  {beta:0.52,pb:9.4, ps:10.2,evEbitda:24.4,roe:28.4, roic:22.6,netMargin:38.4,revGrowth:12.4, debtEq:0.06,divYield:0.0, payoutRatio:0.0, buybackYield:1.2},
  GILD:  {beta:0.48,pb:5.6, ps:3.4, evEbitda:10.6,roe:22.4, roic:12.6,netMargin:26.4,revGrowth:5.8,  debtEq:0.98,divYield:3.62,payoutRatio:52.4,buybackYield:1.6},
  ISRG:  {beta:0.92,pb:14.2,ps:14.6,evEbitda:46.4,roe:18.4, roic:16.2,netMargin:28.4,revGrowth:22.4, debtEq:0.04,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  MDT:   {beta:0.72,pb:2.4, ps:2.6, evEbitda:12.4,roe:8.4,  roic:6.2, netMargin:14.8,revGrowth:3.4,  debtEq:0.48,divYield:3.32,payoutRatio:62.4,buybackYield:0.8},
  ABT:   {beta:0.82,pb:5.6, ps:4.2, evEbitda:22.4,roe:16.4, roic:12.4,netMargin:16.2,revGrowth:1.8,  debtEq:0.42,divYield:1.82,payoutRatio:44.6,buybackYield:1.2},
  NOW:   {beta:1.12,pb:22.4,ps:14.6,evEbitda:62.4,roe:14.4, roic:12.6,netMargin:14.8,revGrowth:22.4, debtEq:0.24,divYield:0.0, payoutRatio:0.0, buybackYield:0.4},
  INTU:  {beta:1.18,pb:12.4,ps:10.6,evEbitda:44.2,roe:18.4, roic:14.6,netMargin:20.4,revGrowth:12.4, debtEq:0.32,divYield:0.62,payoutRatio:18.4,buybackYield:0.8},
  ADSK:  {beta:1.22,pb:48.4,ps:9.4, evEbitda:38.4,roe:neg,  roic:18.6,netMargin:16.2,revGrowth:11.4, debtEq:2.82,divYield:0.0, payoutRatio:0.0, buybackYield:0.6},
  WDAY:  {beta:1.32,pb:6.6, ps:7.6, evEbitda:42.4,roe:8.4,  roic:6.2, netMargin:12.4,revGrowth:16.4, debtEq:0.36,divYield:0.0, payoutRatio:0.0, buybackYield:0.4},
  TEAM:  {beta:1.42,pb:neg, ps:10.6,evEbitda:neg, roe:neg,  roic:-4.2,netMargin:-6.4, revGrowth:18.6, debtEq:3.62,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  PANW:  {beta:1.28,pb:22.4,ps:13.8,evEbitda:82.4,roe:28.4, roic:8.2, netMargin:14.6,revGrowth:16.2, debtEq:0.52,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  CRWD:  {beta:1.52,pb:28.4,ps:18.6,evEbitda:122.4,roe:12.4,roic:6.4, netMargin:10.4,revGrowth:28.4, debtEq:0.24,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  ZS:    {beta:1.62,pb:18.6,ps:12.6,evEbitda:neg, roe:4.6,  roic:2.4, netMargin:8.4, revGrowth:20.4, debtEq:0.64,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  NET:   {beta:1.72,pb:34.6,ps:18.4,evEbitda:neg, roe:-4.2, roic:-2.4,netMargin:-3.2, revGrowth:27.6, debtEq:0.48,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  DDOG:  {beta:1.62,pb:24.4,ps:14.6,evEbitda:neg, roe:4.6,  roic:3.2, netMargin:6.4, revGrowth:24.6, debtEq:0.28,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  SHOP:  {beta:1.52,pb:13.4,ps:14.6,evEbitda:neg, roe:8.4,  roic:5.6, netMargin:8.4, revGrowth:24.6, debtEq:0.08,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  MELI:  {beta:1.62,pb:18.4,ps:5.6, evEbitda:42.4,roe:38.4, roic:22.4,netMargin:9.4, revGrowth:37.6, debtEq:1.28,divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  ASML:  {beta:1.22,pb:14.6,ps:10.8,evEbitda:28.6,roe:58.4, roic:36.4,netMargin:28.4,revGrowth:-3.6, debtEq:0.32,divYield:1.02,payoutRatio:38.6,buybackYield:0.6},
  TXN:   {beta:1.08,pb:8.6, ps:9.4, evEbitda:28.4,roe:42.4, roic:28.4,netMargin:38.6,revGrowth:-2.8, debtEq:0.88,divYield:3.12,payoutRatio:72.4,buybackYield:0.8},
  AMAT:  {beta:1.38,pb:6.4, ps:5.6, evEbitda:17.6,roe:42.4, roic:30.2,netMargin:26.4,revGrowth:6.4,  debtEq:0.42,divYield:0.88,payoutRatio:22.4,buybackYield:2.2},
  LRCX:  {beta:1.42,pb:12.6,ps:7.2, evEbitda:20.4,roe:72.4, roic:44.2,netMargin:26.4,revGrowth:18.4, debtEq:1.12,divYield:1.18,payoutRatio:22.4,buybackYield:4.2},
  KLAC:  {beta:1.38,pb:18.4,ps:9.6, evEbitda:22.4,roe:82.4, roic:48.4,netMargin:32.4,revGrowth:12.4, debtEq:1.28,divYield:0.82,payoutRatio:18.4,buybackYield:3.2},
  MRVL:  {beta:1.68,pb:6.8, ps:12.6,evEbitda:neg, roe:-1.6, roic:-0.8,netMargin:-4.2, revGrowth:3.8,  debtEq:0.28,divYield:0.28,payoutRatio:neg, buybackYield:0.4},
  AXP:   {beta:1.18,pb:6.4, ps:3.0, evEbitda:12.4,roe:36.4, roic:14.6,netMargin:15.4,revGrowth:8.4,  debtEq:2.42,divYield:1.22,payoutRatio:22.4,buybackYield:2.4},
  BLK:   {beta:1.22,pb:3.4, ps:5.4, evEbitda:18.4,roe:14.8, roic:8.6, netMargin:28.4,revGrowth:6.4,  debtEq:0.82,divYield:2.28,payoutRatio:44.2,buybackYield:0.8},
  SCHW:  {beta:1.12,pb:3.6, ps:5.2, evEbitda:14.2,roe:8.4,  roic:6.2, netMargin:22.4,revGrowth:-3.2, debtEq:1.64,divYield:1.42,payoutRatio:34.2,buybackYield:0.6},
  WFC:   {beta:1.28,pb:1.42,ps:2.6, evEbitda:9.4, roe:11.4, roic:9.2, netMargin:26.4,revGrowth:2.8,  debtEq:1.22,divYield:2.22,payoutRatio:26.4,buybackYield:2.8},
  C:     {beta:1.42,pb:0.78,ps:1.6, evEbitda:6.4, roe:6.8,  roic:5.6, netMargin:18.4,revGrowth:3.8,  debtEq:1.62,divYield:3.12,payoutRatio:34.2,buybackYield:2.2},
  MS:    {beta:1.32,pb:1.96,ps:2.6, evEbitda:10.4,roe:14.8, roic:10.6,netMargin:18.4,revGrowth:8.4,  debtEq:2.12,divYield:2.82,payoutRatio:34.6,buybackYield:2.6},
  SPGI:  {beta:1.08,pb:14.6,ps:11.8,evEbitda:28.4,roe:82.4, roic:28.4,netMargin:36.4,revGrowth:12.4, debtEq:2.42,divYield:0.82,payoutRatio:22.4,buybackYield:1.4},
  CME:   {beta:0.52,pb:4.2, ps:10.4,evEbitda:20.4,roe:12.4, roic:8.6, netMargin:58.4,revGrowth:7.2,  debtEq:0.12,divYield:4.22,payoutRatio:52.4,buybackYield:0.4},
  PYPL:  {beta:1.52,pb:3.6, ps:2.6, evEbitda:12.4,roe:18.4, roic:12.4,netMargin:14.4,revGrowth:7.2,  debtEq:0.38,divYield:0.0, payoutRatio:0.0, buybackYield:4.6},
  KO:    {beta:0.52,pb:10.4,ps:5.8, evEbitda:22.4,roe:42.4, roic:14.6,netMargin:24.8,revGrowth:2.4,  debtEq:1.72,divYield:3.22,payoutRatio:72.4,buybackYield:0.8},
  PEP:   {beta:0.52,pb:11.2,ps:2.6, evEbitda:17.6,roe:52.4, roic:18.6,netMargin:10.4,revGrowth:0.8,  debtEq:2.22,divYield:3.62,payoutRatio:72.4,buybackYield:0.6},
  PG:    {beta:0.52,pb:8.6, ps:4.2, evEbitda:20.4,roe:28.4, roic:14.6,netMargin:18.4,revGrowth:3.4,  debtEq:0.68,divYield:2.42,payoutRatio:62.4,buybackYield:1.6},
  MCD:   {beta:0.72,pb:neg, ps:7.8, evEbitda:22.4,roe:neg,  roic:24.4,netMargin:32.4,revGrowth:2.2,  debtEq:99.0,divYield:2.22,payoutRatio:58.4,buybackYield:0.8},
  NKE:   {beta:1.02,pb:8.8, ps:2.4, evEbitda:16.4,roe:28.4, roic:16.4,netMargin:9.6, revGrowth:-10.4,debtEq:0.82,divYield:2.12,payoutRatio:46.4,buybackYield:2.6},
  SBUX:  {beta:0.92,pb:neg, ps:2.4, evEbitda:14.4,roe:neg,  roic:22.4,netMargin:11.4,revGrowth:-1.4, debtEq:99.0,divYield:3.22,payoutRatio:62.4,buybackYield:1.2},
  PM:    {beta:0.72,pb:neg, ps:4.2, evEbitda:14.2,roe:neg,  roic:28.4,netMargin:28.4,revGrowth:8.6,  debtEq:99.0,divYield:4.22,payoutRatio:72.4,buybackYield:0.4},
  MO:    {beta:0.62,pb:neg, ps:4.8, evEbitda:9.4, roe:neg,  roic:22.4,netMargin:28.4,revGrowth:0.4,  debtEq:99.0,divYield:8.42,payoutRatio:72.4,buybackYield:0.0},
  CAT:   {beta:1.12,pb:7.4, ps:2.4, evEbitda:13.4,roe:54.4, roic:28.4,netMargin:16.4,revGrowth:-6.4, debtEq:1.62,divYield:1.52,payoutRatio:28.4,buybackYield:2.4},
  DE:    {beta:0.98,pb:5.2, ps:1.6, evEbitda:11.2,roe:32.4, roic:18.4,netMargin:10.4,revGrowth:-16.4,debtEq:2.62,divYield:1.52,payoutRatio:28.4,buybackYield:2.2},
  GE:    {beta:1.12,pb:7.6, ps:3.4, evEbitda:28.4,roe:18.4, roic:12.4,netMargin:13.4,revGrowth:11.4, debtEq:0.32,divYield:0.58,payoutRatio:12.4,buybackYield:0.8},
  HON:   {beta:1.02,pb:7.8, ps:3.2, evEbitda:18.4,roe:32.4, roic:18.6,netMargin:16.2,revGrowth:4.4,  debtEq:1.22,divYield:2.12,payoutRatio:42.4,buybackYield:1.2},
  BA:    {beta:1.52,pb:neg, ps:1.28,evEbitda:neg, roe:neg,  roic:-4.2,netMargin:-5.8, revGrowth:14.6, debtEq:neg, divYield:0.0, payoutRatio:0.0, buybackYield:0.0},
  RTX:   {beta:0.92,pb:2.6, ps:1.62,evEbitda:14.4,roe:8.4,  roic:6.4, netMargin:8.6, revGrowth:12.4, debtEq:0.68,divYield:2.22,payoutRatio:32.4,buybackYield:1.2},
  LMT:   {beta:0.52,pb:neg, ps:1.52,evEbitda:12.4,roe:neg,  roic:24.4,netMargin:9.4, revGrowth:5.2,  debtEq:99.0,divYield:2.72,payoutRatio:44.4,buybackYield:2.8},
  T:     {beta:0.62,pb:1.42,ps:1.62,evEbitda:7.6, roe:6.4,  roic:4.2, netMargin:12.4,revGrowth:1.4,  debtEq:0.88,divYield:5.62,payoutRatio:62.4,buybackYield:0.0},
  VZ:    {beta:0.38,pb:1.72,ps:1.62,evEbitda:7.4, roe:14.4, roic:6.2, netMargin:13.4,revGrowth:0.4,  debtEq:1.52,divYield:6.62,payoutRatio:64.4,buybackYield:0.0},
  CMCSA: {beta:0.82,pb:2.22,ps:1.22,evEbitda:7.2, roe:14.4, roic:8.4, netMargin:12.4,revGrowth:-0.4, debtEq:1.22,divYield:3.22,payoutRatio:34.4,buybackYield:2.8},
  NEE:   {beta:0.62,pb:3.4, ps:4.2, evEbitda:14.4,roe:10.4, roic:5.6, netMargin:22.4,revGrowth:8.4,  debtEq:1.62,divYield:3.22,payoutRatio:56.4,buybackYield:0.0},
  DUK:   {beta:0.42,pb:1.82,ps:2.8, evEbitda:12.4,roe:8.4,  roic:4.6, netMargin:16.4,revGrowth:2.4,  debtEq:1.62,divYield:4.22,payoutRatio:72.4,buybackYield:0.0},
  LIN:   {beta:0.88,pb:4.4, ps:4.8, evEbitda:22.4,roe:14.4, roic:10.6,netMargin:22.4,revGrowth:2.8,  debtEq:0.22,divYield:1.28,payoutRatio:38.4,buybackYield:1.6},
  PLD:   {beta:0.92,pb:3.2, ps:14.4,evEbitda:22.4,roe:8.4,  roic:4.6, netMargin:36.4,revGrowth:8.4,  debtEq:0.52,divYield:3.62,payoutRatio:62.4,buybackYield:0.4},
  AMT:   {beta:0.82,pb:28.4,ps:9.4, evEbitda:22.4,roe:12.4, roic:5.4, netMargin:16.4,revGrowth:4.4,  debtEq:3.62,divYield:3.22,payoutRatio:62.4,buybackYield:0.0},
  SHW:   {beta:1.12,pb:22.4,ps:3.4, evEbitda:22.4,roe:82.4, roic:24.4,netMargin:13.4,revGrowth:1.8,  debtEq:3.82,divYield:0.94,payoutRatio:28.4,buybackYield:2.4},
  ADBE:  {beta:1.18,pb:14.4,ps:8.4, evEbitda:28.6,roe:36.4, roic:24.6,netMargin:28.4,revGrowth:10.4, debtEq:0.62,divYield:0.0, payoutRatio:0.0, buybackYield:2.4},
};

/* ═══════════════════════════════════════════════════════════════════════════
   MODELS
═══════════════════════════════════════════════════════════════════════════ */

// ── DCF: 5-year discounted cash flow ─────────────────────────────────────
function calcDCF(s) {
    let pv = 0;
    for (let yr = 1; yr <= 5; yr++) {
        const fcf = s.fcfPerShare * Math.pow(1 + s.fcfGrowth / 100, yr);
        pv += fcf / Math.pow(1 + s.wacc / 100, yr);
    }
    const fcf5 = s.fcfPerShare * Math.pow(1 + s.fcfGrowth / 100, 5);
    const tv   = fcf5 * (1 + s.termGrowth / 100) / ((s.wacc - s.termGrowth) / 100);
    pv += tv / Math.pow(1 + s.wacc / 100, 5);
    return pv;
}

// ── Earnings model: Forward EPS × Target P/E ─────────────────────────────
function calcEarnings(s) {
    return s.fwdEPS * s.targetPE;
}

// ── Composite score (factor-weighted) ─────────────────────────────────────
// Weights: Momentum 20 · Value 20 · Quality 25 · Growth 25 · Risk 10
function compositeScore(f) {
    return Math.round(f.momentum*0.20 + f.value*0.20 + f.quality*0.25 + f.growth*0.25 + f.risk*0.10);
}

// ── Scenario analysis: probability-weighted expected value ────────────────
function calcScenarios(s) {
    const bear = s.current * (1 - s.bearDn / 100);
    const base = s.current * (1 + s.basePct / 100);
    const bull = s.current * (1 + s.bullUps / 100);
    const ev   = bear * s.bearProb + base * s.baseProb + bull * s.bullProb;
    return { bear, base, bull, ev };
}

// ── Monte Carlo: 500-path GBM, T=1yr ─────────────────────────────────────
// Box-Muller transform for Gaussian random variates
function monteCarlo(price, mu, sigma, n) {
    n = n || 500;
    const T = 1;
    const results = [];
    for (let i = 0; i < n; i++) {
        const u1 = Math.random() || 1e-10;
        const u2 = Math.random();
        const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const logRet = (mu / 100 - 0.5 * Math.pow(sigma / 100, 2)) * T
                     + (sigma / 100) * Math.sqrt(T) * z;
        results.push(price * Math.exp(logRet));
    }
    results.sort((a, b) => a - b);
    const pct = (p) => results[Math.min(n-1, Math.floor(n * p))];
    return {
        p10:   pct(0.10),
        p25:   pct(0.25),
        p50:   pct(0.50),
        p75:   pct(0.75),
        p90:   pct(0.90),
        pBeat: results.filter(r => r > price).length / n * 100,
    };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE STATE & HISTORY
═══════════════════════════════════════════════════════════════════════════ */
const HISTORY = {};
(function() {
    STOCKS.forEach(s => {
        const n = 16, yr = Math.max(-0.5, Math.min(2, s.y2025ret / 100));
        const start = s.current / (1 + yr);
        const seed = Math.round(s.current * 137.3);
        const pr = (i) => ((seed * (i+3) * 9301 + 49297) % 233280) / 233280;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const t = i / (n-1);
            pts.push(Math.max(0.01, (start + (s.current-start)*t) * (1 + (pr(i)-0.5)*0.10)));
        }
        pts[n-1] = s.current;
        HISTORY[s.symbol] = pts;
    });
}());

let live    = STOCKS.map(s => ({ ...s }));
let liveInd = IND.map(i => ({ ...i }));
let prevPrices = {};
let monitoring = false, monitorInterval = null;
const MAX_VOL = Math.max(...STOCKS.map(s => s.volume));

/* ── My Watchlist state ── */
let myList    = [];
let myLiveMap = {};
const HISTORY_MY = {};
const MY_MAX = 10;

function loadMyList() {
    try {
        const saved = JSON.parse(localStorage.getItem('lp_mylist') || '[]');
        saved.forEach(sym => {
            const s = STOCK_DB.find(d => d.symbol === sym);
            if (s) _myListAdd(s, false);
        });
    } catch(e) { /* ignore invalid saved data */ }
}
function saveMyList() {
    localStorage.setItem('lp_mylist', JSON.stringify(myList));
}
function _myListAdd(s, doSave) {
    if (myList.includes(s.symbol) || myList.length >= MY_MAX) return false;
    myList.push(s.symbol);
    myLiveMap[s.symbol] = { ...s };
    const n=16, yr=Math.max(-0.5,Math.min(2,s.y2025ret/100));
    const start=s.current/(1+yr), seed=Math.round(s.current*137.3);
    const pr=(i)=>((seed*(i+3)*9301+49297)%233280)/233280;
    const pts=[];
    for(let i=0;i<n;i++){
        const t=i/(n-1);
        pts.push(Math.max(0.01,(start+(s.current-start)*t)*(1+(pr(i)-0.5)*0.10)));
    }
    pts[n-1]=s.current;
    HISTORY_MY[s.symbol]=pts;
    if (doSave!==false) saveMyList();
    return true;
}
function myListRemove(sym) {
    myList=myList.filter(s=>s!==sym);
    delete myLiveMap[sym];
    delete HISTORY_MY[sym];
    saveMyList();
    renderMyWatchlist();
    updateSearchCap();
}
function updateSearchCap() {
    const el=document.getElementById('search-cap');
    if(el) el.textContent=`My list: ${myList.length} / ${MY_MAX}`;
}

/* ── Search ── */
let srHiIdx=-1, srMatches=[];
function onSearchInput(q) {
    q=q.trim();
    const dd=document.getElementById('search-dropdown');
    if(!q){ dd.classList.remove('open'); srMatches=[]; return; }
    const ql=q.toLowerCase();
    srMatches=STOCK_DB.filter(s=>
        s.symbol.toLowerCase().startsWith(ql)||s.name.toLowerCase().includes(ql)
    ).slice(0,9);
    srHiIdx=-1;
    _renderDropdown();
    dd.classList.add('open');
}
function _renderDropdown() {
    const dd=document.getElementById('search-dropdown');
    if(!srMatches.length){ dd.innerHTML='<div class="sr-empty">No results</div>'; return; }
    dd.innerHTML=srMatches.map((s,i)=>{
        const added=myList.includes(s.symbol);
        return `<div class="sr-item${i===srHiIdx?' sr-active':''}" onmousedown="pickSearch(${i})">
            <span class="sr-sym">${s.symbol}</span>
            <span class="sr-name">${s.name}</span>
            <span class="sr-sector">${s.sector}</span>
            ${added?'<span class="sr-added-tag">✓ In list</span>':''}
        </div>`;
    }).join('');
}
function onSearchKey(e) {
    if(!srMatches.length) return;
    if(e.key==='ArrowDown'){e.preventDefault();srHiIdx=Math.min(srHiIdx+1,srMatches.length-1);_renderDropdown();}
    else if(e.key==='ArrowUp'){e.preventDefault();srHiIdx=Math.max(srHiIdx-1,0);_renderDropdown();}
    else if(e.key==='Enter'){e.preventDefault();if(srHiIdx>=0)pickSearch(srHiIdx);else if(srMatches.length===1)pickSearch(0);else addSelected();}
    else if(e.key==='Escape') closeDropdown();
}
function pickSearch(idx) {
    const s=srMatches[idx]; if(!s) return;
    document.getElementById('stock-search').value=s.symbol;
    closeDropdown();
    addFromDB(s.symbol);
}
function closeDropdown() {
    const dd=document.getElementById('search-dropdown');
    if(dd) dd.classList.remove('open');
}
function addSelected() {
    const q=document.getElementById('stock-search').value.trim().toUpperCase();
    if(!q) return;
    if(srMatches.length===1){ addFromDB(srMatches[0].symbol); return; }
    addFromDB(q);
}
function addFromDB(sym) {
    sym=sym.toUpperCase();
    const s=STOCK_DB.find(d=>d.symbol===sym);
    if(!s){ _flashInput('Not found in database'); return; }
    if(myList.includes(sym)){ _flashInput('Already in your list'); return; }
    if(myList.length>=MY_MAX){ _flashInput('List full — max 10 stocks'); return; }
    _myListAdd(s);
    document.getElementById('stock-search').value='';
    srMatches=[]; closeDropdown();
    renderMyWatchlist();
    updateSearchCap();
}
function _flashInput(msg) {
    const inp=document.getElementById('stock-search');
    const orig=inp.placeholder;
    inp.placeholder=msg;
    inp.style.borderColor='var(--dn)';
    setTimeout(()=>{ inp.placeholder=orig; inp.style.borderColor=''; },2000);
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function fmt(n)  { return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtV(n) { return n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n.toLocaleString(); }
function ts()    { return new Date().toLocaleTimeString('en-US',{hour12:false}); }
function jitter(v,p){ p=p||0.003; return v*(1+(Math.random()-0.5)*2*p); }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

function sparkSVG(pts, isUp) {
    const W=72,H=24,min=Math.min(...pts),max=Math.max(...pts),range=max-min||1;
    const xy=pts.map((v,i)=>`${((i/(pts.length-1))*W).toFixed(1)},${(H-((v-min)/range)*(H-4)-2).toFixed(1)}`).join(' ');
    const fp=`0,${H} ${xy} ${W},${H}`;
    const c=isUp?'#1ebd68':'#e84040', fc=isUp?'rgba(30,189,104,0.08)':'rgba(232,64,64,0.08)';
    const lastY=(H-((pts[pts.length-1]-min)/range)*(H-4)-2).toFixed(1);
    return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polygon points="${fp}" fill="${fc}"/><polyline points="${xy}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${W}" cy="${lastY}" r="2.5" fill="${c}"/></svg>`;
}
function dayRangeBar(cur,lo,hi) {
    const p=clamp(((cur-lo)/(hi-lo||1))*100,0,100).toFixed(1);
    return `<div class="rng"><span class="rng-lo dim">$${fmt(lo)}</span><div class="rng-track"><div class="rng-fill" style="width:${p}%"></div><div class="rng-pip" style="left:${p}%"></div></div><span class="rng-hi dim">$${fmt(hi)}</span></div>`;
}
function volBar(v) {
    const p=clamp(v/MAX_VOL*100,2,100).toFixed(1);
    return `<div class="vol-cell"><span>${fmtV(v)}</span><div class="vol-bw"><div class="vol-bf" style="width:${p}%"></div></div></div>`;
}
function rsiBar(rsi) {
    const p=clamp(rsi,0,100).toFixed(1);
    const c=rsi>70?'#e84040':rsi<30?'#1ebd68':'#c9a227';
    const cls=rsi>70?'dn':rsi<30?'up':'gold';
    return `<div class="rsi-bar"><span class="rsi-val ${cls}">${rsi.toFixed(1)}</span><div class="rsi-track"><div class="rsi-pip" style="left:${p}%;background:${c}"></div></div></div>`;
}
function w52Bar(cur,lo,hi) {
    const p=clamp(((cur-lo)/(hi-lo||1))*100,0,100).toFixed(1);
    return `<div class="w52-bar"><span class="dim" style="font-size:10px;font-family:'Courier New',monospace">$${fmt(lo)}</span><div class="w52-track"><div class="w52-fill" style="width:100%"></div><div class="w52-pip" style="left:${p}%"></div></div><span class="dim" style="font-size:10px;font-family:'Courier New',monospace">$${fmt(hi)}</span></div>`;
}
function scoreColor(n) { return n>=72?'var(--up)':n>=55?'var(--gold)':'var(--dn)'; }
function mosClass(pct)  { return pct>=0?'moS-pos':'moS-neg'; }

/* ═══════════════════════════════════════════════════════════════════════════
   TICKER
═══════════════════════════════════════════════════════════════════════════ */
function renderTicker() {
    const items=[...live,...live].map(r=>{
        const chg=(r.current-r.open)/r.open*100;
        const col=chg>=0?'#1ebd68':'#e84040';
        return `<span class="ticker-item"><span style="color:#3a6cd4;font-weight:700">${r.symbol}</span>&nbsp;<span style="color:${col}">${chg>=0?'▲':'▼'} $${fmt(r.current)} (${chg>=0?'+':''}${chg.toFixed(2)}%)</span></span>`;
    }).join('');
    document.getElementById('ticker-inner').innerHTML=items;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: WATCHLIST
═══════════════════════════════════════════════════════════════════════════ */
function renderWatchlist() {
    document.getElementById('wl-ts').textContent=ts();
    document.getElementById('wl-tbody').innerHTML=live.map(r=>{
        const prev=prevPrices[r.symbol]??r.open, up=r.current>=prev;
        const chg=r.current-r.open, chgPct=chg/r.open*100;
        prevPrices[r.symbol]=r.current;
        const h=HISTORY[r.symbol], sparkUp=(h[h.length-1]||r.current)>=(h[0]||r.current);
        return `<tr>
            <td><div class="sym">${r.symbol}</div><div class="nm">${r.name}</div><span class="sector-tag">${r.sector}</span></td>
            <td>${sparkSVG(h,sparkUp)}</td>
            <td class="mono ${up?'up':'dn'} ${up?'flash-up':'flash-dn'}" style="font-size:15px;font-weight:700">${up?'▲':'▼'} $${fmt(r.current)}</td>
            <td class="mono ${chg>=0?'up':'dn'}">${chg>=0?'+':''}${fmt(chg)}<br><span style="font-size:11px">${chgPct>=0?'+':''}${chgPct.toFixed(2)}%</span></td>
            <td>${dayRangeBar(r.current,r.low,r.high)}</td>
            <td>${volBar(r.volume)}</td>
            <td class="mono gold" style="font-weight:700">$${r.mcap}</td>
            <td><span class="badge b-${r.signal}">${r.signal.toUpperCase()}</span></td>
        </tr>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: FORECAST
═══════════════════════════════════════════════════════════════════════════ */
function renderForecast() {
    // ── Summary stats ─────────────────────────────────────────────────────
    const scores = live.map(r => compositeScore(r.factors));
    const avgScore = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const avgDCF  = live.reduce((a,r)=>a+calcDCF(r),0)/live.length;
    const bullN   = live.filter(r=>r.trend==='bull').length;
    const avgCur  = live.reduce((a,r)=>a+r.current,0)/live.length;
    const dcfUps = ((avgDCF/avgCur)-1)*100;
    document.getElementById('fcast-stats').innerHTML=`
        <div class="sc"><div class="sc-lbl">Avg Composite Score</div>
            <div class="sc-val" style="color:${scoreColor(avgScore)}">${avgScore}</div>
            <div class="sc-sub">Factor-weighted · /100</div></div>
        <div class="sc"><div class="sc-lbl">Bullish Outlook</div>
            <div class="sc-val up">${bullN}<span style="font-size:14px"> / 10</span></div>
            <div class="sc-sub">Upward trend</div></div>
        <div class="sc"><div class="sc-lbl">Avg DCF Upside</div>
            <div class="sc-val ${dcfUps>=0?'gold':'dn'}">${dcfUps>=0?'+':''}${dcfUps.toFixed(1)}%</div>
            <div class="sc-sub">DCF vs market price</div></div>
        <div class="sc"><div class="sc-lbl">Sell Signals</div>
            <div class="sc-val dn">${live.filter(r=>r.signal==='sell').length}</div>
            <div class="sc-sub">Active exits</div></div>`;

    // ── Overview: composite score cards ──────────────────────────────────
    document.getElementById('score-grid').innerHTML=live.map(r=>{
        const sc=compositeScore(r.factors), col=scoreColor(sc);
        const cls=r.trend==='bull'?'sc-bull':r.trend==='bear'?'sc-bear':'sc-neut';
        const facs=[
            {k:'Momentum',v:r.factors.momentum,c:'f-momentum'},
            {k:'Value',   v:r.factors.value,    c:'f-value'},
            {k:'Quality', v:r.factors.quality,  c:'f-quality'},
            {k:'Growth',  v:r.factors.growth,   c:'f-growth'},
            {k:'Risk',    v:r.factors.risk,      c:'f-risk'},
        ];
        return `<div class="score-card ${cls}">
            <div class="scard-sym">${r.symbol}</div>
            <div class="scard-name">${r.name}</div>
            <div class="scard-score" style="color:${col}">${sc}</div>
            <div class="scard-lbl">Composite Score</div>
            <div class="factor-rows">${facs.map(f=>`
                <div class="factor-row">
                    <span class="factor-lbl">${f.k}</span>
                    <div class="factor-bar"><div class="factor-fill ${f.c}" style="width:${f.v}%"></div></div>
                    <span class="factor-num">${f.v}</span>
                </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    // ── Valuation: DCF + Earnings ─────────────────────────────────────────
    document.getElementById('val-tbody').innerHTML=live.map(r=>{
        const dcf  = calcDCF(r);
        const earn = calcEarnings(r);
        const mosDCF  = ((dcf  - r.current) / r.current * 100);
        const mosEarn = ((earn - r.current) / r.current * 100);
        const consensus = (dcf + earn) / 2;
        const mosC = ((consensus - r.current) / r.current * 100);
        return `<tr>
            <td><div class="sym">${r.symbol}</div><div class="nm">${r.name}</div></td>
            <td>
                <span class="model-badge mb-dcf">DCF</span>&nbsp;
                <span class="model-badge mb-earn">EPS×P/E</span>
            </td>
            <td class="mono muted">$${fmt(r.fcfPerShare)}</td>
            <td class="mono up">${r.fcfGrowth}% <span class="dim" style="font-size:10px">CAGR</span></td>
            <td class="mono dim">${r.wacc}%</td>
            <td class="intrinsic-val ${mosClass(mosDCF)}">$${fmt(dcf)}
                <span style="font-size:10px;display:block;font-weight:400">${mosDCF>=0?'+':''}${mosDCF.toFixed(1)}% MoS</span>
            </td>
            <td class="intrinsic-val ${mosClass(mosEarn)}">$${fmt(earn)}
                <span style="font-size:10px;display:block;font-weight:400">${mosEarn>=0?'+':''}${mosEarn.toFixed(1)}% upside</span>
            </td>
            <td><span class="${mosClass(mosC)}" style="font-size:14px;font-weight:700;font-family:'Courier New',monospace">${mosC>=0?'+':''}${mosC.toFixed(1)}%</span>
                <div class="dim" style="font-size:10px">consensus avg</div></td>
            <td><span class="sell-win">${r.sellWindow}</span></td>
        </tr>`;
    }).join('');

    // ── Scenarios ─────────────────────────────────────────────────────────
    document.getElementById('scen-tbody').innerHTML=live.map(r=>{
        const s=calcScenarios(r);
        const evChg=((s.ev-r.current)/r.current*100);
        const tB=r.trend==='bull'?'<span class="badge b-bull">BULLISH</span>':r.trend==='bear'?'<span class="badge b-bear">BEARISH</span>':'<span class="badge b-neut">NEUTRAL</span>';
        const bearW=(r.bearProb*100).toFixed(0), baseW=(r.baseProb*100).toFixed(0), bullW=(r.bullProb*100).toFixed(0);
        return `<tr>
            <td><div class="sym">${r.symbol}</div></td>
            <td class="mono dn">$${fmt(s.bear)}<div class="dim" style="font-size:10px">-${r.bearDn}%</div></td>
            <td class="mono gold">$${fmt(s.base)}<div class="dim" style="font-size:10px">+${r.basePct}%</div></td>
            <td class="mono up">$${fmt(s.bull)}<div class="dim" style="font-size:10px">+${r.bullUps}%</div></td>
            <td>
                <div class="scen-bar">
                    <div class="scen-bear" style="width:${bearW}%">${bearW}%</div>
                    <div class="scen-base" style="width:${baseW}%">${baseW}%</div>
                    <div class="scen-bull" style="width:${bullW}%">${bullW}%</div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:2px">
                    <span>Bear</span><span>Base</span><span>Bull</span>
                </div>
            </td>
            <td class="ev-val">$${fmt(s.ev)}</td>
            <td class="${evChg>=0?'up':'dn'}" style="font-weight:700;font-family:'Courier New',monospace">${evChg>=0?'+':''}${evChg.toFixed(1)}%</td>
            <td>${tB}</td>
        </tr>`;
    }).join('');

    // ── Monte Carlo ───────────────────────────────────────────────────────
    document.getElementById('monte-tbody').innerHTML=live.map(r=>{
        const mu = r.basePct; // use base-case as drift approximation
        const mc = monteCarlo(r.current, mu, r.sigma, 500);
        const range = mc.p90 - mc.p10 || 1;
        const w10=((mc.p25-mc.p10)/range*100).toFixed(1);
        const w25=((mc.p50-mc.p25)/range*100).toFixed(1);
        const w50=((mc.p75-mc.p50)/range*100).toFixed(1);
        const w75=((mc.p90-mc.p75)/range*100).toFixed(1);
        const beatCls=mc.pBeat>=55?'up':mc.pBeat<=45?'dn':'gold';
        return `<tr>
            <td><div class="sym">${r.symbol}</div></td>
            <td class="mono muted">$${fmt(r.current)}</td>
            <td class="mono ${mu>=0?'up':'dn'}">${mu>=0?'+':''}${mu.toFixed(1)}%</td>
            <td class="mono dim">±${r.sigma}%</td>
            <td>
                <div class="mc-dist">
                    <div class="mc-p10" style="flex:${w10}%" title="P10–P25"></div>
                    <div class="mc-p25" style="flex:${w25}%" title="P25–P50"></div>
                    <div class="mc-p50" style="flex:${w50}%" title="P50–P75"></div>
                    <div class="mc-p75" style="flex:${w75}%" title="P75–P90"></div>
                    <div class="mc-p90" style="flex:2%" title="P90+"></div>
                </div>
                <div class="mc-label"><span class="dn">$${fmt(mc.p10)}</span><span class="gold">$${fmt(mc.p50)}</span><span class="up">$${fmt(mc.p90)}</span></div>
            </td>
            <td class="mono dn">$${fmt(mc.p10)}</td>
            <td class="mono gold">$${fmt(mc.p50)}</td>
            <td class="mono up">$${fmt(mc.p90)}</td>
            <td class="prob-beat ${beatCls}">${mc.pBeat.toFixed(1)}%</td>
        </tr>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: SIGNALS
═══════════════════════════════════════════════════════════════════════════ */
function renderSignals() {
    document.getElementById('sig-ts').textContent=ts();
    document.getElementById('sig-tbody').innerHTML=live.map(r=>`<tr>
        <td><div class="sym">${r.symbol}</div><div class="nm">${r.name}</div></td>
        <td><span class="badge b-${r.signal}">${r.signal.toUpperCase()}</span></td>
        <td><div class="conf"><div class="conf-track"><div class="conf-fill cf-${r.signal}" style="width:${r.confidence}%"></div></div><span class="conf-pct">${r.confidence}%</span></div></td>
        <td class="muted">${r.strength}</td>
        <td><span class="sector-tag">${r.catalyst}</span></td>
        <td class="dim mono" style="font-size:11px">${ts()}</td>
    </tr>`).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: INDICATORS
═══════════════════════════════════════════════════════════════════════════ */
function renderIndicators() {
    document.getElementById('ind-ts').textContent=ts();
    document.getElementById('ind-tbody').innerHTML=liveInd.map(r=>{
        const st=live.find(s=>s.symbol===r.symbol);
        const emaCls=r.ema==='Up'?'up':r.ema==='Down'?'dn':'gold';
        const volCls=r.vol==='Rising'?'up':r.vol==='Falling'?'dn':'muted';
        return `<tr>
            <td><div class="sym">${r.symbol}</div></td>
            <td>${rsiBar(r.rsi)}</td>
            <td class="mono ${r.macd>=0?'up':'dn'}">${r.macd>=0?'+':''}${r.macd.toFixed(2)}</td>
            <td class="${emaCls}">${r.ema}</td>
            <td class="${volCls}">${r.vol}</td>
            <td>${st?w52Bar(st.current,r.w52l,r.w52h):''}</td>
            <td class="mono muted">${st?'$'+fmt(st.current):''}</td>
        </tr>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODEL HELPERS
═══════════════════════════════════════════════════════════════════════════ */
const RF = 5.3; // risk-free rate %
function m(sym) { return METRICS_DB[sym] || {}; }
function fmtM(v)    { return v == null ? '<span class="na">N/A</span>' : v.toFixed(1); }
function fmtMPct(v) { return v == null ? '<span class="na">N/A</span>' : v.toFixed(1)+'%'; }
function peColor(pe) {
    if (pe == null) return 'na';
    if (pe < 0)  return 'val-xrich';
    if (pe < 15) return 'val-cheap';
    if (pe < 25) return 'val-fair';
    if (pe < 40) return 'val-rich';
    return 'val-xrich';
}
function riskLevel(beta, sig) {
    const r = (beta||1) * (sig/100);
    if (r < 0.14) return {cls:'risk-lo badge',lbl:'LOW'};
    if (r < 0.28) return {cls:'risk-md badge',lbl:'MEDIUM'};
    return {cls:'risk-hi badge',lbl:'HIGH'};
}
function capitalGrade(totalYield) {
    if (totalYield >= 8)  return {cls:'grade-a', lbl:'A+'};
    if (totalYield >= 5)  return {cls:'grade-a', lbl:'A'};
    if (totalYield >= 3)  return {cls:'grade-b', lbl:'B'};
    if (totalYield >= 1)  return {cls:'grade-c', lbl:'C'};
    return {cls:'grade-d', lbl:'D'};
}
function miniBar(val, max, color) {
    const pct = Math.min(100, Math.max(0, Math.abs(val||0) / max * 100)).toFixed(1);
    return `<div class="mini-bar-wrap">
        <div class="mini-track"><div class="mini-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: MULTIPLES
═══════════════════════════════════════════════════════════════════════════ */
function renderMultiples() {
    document.getElementById('mult-tbody').innerHTML = STOCK_DB.map(s => {
        const x = m(s.symbol);
        const pe = s.fwdEPS > 0 ? s.current / s.fwdEPS : null;
        const peg = (pe != null && s.fcfGrowth > 0) ? pe / s.fcfGrowth : null;
        const rating = s.signal === 'buy' ? 'b-buy' : s.signal === 'sell' ? 'b-sell' : 'b-hold';
        return `<tr>
            <td><div class="sym">${s.symbol}</div><div class="nm">${s.name}</div></td>
            <td><span class="sector-tag">${s.sector}</span></td>
            <td class="mono muted">$${fmt(s.current)}</td>
            <td class="mono ${peColor(pe)}">${pe != null ? pe.toFixed(1)+'x' : '<span class="na">N/A</span>'}</td>
            <td class="mono ${peg != null && peg < 1 ? 'val-cheap' : peg != null && peg < 2 ? 'val-fair' : 'val-rich'}">${peg != null ? peg.toFixed(2) : '<span class="na">N/A</span>'}</td>
            <td class="mono ${peColor(x.pb)}">${fmtM(x.pb)}${x.pb != null ? 'x' : ''}</td>
            <td class="mono ${x.ps != null && x.ps < 3 ? 'val-cheap' : x.ps != null && x.ps < 8 ? 'val-fair' : 'val-rich'}">${fmtM(x.ps)}${x.ps != null ? 'x' : ''}</td>
            <td class="mono ${x.evEbitda != null && x.evEbitda < 12 ? 'val-cheap' : x.evEbitda != null && x.evEbitda < 25 ? 'val-fair' : 'val-rich'}">${fmtM(x.evEbitda)}${x.evEbitda != null ? 'x' : ''}</td>
            <td><span class="badge ${rating}">${s.signal.toUpperCase()}</span></td>
        </tr>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: RISK
═══════════════════════════════════════════════════════════════════════════ */
function renderRisk() {
    document.getElementById('risk-tbody').innerHTML = STOCK_DB.map(s => {
        const x = m(s.symbol);
        const beta = x.beta || 1.0;
        const sig  = s.sigma || 25;
        const mu   = s.basePct || 8;
        const sharpe = ((mu - RF) / sig).toFixed(2);
        const var95  = (-mu + 1.645 * sig).toFixed(1);
        const rl = riskLevel(beta, sig);
        const tCls = s.trend === 'bull' ? 'b-bull' : s.trend === 'bear' ? 'b-bear' : 'b-neut';
        const sharpeCls = parseFloat(sharpe) >= 0.5 ? 'up' : parseFloat(sharpe) >= 0 ? 'gold' : 'dn';
        return `<tr>
            <td><div class="sym">${s.symbol}</div><div class="nm">${s.name}</div></td>
            <td><span class="sector-tag">${s.sector}</span></td>
            <td class="mono ${beta > 1.5 ? 'dn' : beta < 0.7 ? 'up' : 'gold'}">${beta.toFixed(2)}</td>
            <td class="mono dim">±${sig}%</td>
            <td class="mono ${sharpeCls}">${sharpe}</td>
            <td class="mono ${parseFloat(var95) > 30 ? 'dn' : 'gold'}">−${Math.max(0,parseFloat(var95)).toFixed(1)}%</td>
            <td><span class="badge ${rl.cls}">${rl.lbl}</span></td>
            <td><span class="badge ${tCls}">${s.trend.toUpperCase()}</span></td>
        </tr>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: FUNDAMENTALS
═══════════════════════════════════════════════════════════════════════════ */
function renderFundamentals() {
    document.getElementById('fund-tbody').innerHTML = STOCK_DB.map(s => {
        const x = m(s.symbol);
        const fcfYield = s.fcfPerShare > 0 ? (s.fcfPerShare / s.current * 100).toFixed(1) : null;
        const deStr = (x.debtEq == null || x.debtEq === 99.0) ? '<span class="na">N/Mev</span>' : x.debtEq.toFixed(2)+'x';
        return `<tr>
            <td><div class="sym">${s.symbol}</div><div class="nm">${s.name}</div></td>
            <td><span class="sector-tag">${s.sector}</span></td>
            <td class="mono ${x.roe != null && x.roe > 20 ? 'up' : x.roe != null && x.roe > 0 ? 'gold' : 'dn'}">${fmtMPct(x.roe)}</td>
            <td class="mono ${x.roic != null && x.roic > 15 ? 'up' : x.roic != null && x.roic > 0 ? 'gold' : 'dn'}">${fmtMPct(x.roic)}</td>
            <td class="mono ${x.netMargin != null && x.netMargin > 20 ? 'up' : x.netMargin != null && x.netMargin > 0 ? 'gold' : 'dn'}">${fmtMPct(x.netMargin)}</td>
            <td class="mono ${x.revGrowth != null && x.revGrowth > 10 ? 'up' : x.revGrowth != null && x.revGrowth > 0 ? 'gold' : 'dn'}">${x.revGrowth != null ? (x.revGrowth >= 0 ? '+' : '') + x.revGrowth.toFixed(1)+'%' : '<span class="na">N/A</span>'}</td>
            <td class="mono ${fcfYield != null && parseFloat(fcfYield) > 4 ? 'up' : fcfYield != null ? 'gold' : 'dn'}">${fcfYield != null ? fcfYield+'%' : '<span class="na">N/A</span>'}</td>
            <td class="mono muted">${deStr}</td>
        </tr>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: CAPITAL RETURNS
═══════════════════════════════════════════════════════════════════════════ */
function renderCapitalReturns() {
    document.getElementById('ret-tbody').innerHTML = STOCK_DB.map(s => {
        const x = m(s.symbol);
        const div  = x.divYield    || 0;
        const bb   = x.buybackYield|| 0;
        const fcfY = s.fcfPerShare > 0 ? +(s.fcfPerShare / s.current * 100).toFixed(1) : 0;
        const total = (div + bb + fcfY);
        const g = capitalGrade(total);
        const payout = x.payoutRatio;
        return `<tr>
            <td><div class="sym">${s.symbol}</div><div class="nm">${s.name}</div></td>
            <td><span class="sector-tag">${s.sector}</span></td>
            <td class="mono ${div > 3 ? 'up' : div > 1 ? 'gold' : 'dim'}">${div > 0 ? div.toFixed(2)+'%' : '<span class="dim">—</span>'}</td>
            <td class="mono dim">${payout != null && typeof payout === 'number' ? payout.toFixed(0)+'%' : '<span class="na">N/A</span>'}</td>
            <td class="mono ${bb > 2 ? 'up' : bb > 0 ? 'gold' : 'dim'}">${bb > 0 ? bb.toFixed(2)+'%' : '<span class="dim">—</span>'}</td>
            <td class="mono ${fcfY > 4 ? 'up' : fcfY > 1 ? 'gold' : 'dim'}">${fcfY > 0 ? fcfY.toFixed(1)+'%' : '<span class="dim">—</span>'}</td>
            <td class="mono gold" style="font-weight:700">${total.toFixed(2)}%</td>
            <td><span class="${g.cls}">${g.lbl}</span></td>
        </tr>`;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER: MY WATCHLIST
═══════════════════════════════════════════════════════════════════════════ */
function renderMyWatchlist() {
    const content=document.getElementById('my-content');
    const tsEl=document.getElementById('my-ts');
    if(!content) return;
    if(tsEl) tsEl.textContent=ts();
    updateSearchCap();
    if(!myList.length) {
        content.innerHTML=`<div class="my-empty-state">
            <span class="my-empty-icon">📋</span>
            <p>Search for any stock above and click <strong style="color:var(--lap3)">Add to My List</strong> to build your custom watchlist.<br>
            Up to ${MY_MAX} stocks · Full DCF · Scenarios · Monte Carlo projections.</p>
        </div>`;
        return;
    }
    const rows=myList.map(sym=>{
        const r=myLiveMap[sym]; if(!r) return '';
        const prev=prevPrices['my_'+sym]??r.open;
        const up=r.current>=prev;
        const chg=r.current-r.open, chgPct=chg/r.open*100;
        prevPrices['my_'+sym]=r.current;
        const h=HISTORY_MY[sym]||[r.current];
        const sparkUp=(h[h.length-1]||r.current)>=(h[0]||r.current);
        const mc=monteCarlo(r.current,r.basePct,r.sigma,200);
        const sc=calcScenarios(r);
        const dcf=calcDCF(r);
        const mos=((dcf-r.current)/r.current*100);
        const beatCls=mc.pBeat>=55?'up':mc.pBeat<=45?'dn':'gold';
        return `<tr>
            <td><div class="sym">${r.symbol}</div><div class="nm">${r.name}</div><span class="sector-tag">${r.sector}</span></td>
            <td>${sparkSVG(h,sparkUp)}</td>
            <td class="mono ${up?'up':'dn'} ${up?'flash-up':'flash-dn'}" style="font-size:15px;font-weight:700">${up?'▲':'▼'} $${fmt(r.current)}</td>
            <td class="mono ${chg>=0?'up':'dn'}">${chg>=0?'+':''}${fmt(chg)}<br><span style="font-size:11px">${chgPct>=0?'+':''}${chgPct.toFixed(2)}%</span></td>
            <td><span class="badge b-${r.signal}">${r.signal.toUpperCase()}</span></td>
            <td class="${mos>=0?'up':'dn'} mono" style="font-weight:700">${mos>=0?'+':''}${mos.toFixed(1)}%<div class="dim" style="font-size:9px">DCF MoS</div></td>
            <td class="mono" style="font-size:12px"><span class="dn">$${fmt(sc.bear)}</span><span class="dim"> — </span><span class="up">$${fmt(sc.bull)}</span></td>
            <td class="mono gold" style="font-weight:700">$${fmt(mc.p50)}<div class="${beatCls}" style="font-size:9px">${mc.pBeat.toFixed(0)}% beat</div></td>
            <td><span class="sell-win" style="font-size:10px">${r.sellWindow}</span></td>
            <td><button class="btn-remove" onclick="myListRemove('${sym}')">✕ Remove</button></td>
        </tr>`;
    }).join('');
    content.innerHTML=`<div class="tbl-wrap"><table>
        <thead><tr>
            <th>Symbol</th><th>Trend</th><th>Price</th><th>Change</th>
            <th>Signal</th><th>DCF MoS</th><th>Scenarios (Bear–Bull)</th>
            <th>MC P50</th><th>Sell Window</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TICK
═══════════════════════════════════════════════════════════════════════════ */
function tick() {
    live.forEach(r => {
        r.current = jitter(r.current, 0.004);
        r.confidence = clamp(r.confidence + Math.round((Math.random()-0.5)*4), 28, 98);
        const h = HISTORY[r.symbol];
        h.push(r.current);
        if (h.length > 24) h.shift();
    });
    liveInd.forEach(r => {
        r.rsi  = clamp(r.rsi  + (Math.random()-0.5)*1.6, 12, 88);
        r.macd = r.macd + (Math.random()-0.5)*0.12;
    });
    myList.forEach(sym => {
        const r=myLiveMap[sym]; if(!r) return;
        r.current=jitter(r.current,0.004);
        r.confidence=clamp(r.confidence+Math.round((Math.random()-0.5)*4),28,98);
        const h=HISTORY_MY[sym];
        if(h){ h.push(r.current); if(h.length>24) h.shift(); }
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAV & CONTROLS
═══════════════════════════════════════════════════════════════════════════ */
function showTab(tab) {
    document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+tab).classList.add('active');
    document.querySelector(`.tab-btn[onclick="showTab('${tab}')"]`).classList.add('active');
}
function showFcTab(tab) {
    document.querySelectorAll('.fc-pane').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.fc-tab').forEach(b=>b.classList.remove('active'));
    document.getElementById('fc-'+tab).classList.add('active');
    document.querySelector(`.fc-tab[onclick="showFcTab('${tab}')"]`).classList.add('active');
}
function setStatus(text,state) {
    document.getElementById('s-text').textContent=text;
    const d=document.getElementById('s-dot');
    d.className='s-dot'+(state==='live'?' live':state==='stopped'?' stopped':'');
    document.getElementById('s-stamp').textContent='Updated '+ts();
}
function doRefresh() {
    renderWatchlist(); renderForecast(); renderSignals(); renderIndicators(); renderTicker();
    renderMyWatchlist();
    setStatus(monitoring?'Live Monitoring':'Idle', monitoring?'live':'');
}
function renderStatic() {
    renderMultiples(); renderRisk(); renderFundamentals(); renderCapitalReturns();
}
function startLive() {
    if (monitoring) return;
    monitoring=true; setStatus('Live Monitoring','live');
    monitorInterval=setInterval(()=>{ tick(); doRefresh(); }, 1500);
}
function stopLive() {
    if (!monitoring) return;
    monitoring=false; clearInterval(monitorInterval);
    setStatus('Stopped','stopped');
}

/* ── Clock ── */
function updateClock() {
    document.getElementById('live-clock').textContent=
        new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}
setInterval(updateClock,1000); updateClock();

/* ── Keyboard ── */
document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='r'){e.preventDefault();doRefresh();}
    if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();startLive();}
    if((e.ctrlKey||e.metaKey)&&e.key==='e'){e.preventDefault();stopLive();}
});
window.addEventListener('beforeunload',stopLive);
window.addEventListener('load',()=>{ loadMyList(); doRefresh(); renderStatic(); setStatus('Ready — click Start Live to begin',''); });
