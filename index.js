const csv = require('csv-parser')
const fs = require('fs')
const puppeteer = require('puppeteer')

const results = []
const link = 'https://www.doordash.com/'

fs.createReadStream('Anya_Config.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    (async () => {
      try {
        for (let i = 0; i < results.length; i++) {
          const browser = await puppeteer.launch({ headless: false })
          const page = await browser.newPage()

          await page.goto(`${link}`)
          await page.waitForTimeout(4000)

          const input = await page.waitForXPath("//input[@aria-label='Your delivery address']")
          await input.type(results[i].street_address + ', ' + results[i].city + ', ' + results[i].state, { delay: 0 })

          await page.waitForTimeout(4000)
          await page.click('[aria-label="Find Restaurants"]')
          await page.waitForTimeout(10000)

          const data = await page.evaluate(async () => {
            const page1 = []
            try {
              const divs = document.querySelectorAll('div.sc-kDgGX.gKFMFn')
              divs.forEach(div => {
                const obj = {
                  title: div.querySelector('span.sc-bdVaJa.ifxOuM') !== null
                    ? div.querySelector('span.sc-bdVaJa.ifxOuM').innerText
                    : div.querySelector('span.sc-bdVaJa.hvEHuL').innerText,
                  time: div.querySelector('span.sc-exdmVY.gEtwSn.sc-bdVaJa.cblJST').innerText,
                  cost: div.querySelector('span.sc-bdVaJa.szuww').innerText,
                  rating: div.querySelector('span.sc-iWadT.gQHqfQ.sc-bdVaJa.faeMdB') !== null
                    ? div.querySelector('span.sc-iWadT.gQHqfQ.sc-bdVaJa.faeMdB').innerText
                    : 'Newly Added',
                  status: div.querySelector('span.sc-bdVaJa.FOENe') !== null
                    ? div.querySelector('span.sc-bdVaJa.FOENe').innerText
                    : 'Open'
                }
                page1.push(obj)
              })
            } catch (e) {
              console.log(e)
            }
            return page1
          }, {})

          await browser.close()
        }
      } catch (e) {
        console.log(e)
      }
    })()
  })
