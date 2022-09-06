import { createWorker } from 'tesseract.js'
import chalk from 'chalk'
import Jimp from 'jimp'
import * as fs from 'fs'

const imagesDirPath = '../teste/'
const txtFilePath = './values.txt'

const cropCoords = {
  'part1': [1, 20, 200, 30],
  'part2': [278, 100, 237, 460],
  'part3': [510, 100, 237, 460]
}

const headerTM = [
  'Serial', 'RTD-A', 'RTD-B', 'TC1-CR', 'TC1-CL', 'TC2-CR', 'TC2-CL',
  'Saida_mA1-1mA', 'Saida_mA1-5mA', 'Saida_mA1-10mA', 'Saida_mA1-20mA',
  'Saida_mA2-1mA', 'Saida_mA2-5mA', 'Saida_mA2-10mA', 'Saida_mA2-20mA'
]

const handFillFields = {
  'Produto'    : '""',
  'VersãoFW'   : '""',
  'TCExterno'  : '""',
  'Data'       : '""',
  'Responsavel': '""',
  'Verify-1to9': 'OK',
  'Reles'      : 'OK',
  'I(MA)'      : 'OK',
  'I(A)'       : 'OK',
  'RS232/485'  : 'OK',
  'Burn-in(IN)' :'18:00',
  'Burn-in(Out)':'06:00'
}

const regExpTM = {
  'Serial': /númerodesérie:\d{6}/i,
  'RTD-A': /RTDA:?\d{3}(?:,\d)?/i,
  'RTD-B': /RTD[5B8]?:\d{3}(?:,\d)?/i,
  'TC-CR': /correntedereferência:(?:\d,\d{2})|(?:n\/a)/i,
  'TC-CL': /correntelida:(?:\d,\d{2})|(?:n\/a)/i,
  'Saida-1mA': /[1i]ma:\d{2}/i,
  'Saida-5mA': /[s5]ma:?\d{2}/i,
  'Saida-10mA': /10ma:?\d{2}/i,
  'Saida-20mA': /20ma:?\d{2}/i,
}

function addHandFillHeader(to) {
  let arr = Object.keys(handFillFields)
  to.splice(1, 0, ...arr)
  console.log('>>> AddHandFillHeader Done.')
}

function writeHeader(header) {
  fs.writeFile(txtFilePath, header.join(" ") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to write header', err)
  })
  console.log(chalk.green('>>> Header writed to file.\n'))
}

async function cropImage(imgPath) {
  console.log(chalk.blue(`>>> ImagePath: ${imgPath}`))
  try {
    for (let i = 0; i < 3; i++) {
      const image = await Jimp.read(imgPath)
      image.grayscale()
      image.crop(...cropCoords[Object.keys(cropCoords)[i]])
      await image.writeAsync(`cropped_images/cropped_part${i + 1}.png`)
    }
  } catch (error) {
    throw new Error('Failed to crop the image: ', error)
  }
  console.log('>>> cropImage Done.')
}

async function ocrImage(part) {
  console.log(`>>> OCR cropped_${part} Start`)
  try {
    const worker = createWorker({
      //logger: m => console.log(m),
    })
    await worker.load()
    await worker.loadLanguage('por')
    await worker.initialize('por')
    const { data: { text } } = await worker.recognize(`./cropped_images/cropped_${part}.png`)
    await worker.terminate()
    return text

  } catch (error) {
    throw new Error('Failed to recognize characters: ', error)
  } finally {
    console.log(`>>> OCR cropped_${part} Done.`)
  }
}

function processData(text1, text2, text3) {
  let data = (text1 + text2 + text3)
  if (!data) throw new Error('ProcessData must receive string type')   // REFATORAR Erro se typeof text1, text2 ou text3... não for string
  data = data.replace(/\s/g, '')
  data = data.replace("'", '')
  data = data.replace('"', '')
  console.log('>>> processData Done.')
  return data
}

function getValues(text) {
  let repeatCalibraçãoSaida = true
  let repeatCalibraçãoTC = true
  let regExpValues = Object.values(regExpTM)
  const arr = []
  let acc = 0

  for (let i = 0; i < regExpValues.length; i++) {
    let result = regExpValues[i].exec(text)
    if (result) {
      result = result.toString()
      if (i == 0) arr.push(result.slice(-6))
      if (i == 1) result.length < 9 ? arr.push(result.slice(-3)) : arr.push(result.slice(-5))
      if (i == 2) result.length < 9 ? arr.push(result.slice(-3)) : arr.push(result.slice(-5))
      if (i == 3) arr.push(result.slice(-4))
      if (i == 4) arr.push(result.slice(-4))
      if (i == 5) arr.push(result.slice(-2))
      if (i == 6) arr.push(result.slice(-2))
      if (i == 7) arr.push(result.slice(-2))
      if (i == 8) arr.push(result.slice(-2))

      if (i == 4 && repeatCalibraçãoTC) { i = 2; repeatCalibraçãoTC = false; }
      if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; }

      text = text.replace(result, (chalk.bgGreen('###')))
    } else if (result == undefined) {
      acc++
      arr.push('#ERROR#')
    }
  }
  console.log('>>> getValues Done.')
  if (acc) { console.error(chalk.red(`### ${acc} regExp not found.`)) }
  return arr
}

function addHandFillFields(to) {
  let arr = Object.values(handFillFields)
  to.splice(1, 0, ...arr)
  console.log('>>> AddHandFillFields Done.')
}

async function appendValues(arrValues) {
  fs.appendFile(txtFilePath, arrValues.join(" ") + '\n', 'utf8', (err) => {
    if (err) throw new Error('Failed to append values: ', err)
  })

  sleep(6000)
  console.log(chalk.green('>>> Values Appended to file.\n'))
}

function startingLog() {
  console.log(chalk.bgGreen('>>>         Starting Program         <<<\n'))
}

let counter = 1
function counterImagesLog(files) {
  console.log(chalk.green(`>>> ImagesCounter: ${counter}/${files.length}`))
  counter++
}

function finishLog() {
  sleep(8000)
  console.log(chalk.bgGreen('>>>         Program Finished         <<<\n'))
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
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

(async () => {
  startingLog()
  addHandFillHeader(headerTM)
  writeHeader(headerTM)

  const files = await fs.promises.readdir(imagesDirPath, (err) => {
    if (err) return console.log('Unable to scan directory: ' + err)
  })

  for (const file of files) {
    counterImagesLog(files)
    await main(imagesDirPath + file)
  }
  finishLog()
})()
