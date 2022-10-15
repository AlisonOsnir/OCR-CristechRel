import { createWorker } from 'tesseract.js'
import chalk from 'chalk'
import Jimp from 'jimp'
import * as fs from 'fs'
import xlsx from 'xlsx'
import process from "process"

const imagesDirPath = './screenshots/'
const tsvFilePath = './outputs/values.tsv'
const xlsFilePath = './outputs/output.xls'

const cropCoords = {
  'part1': [1, 20, 200, 30],
  'part2': [282, 140, 228, 370],
  'part3': [512, 100, 220, 313]
}

const header = [
  'Serial', 'RTD-A', 'RTD-B', 'TC1-CR', 'TC1-CL', 'TC2-CR', 'TC2-CL',
  'Saida_mA1-1mA', 'Saida_mA1-5mA', 'Saida_mA1-10mA', 'Saida_mA1-20mA',
  'Saida_mA2-1mA', 'Saida_mA2-5mA', 'Saida_mA2-10mA', 'Saida_mA2-20mA'
]

const handFillFields = {
  'Produto'     : '""',
  'VersaoFW'    : '""',
  'TCExterno'   : '""',
  'Data'        : '""',
  'Responsavel' : '""',
  'Verify-1to9' : 'OK',
  'Reles'       : 'OK',
  'I(MA)'       : 'OK',
  'I(A)'        : 'OK',
  'RS232/485'   : 'OK',
  'Burn-in(IN)' : '18:00',
  'Burn-in(Out)': '06:00'
}

const regex = {
  'Serial'    : /númerodesérie:(\d{6})/i,
  'RTD-A'     : /RTDA:?(\d{3}(?:,\d)?)/i,
  'RTD-B'     : /RTD[5B8]?:(\d{3}(?:,\d)?)/i,
  'TC-CR'     : /correntedereferência:((?:\d,\d{2})|(?:n\/a))/i,
  'TC-CL'     : /correntelida:((?:\d,\d{2})|(?:n\/a))/i,
  'Saida-1mA' : /[1i]ma:?(\d{2})/i,
  'Saida-5mA' : /[5s]ma:?(\d{2})/i,
  'Saida-10mA': /10ma:?(\d{2})/i,
  'Saida-20mA': /20ma:?(\d{2})/i,
}

const log = {
  'start'            : () => console.log(chalk.bgGreen('\n>>>       Starting Program       <<<\n')),
  'finish'           : () => console.log(chalk.bgGreen('>>>       Program Finished       <<<')),
  'AddHandFillHeader': () => console.log('>>> AddHandFillHeader Done.'),
  'writeHeader'      : () => console.log(chalk.green('>>> Header writed to file.\n')),
  'imagePath'        : (img)  => console.log(chalk.blue(`>>> ImagePath: ${img}`)),
  'getImageDate'     : (date) => console.log(chalk.blue(`>>> ImageDate: ${date}`)),
  'cropImage'        : () => console.log('>>> cropImage Done.'),
  'ocrImage'         : (img)  => console.log(` OCR cropped ${img} Done.`),
  'processData'      : () => console.log('>>> processData Done.'),
  'getValues'        : () => console.log('>>> getValues Done.'),
  'AddHandFillFields': () => console.log('>>> AddHandFillFields Done.'),
  'appendValues'     : () => console.log(chalk.green('>>> Values Appended to file.\n')),
  'writeExcel'       : () => console.log(chalk.green('>>> writeExcel Done.\n'))
  }

function addHandFillHeader(to) {
  let arr = Object.keys(handFillFields)
  to.splice(1, 0, ...arr)
  log.AddHandFillHeader()
}

function writeHeader(header) {
  fs.writeFile(tsvFilePath, header.join("\t") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to write header', err)
  })
  log.writeHeader()
}

