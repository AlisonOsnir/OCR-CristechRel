const directoryInput = document.querySelector('#directoryInput')
const selectDirectoryBtn = document.querySelector('.selectDirectory')
const initializeBtn = document.querySelector('.initializeBtn')
const outputBtn = document.querySelectorAll('.outputBtn')
const form = document.querySelector('form')
const terminal = document.querySelector('.terminal')
const progressbar = document.querySelector(".progress");


const tsvFilePath = './outputs/output.tsv'
const xlsFilePath = './outputs/output.xls'
const errors = {}

let diretoryPath = null
let files = null
let header = []
let inputValues = {}
let processCounter = 1

const regExp = {
  'Serial': /númerodesérie:(\d{6})/i,
  'TC-CR': /correntedereferência:((?:\d,\d{2})|(?:n\/a))/i,
  'TC-CL': /correntelida:((?:\d,\d{2})|(?:n\/a))/i,
  'RTD-A': /RTDA:?(\d{3}(?:,\d)?)/i,
  'RTD-B': /RTD[5B8]?:(\d{3}(?:,\d)?)/i,
  'Saida-1mA': /[1i]ma:?(\d{2})/i,
  'Saida-5mA': /[5s]ma:?(\d{2})/i,
  'Saida-10mA': /10ma:?(\d{2})/i,
  'Saida-20mA': /20ma:?(\d{2})/i,
}

function selectTemplates(productName) {
  switch (productName) {
    case 'TM1':
    case 'TM2': {
      header = [
        'Serial', 'TC1-CR', 'TC1-CL', 'TC2-CR', 'TC2-CL', 'RTD-A', 'RTD-B',
        'Saida_mA1-1mA', 'Saida_mA1-5mA', 'Saida_mA1-10mA', 'Saida_mA1-20mA',
        'Saida_mA2-1mA', 'Saida_mA2-5mA', 'Saida_mA2-10mA', 'Saida_mA2-20mA'
      ]

      inputValues = {
        'Produto': null,
        'VersaoFW': null,
        'TCExterno': null,
        'Data': null,
        'Responsavel': null,
        'Verify-1to9': 'OK',
        'Reles': 'OK',
        'I(MA)': 'OK',
        'I(A)': 'OK',
        'RS232/485': 'OK',
        'BurninIn': null,
        'BurninOut': null
      }
      console.log('TM template selected:', { header, inputValues })
      break
    }

    case 'AVR': {
      header = ['Serial', 'Saida_mA1-1mA', 'Saida_mA1-5mA', 'Saida_mA1-10mA', 'Saida_mA1-20mA']

      inputValues = {
        'Produto': null,
        'VersaoFW': null,
        'TCExterno': null,
        'Data': null,
        'Responsavel': null,
        'BurninIn': null,
        'BurninOut': null
      }
      console.log('AVR template selected:', { header, inputValues })
      break
    }
    default: {
      printError(log.templateErrors)
      throw new Error(log.templateErrors)
    }
  }
}

function scrollToBottom() {
  terminal.scrollIntoView({ behavior: "smooth", block: "end" });
}

function updateProgressBar(progress) {
  progressbar.style.width = `${progress}%`
}

function print(message) {
  terminal.innerHTML += `<span>${message}</span><br>`
  scrollToBottom()
}

function printError(message) {
  terminal.innerHTML += `<span class="error">${message}</span><br>`
  scrollToBottom()
}

function printAllValuesErrors() {
  if (Object.keys(errors).length > 0) {
    terminal.innerHTML += `<p class="warning">${log.checkValuesWarn}</p>`
    for (const key in errors) {
      terminal.innerHTML += `
        <li class="errorReport">${log.reportErrors(key, errors[key])}</li>`
    }
    terminal.innerHTML += '<br>'
  }
}

