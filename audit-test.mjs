import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'https://basecode-liquid-test.myshopify.com';
const PASSWORD = 'khushbu';
const OUT = path.join(process.cwd(), 'audit-screenshots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 393, height: 852 },
];

const PAGES = [
  { slug: '/', label: 'homepage' },
  { slug: '/collections/all', label: 'collection' },
  { slug: '/products/origin', label: 'product' },
  { slug: '/pages/quiz', label: 'quiz' },
  { slug: '/pages/free-report', label: 'free-report' },
  { slug: '/pages/landing-estrogen', label: 'landing-estrogen' },
  { slug: '/pages/landing-bloating', label: 'landing-bloating' },
  { slug: '/pages/landing-brain-fog', label: 'landing-brain-fog' },
  { slug: '/cart', label: 'cart' },
  { slug: '/search?q=origin', label: 'search' },
  { slug: '/blogs/journal', label: 'blog' },
  { slug: '/pages/about', label: 'about' },
  { slug: '/pages/contact', label: 'contact' },
  { slug: '/pages/faq', label: 'faq' },
  { slug: '/pages/science', label: 'science' },
  { slug: '/policies/privacy-policy', label: 'privacy' },
  { slug: '/policies/terms-of-service', label: 'terms' },
  { slug: '/404-not-a-real-page', label: '404' },
];

const results = [];

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);
}

async function unlockPassword(page) {
  try {
    await page.goto(`${BASE}/password`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const pwInput = page.locator('input[type="password"]');
    if (await pwInput.isVisible({ timeout: 3000 })) {
      await pwInput.fill(PASSWORD);
      await page.locator('button[type="submit"], input[type="submit"]').first().click();
      await page.waitForTimeout(2000);
      log('Password unlocked');
    }
  } catch (e) {
    log('Password page not found or already unlocked');
  }
}

async function testPage(context, pageInfo, viewport) {
  const page = await context.newPage();
  const url = `${BASE}${pageInfo.slug}`;
  const prefix = `${pageInfo.label}_${viewport.name}`;
  const issues = [];

  try {
    log(`Testing ${prefix} → ${url}`);

    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = response?.status() || 0;

    if (status >= 400 && pageInfo.label !== '404') {
      issues.push(`HTTP ${status}`);
    }

    // Wait for content to render
    await page.waitForTimeout(1500);

    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.waitForTimeout(500);

    // Check header exists
    const header = page.locator('#site-header, .header, header').first();
    if (await header.isVisible({ timeout: 2000 }).catch(() => false)) {
      // good
    } else {
      issues.push('Header not visible');
    }

    // Check footer exists (skip cart/404)
    if (!['cart', '404'].includes(pageInfo.label)) {
      const footer = page.locator('footer, .footer').first();
      if (await footer.isVisible({ timeout: 2000 }).catch(() => false)) {
        // good
      } else {
        issues.push('Footer not visible');
      }
    }

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const broken = [];
      imgs.forEach(img => {
        if (img.naturalWidth === 0 && img.src && !img.src.includes('data:')) {
          broken.push(img.src.substring(0, 80));
        }
      });
      return broken;
    });
    if (brokenImages.length > 0) {
      issues.push(`${brokenImages.length} broken image(s): ${brokenImages.slice(0, 2).join(', ')}`);
    }

    // Check for horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (hasOverflow) {
      issues.push('Horizontal overflow detected');
    }

    // Check for elements overflowing viewport (CLS indicator)
    const overflowElements = await page.evaluate(() => {
      const vw = window.innerWidth;
      const els = document.querySelectorAll('*');
      const overflowing = [];
      els.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 5 && rect.width > 0) {
          var cn = typeof el.className === 'string' ? el.className : (el.className.baseVal || '');
          overflowing.push(el.tagName + (cn ? '.' + cn.split(' ')[0] : ''));
        }
      });
      return [...new Set(overflowing)].slice(0, 3);
    });
    if (overflowElements.length > 0) {
      issues.push(`Overflow elements: ${overflowElements.join(', ')}`);
    }

    // Check for Liquid errors rendered on page
    const liquidErrors = await page.evaluate(() => {
      const text = document.body.innerText;
      const errors = [];
      if (text.includes('Liquid error')) errors.push('Liquid error found');
      if (text.includes('Could not find asset')) errors.push('Missing asset');
      if (text.includes('no implicit conversion')) errors.push('Type conversion error');
      return errors;
    });
    issues.push(...liquidErrors);

    // Page-specific checks
    if (pageInfo.label === 'homepage') {
      // Check hero section
      const hero = page.locator('.hero, [class*="hero"]').first();
      if (!await hero.isVisible({ timeout: 2000 }).catch(() => false)) {
        issues.push('Hero section not visible');
      }

      // Check announcement bar
      const announcement = page.locator('.announcement-bar').first();
      if (!await announcement.isVisible({ timeout: 2000 }).catch(() => false)) {
        issues.push('Announcement bar not visible');
      }
    }

    if (pageInfo.label === 'product') {
      // Check product form
      const addToCart = page.locator('[data-add-to-cart], button:has-text("Add to Cart"), button:has-text("Add to cart")').first();
      if (!await addToCart.isVisible({ timeout: 3000 }).catch(() => false)) {
        issues.push('Add to Cart button not visible');
      }

      // Check price
      const price = page.locator('[class*="price"], .product-hero__price').first();
      if (!await price.isVisible({ timeout: 2000 }).catch(() => false)) {
        issues.push('Product price not visible');
      }
    }

    if (pageInfo.label === 'quiz') {
      // Check quiz start button
      const startBtn = page.locator('[data-quiz-start]').first();
      if (!await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        issues.push('Quiz start button not visible');
      }
    }

    if (pageInfo.label === 'free-report') {
      // Check lead form
      const form = page.locator('[data-lead-form], form').first();
      if (!await form.isVisible({ timeout: 3000 }).catch(() => false)) {
        issues.push('Lead capture form not visible');
      }
    }

    if (pageInfo.label === 'cart') {
      // Cart page - just check it renders
      const cartContent = page.locator('.cart, [class*="cart"], main').first();
      if (!await cartContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        issues.push('Cart content not visible');
      }
    }

    // Full page screenshot
    await page.screenshot({
      path: path.join(OUT, `${prefix}.png`),
      fullPage: true,
    });

    // Above-the-fold screenshot
    await page.screenshot({
      path: path.join(OUT, `${prefix}_atf.png`),
      fullPage: false,
    });

    if (consoleErrors.length > 0) {
      issues.push(`${consoleErrors.length} console error(s)`);
    }

    results.push({
      page: pageInfo.label,
      viewport: viewport.name,
      status: issues.length === 0 ? 'PASS' : 'ISSUES',
      issues: issues.length > 0 ? issues : ['Clean'],
      httpStatus: status,
    });

  } catch (err) {
    results.push({
      page: pageInfo.label,
      viewport: viewport.name,
      status: 'ERROR',
      issues: [err.message.substring(0, 120)],
      httpStatus: 0,
    });
  } finally {
    await page.close();
  }
}

