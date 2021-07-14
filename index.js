const csv = require('csv-parser')
const fs = require('fs')
const puppeteer = require('puppeteer')
const mysql = require('mysql2')

const results = []
const link = 'https://www.doordash.com/'

const connection = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'myphp'
})

fs.createReadStream('Anya_Config.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    (async () => {
      let res = [] // массив данных о каждом кафе разных адрессов
      let nameData = [] // новый (отформатированный) масив имен каждого кафе
      const allData = [] // массив объектов для записи в базу

      try {
        for (let i = 0; i < results.length; i++) {
          const name = results[i].street_address + ', ' + results[i].city + ', ' + results[i].state

          const browser = await puppeteer.launch({ headless: true })
          const page = await browser.newPage()
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')

          await page.goto(`${link}`)
          await page.waitForTimeout(4000)

          const input = await page.waitForXPath("//input[@aria-label='Your delivery address']")
          await input.type(name, { delay: 0 })

          await page.waitForTimeout(4000)
          await page.click('[aria-label="Find Restaurants"]')
          await page.waitForTimeout(10000)

          // пролистываем вниз страницу для полной загрузки всех элементов
          async function autoScroll (page) {
            await page.evaluate(async () => {
              await new Promise((resolve, reject) => {
                let totalHeight = 0
                const distance = 100
                const timer = setInterval(() => {
                  const scrollHeight = document.body.scrollHeight
                  window.scrollBy(0, distance)
                  totalHeight += distance

                  if (totalHeight >= scrollHeight) {
                    clearInterval(timer)
                    resolve()
                  }
                }, 100)
              })
            })
          }

          await autoScroll(page)

          const data = await page.evaluate(function () {
            const page1 = []
            try {
              // собираем информацию по каждому элементу данного адресса
              const divs = document.querySelectorAll('div.sc-gYtlsd.jRfBKF')
              const NotClosedTitle = 'span.sc-bdVaJa.ifxOuM'
              const NotNewlyAdded = 'span.sc-imAxmJ.gzzCOf.sc-bdVaJa.faeMdB'
              const StatusClosed = 'span.sc-bdVaJa.FOENe'
              divs.forEach(div => {
                const obj = {
                  title: div.querySelector(NotClosedTitle) !== null
                    ? div.querySelector(NotClosedTitle).innerText
                    : div.querySelector('span.sc-bdVaJa.hvEHuL').innerText,
                  time: div.querySelector('span.sc-kbGplQ.hbhnxy.sc-bdVaJa.cblJST').innerText,
                  cost: div.querySelector('span.sc-bdVaJa.szuww').innerText,
                  rating: div.querySelector(NotNewlyAdded) !== null
                    ? div.querySelector(NotNewlyAdded).innerText
                    : 'Newly Added',
                  status: div.querySelector(StatusClosed) !== null
                    ? div.querySelector(StatusClosed).innerText
                    : 'Open'
                }
                page1.push(obj)
              })
            } catch (e) {
              console.error(e)
            }
            return page1
          }, {})

          // пушим данные в массив для каждого адресса
          await res.push(data)
          res = res.flat()

          // массив названий улиц/адресса
          nameData.push(name)
          nameData = nameData.flat()

          await browser.close()
        }

        console.log('The number of cafes: ', res.length)

        // создаем массив объектов
        for (let y = 0; y < results.length; y++) {
          for (let i = 0; i < res.length; i++) {
            const everyData = [nameData[y], res[i].title, res[i].time, res[i].cost, res[i].rating, res[i].status]
            allData.push(everyData)
          }
        }

        // записываем данные в базу
        const sql = 'INSERT INTO doordash0(address, title, time, cost, rating, status) VALUES ?'
        connection.query(sql, [allData], function (err) {
          if (err) throw err
          else console.log('Данные добавлены')
        })

      } catch (e) {
        console.error(e)
      }
    })()
  })