async function cropImage(img) {
  log.imagePath(img)
  try {
    for (let i = 0; i < 3; i++) {
      const image = await Jimp.read(img)
      //image.grayscale()
      image.crop(...cropCoords[Object.keys(cropCoords)[i]])
      await image.writeAsync(`image_crops/part${i + 1}.png`)
    }
  } catch (error) {
    throw new Error('Failed to crop the image: ', error)
  }
  log.cropImage()
}

class LoadingIndicator {
  constructor(size) {
    this.size = size
    this.cursor = 0
    this.timer = null
  }
start() {
   this.timer = setInterval(() => {
      process.stdout.write(">")
      this.cursor++;
      if (this.cursor >= this.size) {
        clearTimeout(this.timer)
      }
    }, 1500)
  }
}

async function ocrImage(img) {
  try {
    const ld = new LoadingIndicator(3)
    ld.start()
    const worker = createWorker({
      //logger: m => console.log(m),
    })
    await worker.load()
    await worker.loadLanguage('por')
    await worker.initialize('por')
    const { data: { text } } = await worker.recognize(`./image_crops/${img}.png`)
    await worker.terminate()
    return text

  } catch (error) {
    throw new Error('Failed to recognize characters: ', error)
  } finally {
    log.ocrImage(img)
  }
}

function processData(text1, text2, text3) {
  let text = (text1 + text2 + text3)
  if (!text) throw new Error('ProcessData must receive a string')
  text = text.replace(/\s/g, '')
  text = text.replace("'", '')
  text = text.replace('"', '')
  log.processData()
  return text
}

function getValues(text) {
  let repeatCalibraçãoSaida = true
  let repeatCalibraçãoTC = true
  let re = Object.values(regex)
  let errCounter = 0
  const result = []

  for (let i = 0; i < re.length; i++) {
    let match = re[i].exec(text)

    if (match !== null) {
      const matchValue = match[1].toString()
      result.push(matchValue)

      if (i == 4 && repeatCalibraçãoTC) { i = 2; repeatCalibraçãoTC = false; }
      if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; }

      text = text.replace(match[0], (chalk.bgGreen('___')))
    } else {
      errCounter++
      result.push('#ERROR#')
    }
  }
  if (errCounter) { console.error(chalk.red(`>>> Error: ${errCounter} values not found.`)) }
  log.getValues()
  return result
}

function getImageDate(imagePath) {
  fs.stat(imagePath, (err, stats) => {
    if (err) {
      return console.Error('err birthtime not found'+ err)
    }
    let date = stats.birthtime
    date = date.toLocaleDateString()
    handFillFields.Data = date
    log.getImageDate(date)
  })
}

function addHandFillFields(to) {
  let arr = Object.values(handFillFields)
  to.splice(1, 0, ...arr)
  log.AddHandFillFields()
}

async function appendValues(arrValues) {
  await fs.promises.appendFile(tsvFilePath, arrValues.join("\t") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to append values: ', err)
  })
  log.appendValues()
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

let processCounter = 1
function processCounterLog(files) {
  console.log(chalk.green(`>>> Processing: ${processCounter}/${files.length}`))
  processCounter++
}

async function main(imagePath) {
  await cropImage(imagePath)
  let crop1 = await ocrImage('part1')
  let crop2 = await ocrImage('part2')
  let crop3 = await ocrImage('part3')
  let text = processData(crop1, crop2, crop3)
  let values = getValues(text)
  addHandFillFields(values)
  await appendValues(values)
}

async function writeExcel(tsvFile) {
  const txt = xlsx.readFile(tsvFile, String)
  await xlsx.writeFile(txt, xlsFilePath)
  log.writeExcel()
}

async function init() {

  log.start()
  addHandFillHeader(header)
  writeHeader(header)
  
  const files = await fs.promises.readdir(imagesDirPath, (err) => {
    if (err) return console.log('Unable to scan directory: ' + err)
  })
  
  for (const file of files) {
    processCounterLog(files)
    getImageDate(imagesDirPath + file)
    await main(imagesDirPath + file)
  }
  await writeExcel(tsvFilePath)
  log.finish()
  sleep(6000)
}

init()
