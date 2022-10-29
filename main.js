const { createWorker, createScheduler } = require('tesseract.js')
const chalk = require('chalk')
const fs = require('fs')
const xlsx = require('xlsx')
const process = require("process")
const log = require('./logs.cjs')

const imagesDirPath = './screenshots/'
const tsvFilePath = './outputs/values.tsv'
const xlsFilePath = './outputs/output.xls'
const errors = {}

const header = [
  'Serial', 'TC1-CR', 'TC1-CL', 'TC2-CR', 'TC2-CL', 'RTD-A', 'RTD-B',
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
  'TC-CR'     : /correntedereferência:((?:\d,\d{2})|(?:n\/a))/i,
  'TC-CL'     : /correntelida:((?:\d,\d{2})|(?:n\/a))/i,
  'RTD-A'     : /RTDA:?(\d{3}(?:,\d)?)/i,
  'RTD-B'     : /RTD[5B8]?:(\d{3}(?:,\d)?)/i,
  'Saida-1mA' : /[1i]ma:?(\d{2})/i,
  'Saida-5mA' : /[5s]ma:?(\d{2})/i,
  'Saida-10mA': /10ma:?(\d{2})/i,
  'Saida-20mA': /20ma:?(\d{2})/i,
}

function addHandFillHeader(to) {
  let arr = Object.keys(handFillFields)
  to.splice(1, 0, ...arr)
  log.addHandFillHeader()
}

function writeHeader(header) {
  fs.writeFile(tsvFilePath, header.join("\t") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to write header', err)
  })
  log.writeHeader()
}

let processCounter = 1
function processCounterLog(files) {
  console.log(chalk.green(`>>> Processing: ${processCounter}/${files.length}`))
  processCounter++
}

function getImageDate(imagePath) {
  fs.stat(imagePath, (err, stats) => {
    if (err) { throw new Error('Last modified date not found', err) }
    let date = stats.mtime
    date = date.toLocaleDateString()
    handFillFields.Data = date
    log.getImageDate(date)
  })
}

class LoadingArrow {
  constructor(qtde) {
    this.qtde = qtde
    this.cursor = 0
    this.timer = null
  }
  start() {
    this.timer = setInterval(() => {
      process.stdout.write(">")
      this.cursor++;
      if (this.cursor >= this.qtde) {
        clearTimeout(this.timer)
      }
    }, 1500)
  }
}

async function ocrImage(imagePath) {
  new LoadingArrow(3).start()
  
  const scheduler = createScheduler();
  const worker1 = createWorker();
  const worker2 = createWorker();
  const worker3 = createWorker();
  const rectangles = [
    {
      left: 1,
      top: 20,
      width: 200,
      height: 30,
    },
    {
      left: 282,
      top: 140,
      width: 228,
      height: 310,
    },
    {
      left: 512,
      top: 100,
      width: 220,
      height: 313,
    },
  ];

  await worker1.load();
  await worker2.load();
  await worker3.load();
  await worker1.loadLanguage('por');
  await worker2.loadLanguage('por');
  await worker3.loadLanguage('por');
  await worker1.initialize('por');
  await worker2.initialize('por');
  await worker3.initialize('por');
  scheduler.addWorker(worker1);
  scheduler.addWorker(worker2);
  scheduler.addWorker(worker3);
  const results = await Promise.all(rectangles.map((rectangle) => (
    scheduler.addJob('recognize', imagePath, { rectangle })
  )));
  let text = (results.map(r => r.data.text));
  await scheduler.terminate();
  log.ocrImage()
  return text
}

function processData(textArr) {
  let data = textArr.join('')
  data = data.replace(/\s/g, '')
  data = data.replace("'", '')
  data = data.replace('"', '')
  log.processData()
  return data
}

function getValues(data, imagePath) {
  let repeatCalibraçãoSaida = true
  let repeatCalibraçãoTC = true
  let re = Object.values(regex)
  let errCounter = 0
  const result = []

  for (let i = 0; i < re.length; i++) {
    let match = re[i].exec(data)
    if (match !== null) {
      const matchValue = match[1].toString()
      result.push(matchValue)
      data = data.replace(match[0], (chalk.bgGreen('___')))
    } else {
      errCounter++
      result.push("#ERROR")
    }
    if (i == 2 && repeatCalibraçãoTC) { i = 0; repeatCalibraçãoTC = false; }
    if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; }
  }
  if (errCounter) {
    log.getValuesError(errCounter)
    errors[imagePath] = errCounter
  }
  log.getValues()
  return result
}

function addHandFillFields(to) {
  let arr = Object.values(handFillFields)
  to.splice(1, 0, ...arr)
  log.addHandFillFields()
}

async function appendValues(arrValues) {
  await fs.promises.appendFile(tsvFilePath, arrValues.join("\t") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to append values', err)
  })
  log.appendValues()
}

async function writeExcel(tsvFile) {
  const txt = xlsx.readFile(tsvFile, String)
  await xlsx.writeFile(txt, xlsFilePath)
  log.writeExcel()
}

function reportValuesError() {
  if (Object.keys(errors).length > 0) {
    for (const key in errors) {
      log.reportValuesError(key, errors)
    }
    console.log('\n')
  }
}

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

async function main(imagePath) {
  let text = await ocrImage(imagePath)
  let data = processData(text)
  let values = getValues(data, imagePath)
  addHandFillFields(values)
  await appendValues(values)
}

async function init() {
  log.startProgram()
  addHandFillHeader(header)
  writeHeader(header)

  const files = await fs.promises.readdir(imagesDirPath, (err) => {
    if (err) throw new Error('Unable to scan directory: ' + err)
  })

  if (files.length === 0) log.emptyFolderError()

  for (const file of files) {
    processCounterLog(files)
    getImageDate(imagesDirPath + file)
    await main(imagesDirPath + file)
  }

  await writeExcel(tsvFilePath)
  reportValuesError()
  log.finishProgram()
  sleep(3000)
}

init()