async function testInteractions(context) {
  const page = await context.newPage();
  log('Testing interactions...');

  try {
    // Test mobile menu
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    const menuToggle = page.locator('#menu-toggle, .header__menu-toggle').first();
    if (await menuToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuToggle.click();
      await page.waitForTimeout(500);
      const menu = page.locator('.mobile-menu');
      const isOpen = await menu.evaluate(el => el.classList.contains('is-open')).catch(() => false);
      await page.screenshot({ path: path.join(OUT, 'interaction_mobile-menu-open.png') });

      if (isOpen) {
        results.push({ page: 'interaction', viewport: 'mobile', status: 'PASS', issues: ['Mobile menu opens correctly'], httpStatus: 200 });
      } else {
        results.push({ page: 'interaction', viewport: 'mobile', status: 'ISSUES', issues: ['Mobile menu did not get is-open class'], httpStatus: 200 });
      }

      // Test close
      const closeBtn = page.locator('#mobile-menu-close, [data-menu-close]').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(500);
        const stillOpen = await menu.evaluate(el => el.classList.contains('is-open')).catch(() => false);
        if (!stillOpen) {
          results.push({ page: 'interaction', viewport: 'mobile', status: 'PASS', issues: ['Mobile menu closes correctly'], httpStatus: 200 });
        } else {
          results.push({ page: 'interaction', viewport: 'mobile', status: 'ISSUES', issues: ['Mobile menu did not close'], httpStatus: 200 });
        }
      }
    }

    // Test scroll hide-on-scroll
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);

    // Scroll down
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
    await page.waitForTimeout(600);
    const headerHidden = await page.evaluate(() => {
      const h = document.querySelector('.header');
      return h ? h.classList.contains('header--hidden') : null;
    });
    await page.screenshot({ path: path.join(OUT, 'interaction_scroll-down.png') });

    // Scroll back up
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
    await page.waitForTimeout(600);
    const headerRevealed = await page.evaluate(() => {
      const h = document.querySelector('.header');
      return h ? !h.classList.contains('header--hidden') : null;
    });
    await page.screenshot({ path: path.join(OUT, 'interaction_scroll-up.png') });

    if (headerHidden && headerRevealed) {
      results.push({ page: 'interaction', viewport: 'desktop', status: 'PASS', issues: ['Hide-on-scroll works: hides down, reveals up'], httpStatus: 200 });
    } else {
      results.push({ page: 'interaction', viewport: 'desktop', status: 'ISSUES', issues: [`Hide-on-scroll: hidden=${headerHidden}, revealed=${headerRevealed}`], httpStatus: 200 });
    }

    // Test header scrolled state (transparent → solid)
    const headerScrolled = await page.evaluate(() => {
      const h = document.querySelector('.header');
      return h ? h.classList.contains('header--scrolled') : null;
    });
    if (headerScrolled) {
      results.push({ page: 'interaction', viewport: 'desktop', status: 'PASS', issues: ['Header adds --scrolled class on scroll'], httpStatus: 200 });
    }

    // Test quiz start
    await page.goto(`${BASE}/pages/quiz`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const quizStart = page.locator('[data-quiz-start]').first();
    if (await quizStart.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quizStart.click();
      await page.waitForTimeout(800);
      const questionVisible = await page.locator('[data-quiz-question]').first().isVisible({ timeout: 2000 }).catch(() => false);
      await page.screenshot({ path: path.join(OUT, 'interaction_quiz-q1.png') });

      if (questionVisible) {
        // Check quiz options are styled
        const optionCount = await page.locator('.quiz-option').count();
        results.push({ page: 'quiz-interaction', viewport: 'desktop', status: optionCount > 0 ? 'PASS' : 'ISSUES', issues: [optionCount > 0 ? `Quiz options render (${optionCount} found with .quiz-option class)` : 'Quiz options missing .quiz-option class'], httpStatus: 200 });

        // Click an option
        if (optionCount > 0) {
          await page.locator('.quiz-option').first().click();
          await page.waitForTimeout(300);
          const selectedCount = await page.locator('.quiz-option--selected').count();
          results.push({ page: 'quiz-interaction', viewport: 'desktop', status: selectedCount > 0 ? 'PASS' : 'ISSUES', issues: [selectedCount > 0 ? 'Quiz option selection works (.quiz-option--selected applied)' : 'Quiz option selection broken'], httpStatus: 200 });
          await page.screenshot({ path: path.join(OUT, 'interaction_quiz-selected.png') });
        }
      } else {
        results.push({ page: 'quiz-interaction', viewport: 'desktop', status: 'ISSUES', issues: ['Question screen did not appear after clicking Start'], httpStatus: 200 });
      }
    }

    // Test cart drawer
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500);
    const cartBtn = page.locator('#cart-toggle, [data-cart-toggle]').first();
    if (await cartBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cartBtn.click();
      await page.waitForTimeout(600);
      const cartDrawer = page.locator('.cart-drawer');
      const cartOpen = await cartDrawer.evaluate(el => el.classList.contains('is-open')).catch(() => false);
      await page.screenshot({ path: path.join(OUT, 'interaction_cart-drawer.png') });
      results.push({ page: 'interaction', viewport: 'desktop', status: cartOpen ? 'PASS' : 'ISSUES', issues: [cartOpen ? 'Cart drawer opens' : 'Cart drawer did not open'], httpStatus: 200 });
    }

  } catch (err) {
    results.push({ page: 'interaction', viewport: 'all', status: 'ERROR', issues: [err.message.substring(0, 120)], httpStatus: 0 });
  } finally {
    await page.close();
  }
}

