import axios from "axios";
import puppeteer from "puppeteer";
const db: any = require("../db");

interface HtmlChanges {
  htmlChanged: boolean;
  htmlContent: string;
}

interface ScrapedHTMLData {
  pageUrl: string;
  htmlContent: string;
}

async function scrapeWebsite(url: string): Promise<string> {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
    });
    const page = await browser.newPage();
    await page.goto(url, { timeout: 60000 });
    const scrapedData = await page.evaluate(() => {
      // Select specific HTML elements containing text content
      const textElements = document.querySelectorAll("td");

      // Extract text content from selected elements
      const allText = Array.from(textElements)
        .map((element) => element.textContent || "")
        .join("\n");

      return allText;
    });
    await browser.close();
    return scrapedData;
  } catch (error) {
    console.error("Error occurred while scraping website:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

async function getHTMLAndCompare(
  websitePageName: string,
  pageURL: string
): Promise<void> {
  const collectionName = "stringifiedHTML";
  try {
    const html = await db.collection(collectionName).doc(websitePageName).get();
    if (html.exists) {
      const htmlContent: string = html.data()?.htmlContent;
      const value = await checkForHtmlChanges(htmlContent, pageURL);
      if (value.htmlChanged) {
        console.log("HTML content has changed. Updating database...");
        // Calling the cloud function to activate
        axios
          .post(
            "https://us-central1-f1-api-58639.cloudfunctions.net/seedStandings"
          )
          .then((response) => {
            // This will log the response data
            console.log(
              "Cloud function running, scraping from ",
              websitePageName
            );
          })
          .catch((error) => {
            console.error("Error fetching data:", error);
          });
        const updatedObject: ScrapedHTMLData = {
          pageUrl: pageURL,
          htmlContent: value.htmlContent,
        };
        await db
          .collection(collectionName)
          .doc(websitePageName)
          .set(updatedObject);
      } else {
        console.log("HTML content is the same. No need to update.");
      }
    } else {
      console.log("No existing HTML content found. Scraping website...");
      const websiteScrapeString = await scrapeWebsite(pageURL);
      const websiteObject: ScrapedHTMLData = {
        pageUrl: pageURL,
        htmlContent: websiteScrapeString,
      };
      await db
        .collection(collectionName)
        .doc(websitePageName)
        .set(websiteObject);
      console.log("HTML content saved to the database.");
    }
  } catch (error) {
    console.error("Error occurred while fetching or comparing HTML:", error);
    // Handle or propagate the error as needed
  }
}

async function checkForHtmlChanges(
  htmlContent: string,
  url: string
): Promise<HtmlChanges> {
  try {
    const websiteHtml = await scrapeWebsite(url);
    return {
      htmlChanged: htmlContent !== websiteHtml,
      htmlContent: websiteHtml,
    };
  } catch (error) {
    console.error("Error occurred while checking for HTML changes:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Example usage
getHTMLAndCompare(
  "f1-drivers-standings",
  "https://www.formula1.com/en/results.html/2023/drivers.html"
)
  .then(() => {
    console.log("HTML comparison completed.");
  })
  .catch((error) => {
    console.error("Error occurred during HTML comparison:", error);
  });