async function recognize(imagePath) {
  const scheduler = await Tesseract.createScheduler();
  const worker = await Tesseract.createWorker({
    // logger: (m) => console.log(m)
  });

  const columnAreas = [
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

  await worker.loadLanguage('por');
  await worker.initialize('por');
  scheduler.addWorker(worker);

  const results = await Promise.all(columnAreas.map((rectangle) => (
    scheduler.addJob('recognize', imagePath, { rectangle })
  )));

  let text = (results.map(r => r.data.text));
  await scheduler.terminate();

  print(log.recognize)
  return text
}

function sanitizeText(textArray) {
  let text = textArray.join('')
  text = text.replace(/\s/g, '')
  text = text.replace("'", '')
  text = text.replace('"', '')
  print(log.sanitize)
  return text
}

function extractValues(text, fileName) {
  let repeatCalibraçãoSaida = true
  let repeatCalibraçãoTC = true
  let errorsCounter = 0

  const re = Object.values(regExp)
  const result = []

  for (let i = 0; i < re.length; i++) {
    let match = re[i].exec(text)

    if (match !== null) {
      const matchValue = match[1].toString()
      result.push(matchValue)
      text = text.replace(match[0], '___')
    } else {
      errorsCounter++
      result.push("#ERROR")
    }

    if (i === 2 && repeatCalibraçãoTC) {
      i = 0
      repeatCalibraçãoTC = false
    }

    if (i === 8 && repeatCalibraçãoSaida) {
      i = 4
      repeatCalibraçãoSaida = false
    }
  }

  if (errorsCounter) {
    printError(log.extractErrors(errorsCounter))
    errors[fileName.slice(0, -4)] = errorsCounter
  }

  print(log.extract)
  return result
}

function processCounterLog() {
  print(log.process(processCounter, files.length))
  processCounter++
}

function insertInputs(to, insertObjectKeys = true) {
  let array = insertObjectKeys ? Object.keys(inputValues) : Object.values(inputValues)
  to.splice(1, 0, ...array)
}

async function initialize() {
  if (files.length === 0) {
    printError(log.emptyFolderError)
    throw new Error(log.templateErrors)
  }

  print(log.startProgram)
  disableButtons()
  insertInputs(header, true)
  window.api.writeHeader(tsvFilePath, header)
  print(log.writeHeader)
  processCounter = 1

  for (const { fileName, fileDate } of files) {
    processCounterLog()
    print(log.imageName(fileName))
    print(log.imageDate(fileDate))

    inputValues.Data = fileDate
    updateProgressBar((processCounter - 1.5) * 100 / files.length)

    let data = await recognize(diretoryPath + fileName)
    let text = sanitizeText(data)
    let values = extractValues(text, fileName)

    insertInputs(values, false)
    window.api.appendValues(tsvFilePath, values)
    print(log.appendValues)
  }

  await window.api.writeExcel(tsvFilePath, xlsFilePath)
  print(log.writeExcel)
  printAllValuesErrors()
  print(log.finishProgram)
  enableButtons()
  updateProgressBar((processCounter - 1) * 100 / files.length)
}

window.api.receive("fromMain", (data) => {
  console.log(`Received from main process: \n ${JSON.stringify(data)}`);
  files = data
  initialize()
});

selectDirectoryBtn.addEventListener('click', _ => {
  removeFocus(selectDirectoryBtn)
  window.api.selectFolder().then(result => directoryInput.value = result)
})

form.addEventListener('submit', event => {
  event.preventDefault()

  selectTemplates(form.produto.value)
  diretoryPath = directoryInput.value

  inputValues.Produto = form.produto.value
  inputValues.VersaoFW = form.firmware.value
  inputValues.TCExterno = form.externo.value
  inputValues.Responsavel = form.responsavel.value.toUpperCase()
  inputValues.BurninIn = form.entrada.value
  inputValues.BurninOut = form.saida.value

  window.api.send("toMain", diretoryPath);
})

// Trocar remover hover, começa tudo disble e Botão iniciar ficar enable quando todos os campos forem preenchidos. Data-atr poderia melhorar esse caso e o submit tbm ou criar em array com o name e itera numa template string

// impedir repeatCalibration de ocr dependendo do produto
// Append line on respective excel workbook

function removeFocus(element) {
  element.blur()
}

function disableButtons() {
  initializeBtn.setAttribute('disabled', 'true')
  outputBtn.forEach(button => button.setAttribute('disabled', 'true'))
}

function enableButtons() {
  initializeBtn.removeAttribute("disabled")
  outputBtn.forEach(button => button.removeAttribute("disabled"))
}