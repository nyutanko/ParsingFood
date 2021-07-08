const csv = require('csv-parser')
const fs = require('fs')
const puppeteer = require('puppeteer')

const results = []
const link = 'https://www.doordash.com/'

fs.createReadStream('Anya_Config.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
    });

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()

    await page.goto(`${link}`)
    await page.waitForTimeout(4000)

    const input = await page.waitForXPath("//input[@aria-label='Your delivery address']")
    await input.type('New York, NY', { delay: 500 })

    await page.click('[aria-label="Find Restaurants"]')
    //await browser.close()
  } catch (e) {
    console.log(e)
  }
})()