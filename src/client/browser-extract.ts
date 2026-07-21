import { chromium, type Browser, type Page } from "playwright-core";
import { readCookies } from "../storage.js";
import type { TweetResult } from "./search.js";

interface BrowserExtractOptions {
  headless?: boolean;
}

async function launchBrowser(headless = true): Promise<Browser> {
  return chromium.launch({
    headless,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
}

async function setupPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  const cookies = await readCookies();
  if (cookies) {
    await context.addCookies([
      {
        name: "auth_token",
        value: cookies.auth_token,
        domain: ".x.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
      {
        name: "ct0",
        value: cookies.ct_n,
        domain: ".x.com",
        path: "/",
        secure: true,
      },
    ]);
  }

  return context.newPage();
}

function extractTweetsFromDOM(): TweetResult[] {
  const articles = document.querySelectorAll("article[data-testid='tweet']");
  const tweets: TweetResult[] = [];

  articles.forEach((a) => {
    const textEl = a.querySelector("[data-testid='tweetText']");
    const userLinks = a.querySelectorAll("[data-testid='User-Name'] a");
    const timeEl = a.querySelector("time");
    const linkEls = a.querySelectorAll('a[href*="/status/"]');
    const likeBtn = a.querySelector("[data-testid='like']");
    const replyBtn = a.querySelector("[data-testid='reply']");
    const retweetBtn = a.querySelector("[data-testid='retweet']");

    const extractCount = (el: Element | null): number => {
      if (!el) return 0;
      const aria = el.getAttribute("aria-label") || "";
      const m = aria.match(/([\d,]+)/);
      if (m && m[1]) return parseInt(m[1].replace(/,/g, ""), 10);
      const text = el.textContent || "";
      const m2 = text.match(/([\d,]+)/);
      return m2 && m2[1] ? parseInt(m2[1].replace(/,/g, ""), 10) : 0;
    };

    let tweetLink = "";
    linkEls.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href.match(/\/status\/\d+/)) {
        tweetLink = "https://x.com" + href;
      }
    });

    const link0 = userLinks[0];
    const link1 = userLinks[1];

    tweets.push({
      id: tweetLink.match(/\/status\/(\d+)/)?.[1] || "",
      text: textEl ? textEl.textContent || "" : "",
      authorHandle: link1
        ? link1.textContent || ""
        : link0
          ? (link0.getAttribute("href") || "").replace(/.*\//, "@")
          : "",
      authorName: link0 ? link0.textContent || "" : "",
      authorId: "",
      createdAt: timeEl ? timeEl.getAttribute("datetime") || "" : "",
      likeCount: extractCount(likeBtn),
      retweetCount: extractCount(retweetBtn),
      replyCount: extractCount(replyBtn),
      mediaUrls: [],
    });
  });

  return tweets;
}

export async function searchViaBrowser(
  query: string,
  type: "top" | "latest" = "top",
  count = 20,
  opts?: BrowserExtractOptions,
): Promise<{ tweets: TweetResult[] }> {
  const browser = await launchBrowser(opts?.headless ?? true);
  try {
    const page = await setupPage(browser);

    const searchType = type === "top" ? "top" : "live";
    const url = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=${searchType}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    await page.waitForSelector("article[data-testid='tweet']", {
      timeout: 15_000,
    });

    const targetCount = Math.min(count, 50);
    let previousHeight = 0;
    let tweets: TweetResult[] = [];

    for (let i = 0; i < 10; i++) {
      tweets = await page.evaluate(extractTweetsFromDOM);
      if (tweets.length >= targetCount) break;

      const height = await page.evaluate(() => document.body.scrollHeight);
      if (height === previousHeight) break;
      previousHeight = height;

      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1500);
    }

    return { tweets: tweets.slice(0, count) };
  } finally {
    await browser.close();
  }
}
