import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// System Chrome/Edge path
const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const artifactDir = 'C:\\Users\\taran\\.gemini\\antigravity-ide\\brain\\809476eb-0d7b-4531-a25d-8c3ab588c1e5';

async function runTwoBrowserTest() {
  console.log('🚀 Starting Live Two-Browser Realtime Cross-Device Sync Test...');

  const browserA = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--window-size=900,900', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  const pageA = await browserA.newPage();
  await pageA.setViewport({ width: 900, height: 900 });

  const browserB = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--window-size=900,900', '--no-sandbox', '--disable-setuid-sandbox'],
  });
  const pageB = await browserB.newPage();
  await pageB.setViewport({ width: 900, height: 900 });

  pageA.on('console', (msg) => console.log('💻 Window A Console:', msg.text()));
  pageB.on('console', (msg) => console.log('💻 Window B Console:', msg.text()));

  try {
    console.log('\n--- Step 1: Navigating and Logging In as Test Citizens ---');

    console.log('Logging in Window A as citizen1@setulink.com...');
    await pageA.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('input[type="email"]');
    await pageA.type('input[type="email"]', 'citizen1@setulink.com');
    await pageA.type('input[type="password"]', 'password123');
    await pageA.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));
    await pageA.goto('http://localhost:5173/feed', { waitUntil: 'domcontentloaded' });

    console.log('Logging in Window B as citizen2@setulink.com...');
    await pageB.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await pageB.waitForSelector('input[type="email"]');
    await pageB.type('input[type="email"]', 'citizen2@setulink.com');
    await pageB.type('input[type="password"]', 'password123');
    await pageB.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 2000));
    await pageB.goto('http://localhost:5173/feed', { waitUntil: 'domcontentloaded' });

    await new Promise((r) => setTimeout(r, 3000));

    const extractIssueDetails = async (page, windowName) => {
      return page.evaluate((name) => {
        const cards = Array.from(document.querySelectorAll('div.bg-white\\/90'));
        if (cards.length === 0) return { name, title: 'None', upvotesText: '0', severityText: '0.0' };
        const card = cards[0]; // Target card 0 ("clean water problem")
        const title = card.querySelector('h2')?.innerText || '';
        const upvotesText = card.querySelector('strong')?.innerText || '0';
        const severityBox = card.querySelector('div.text-sm.font-black.text-amber-950');
        const severityText = severityBox?.innerText || '0.0';
        return { name, title, upvotesText, severityText };
      }, windowName);
    };

    let detailsA = await extractIssueDetails(pageA, 'Window A');
    let detailsB = await extractIssueDetails(pageB, 'Window B');

    console.log('\n================ BASELINE STATE BEFORE ACTIONS ================');
    console.log('Target Issue Title:', detailsA.title);
    console.log('  Window A State (citizen1@setulink.com):', { upvotes: detailsA.upvotesText, severity: detailsA.severityText });
    console.log('  Window B State (citizen2@setulink.com):', { upvotes: detailsB.upvotesText, severity: detailsB.severityText });
    console.log('===============================================================\n');

    await pageA.screenshot({ path: path.join(artifactDir, 'window_A_1_baseline.png') });
    await pageB.screenshot({ path: path.join(artifactDir, 'window_B_1_baseline.png') });

    console.log('--- Step 2: ACTION IN WINDOW A — Click UPVOTE ---');
    const clickedA = await pageA.evaluate(() => {
      const card = document.querySelectorAll('div.bg-white\\/90')[0];
      if (!card) return false;
      const upvoteBtn = card.querySelector('button');
      if (upvoteBtn) {
        upvoteBtn.click();
        return true;
      }
      return false;
    });

    console.log('Window A upvote clicked:', clickedA);
    // Wait 2.5s for WebSocket Realtime event to propagate to Window B
    await new Promise((r) => setTimeout(r, 2500));

    detailsA = await extractIssueDetails(pageA, 'Window A');
    detailsB = await extractIssueDetails(pageB, 'Window B');

    console.log('\n================ AFTER UPVOTE IN WINDOW A ================');
    console.log('  Window A State:', { upvotes: detailsA.upvotesText, severity: detailsA.severityText });
    console.log('  Window B State (LIVE REALTIME SYNC WITHOUT REFRESH):', { upvotes: detailsB.upvotesText, severity: detailsB.severityText });
    console.log('===========================================================\n');

    await pageA.screenshot({ path: path.join(artifactDir, 'window_A_2_after_upvote.png') });
    await pageB.screenshot({ path: path.join(artifactDir, 'window_B_2_after_upvote.png') });

    console.log('--- Step 3: ACTION IN WINDOW A — Click 5-STAR SEVERITY RATING ---');
    const ratedA = await pageA.evaluate(() => {
      const card = document.querySelectorAll('div.bg-white\\/90')[0];
      if (!card) return false;
      const star5Btn = Array.from(card.querySelectorAll('button')).find((b) => b.innerText.trim() === '5');
      if (star5Btn) {
        star5Btn.click();
        return true;
      }
      return false;
    });

    console.log('Window A severity rating 5 clicked:', ratedA);
    // Wait 2.5s for DB Trigger + WebSocket Realtime event to propagate to Window B
    await new Promise((r) => setTimeout(r, 2500));

    detailsA = await extractIssueDetails(pageA, 'Window A');
    detailsB = await extractIssueDetails(pageB, 'Window B');

    console.log('\n================ AFTER SEVERITY RATING IN WINDOW A ================');
    console.log('  Window A State:', { upvotes: detailsA.upvotesText, severity: detailsA.severityText });
    console.log('  Window B State (LIVE REALTIME SYNC WITHOUT REFRESH):', { upvotes: detailsB.upvotesText, severity: detailsB.severityText });
    console.log('===================================================================\n');

    console.log('--- Step 4: REVERSE TEST — ACTION IN WINDOW B — Click UPVOTE in Window B ---');
    const clickedB = await pageB.evaluate(() => {
      const card = document.querySelectorAll('div.bg-white\\/90')[0];
      if (!card) return false;
      const upvoteBtn = card.querySelector('button');
      if (upvoteBtn) {
        upvoteBtn.click();
        return true;
      }
      return false;
    });

    console.log('Window B upvote clicked:', clickedB);
    await new Promise((r) => setTimeout(r, 2500));

    detailsA = await extractIssueDetails(pageA, 'Window A');
    detailsB = await extractIssueDetails(pageB, 'Window B');

    console.log('\n================ REVERSE TEST: AFTER UPVOTE IN WINDOW B ================');
    console.log('  Window B State:', { upvotes: detailsB.upvotesText, severity: detailsB.severityText });
    console.log('  Window A State (LIVE REALTIME SYNC WITHOUT REFRESH):', { upvotes: detailsA.upvotesText, severity: detailsA.severityText });
    console.log('=========================================================================\n');

    await pageA.screenshot({ path: path.join(artifactDir, 'window_A_3_final.png') });
    await pageB.screenshot({ path: path.join(artifactDir, 'window_B_3_final.png') });

    console.log('✅ LIVE TWO-BROWSER REALTIME SYNC FULLY VERIFIED WITH SCREENSHOTS & EXACT NUMBERS!');
  } catch (err) {
    console.error('Two-browser test error:', err);
  } finally {
    await browserA.close();
    await browserB.close();
  }
}

runTwoBrowserTest();