async function main() {
  log('Starting full site audit...');
  const browser = await chromium.launch({ headless: true });

  // Create context and unlock password
  const context = await browser.newContext({ viewport: VIEWPORTS[0] });
  const setupPage = await context.newPage();
  await unlockPassword(setupPage);
  await setupPage.close();

  // Test all pages at all viewports
  for (const viewport of VIEWPORTS) {
    log(`\n=== ${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height}) ===`);
    const vpContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });

    // Copy cookies for password
    const cookies = await context.cookies();
    await vpContext.addCookies(cookies);

    for (const pageInfo of PAGES) {
      await testPage(vpContext, pageInfo, viewport);
    }
    await vpContext.close();
  }

  // Test interactions
  const interactionContext = await browser.newContext({ viewport: VIEWPORTS[0] });
  const interactionCookies = await context.cookies();
  await interactionContext.addCookies(interactionCookies);
  await testInteractions(interactionContext);
  await interactionContext.close();

  await context.close();
  await browser.close();

  // Print results
  console.log('\n\n' + '='.repeat(80));
  console.log('FULL SITE AUDIT RESULTS');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS');
  const issues = results.filter(r => r.status === 'ISSUES');
  const errors = results.filter(r => r.status === 'ERROR');

  console.log(`\nTotal: ${results.length} tests | PASS: ${passed.length} | ISSUES: ${issues.length} | ERRORS: ${errors.length}\n`);

  if (issues.length > 0 || errors.length > 0) {
    console.log('--- ISSUES & ERRORS ---');
    [...issues, ...errors].forEach(r => {
      console.log(`  ${r.status} | ${r.page} (${r.viewport}) | ${r.issues.join('; ')}`);
    });
  }

  console.log('\n--- ALL RESULTS ---');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? 'OK' : r.status === 'ISSUES' ? '!!' : 'XX';
    console.log(`  [${icon}] ${r.page.padEnd(20)} ${r.viewport.padEnd(8)} ${r.issues.join('; ')}`);
  });

  // Save results as JSON
  fs.writeFileSync(path.join(OUT, 'audit-results.json'), JSON.stringify(results, null, 2));
  console.log(`\nScreenshots saved to: ${OUT}`);
  console.log(`Results JSON: ${path.join(OUT, 'audit-results.json')}`);
}

main().catch(console.error);
