const dirInput = document.querySelector('#dirInput')
const selectDirBtn = document.querySelector('.selectDir')
const form = document.querySelector('form')
const terminal = document.querySelector('.terminal')
const processBar = document.querySelector('progress')

let diretoryPath = null
let files = null

const tsvFilePath = './outputs/values.tsv'
const xlsFilePath = './outputs/output.xls'
const errors = {}

const header = [
  'Serial', 'TC1-CR', 'TC1-CL', 'TC2-CR', 'TC2-CL', 'RTD-A', 'RTD-B',
  'Saida_mA1-1mA', 'Saida_mA1-5mA', 'Saida_mA1-10mA', 'Saida_mA1-20mA',
  'Saida_mA2-1mA', 'Saida_mA2-5mA', 'Saida_mA2-10mA', 'Saida_mA2-20mA'
]

const inputValues = {
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

const regex = {
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


window.api.receive("fromMain", (data) => {
  // console.log(`Received from main process: \n ${JSON.stringify(data)}`);
  files = data
  initialize()
});

selectDirBtn.addEventListener('click', _ => {
  window.api.selectFolder().then(result => dirInput.value = result + '\\')
})

form.addEventListener('submit', event => {
  event.preventDefault()

  diretoryPath = dirInput.value
  inputValues.Produto = form.produto.value
  inputValues.VersaoFW = form.firmware.value
  inputValues.TCExterno = form.externo.value
  inputValues.Responsavel = form.responsavel.value.toUpperCase()
  inputValues.BurninIn = form.entrada.value
  inputValues.BurninOut = form.saida.value

  window.api.send("toMain", diretoryPath);
})


function scrollToBottom () {
  terminal.scrollIntoView({ behavior: "smooth", block: "end" });
}

function print(string) {
  terminal.innerHTML += `<span>${string}</span><br>`
  scrollToBottom()
}

function printError(string) {
  terminal.innerHTML += `<span class="error">${string}</span><br>`
  scrollToBottom()
}

function printAllValuesErrors() {
  if (Object.keys(errors).length > 0) {
    terminal.innerHTML += '<ul>'
    for (const key in errors) {
      terminal.innerHTML += `
        <li class="errorReport">${log.reportValuesErrors(key, errors[key])}</li>`
    }
    terminal.innerHTML += '</ul><br>'
  }
}

let recognizingProcessStart = 0
async function ocrImage(imagePath) {
  const scheduler = await Tesseract.createScheduler();
  const worker = await Tesseract.createWorker({
    // logger: (m) => {
    //     console.log(m)
    //   }
  });

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

  await worker.loadLanguage('por');
  await worker.initialize('por');
  scheduler.addWorker(worker);

  const results = await Promise.all(rectangles.map((rectangle) => (
    scheduler.addJob('recognize', imagePath, { rectangle })
  )));

  let text = (results.map(r => r.data.text));
  await scheduler.terminate();

  recognizingProcessStart = 0
  print(log.ocrImage)
  return text
}

function sanitizeText(stringArray) {
  let data = stringArray.join('')
  data = data.replace(/\s/g, '')
  data = data.replace("'", '')
  data = data.replace('"', '')
  print(log.processData)
  return data
}

function getValues(data, fileName) {
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
      data = data.replace(match[0], '___')
    } else {
      errCounter++
      result.push("#ERROR")
    }
    if (i == 2 && repeatCalibraçãoTC) { i = 0; repeatCalibraçãoTC = false; }
    if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; }
  }
  if (errCounter) {
    printError(log.getValuesErrors(errCounter))
    errors[fileName.slice(0, -4)] = errCounter
  }
  print(log.getValues)
  return result
}

let processCounter = 1
function processCounterLog() {
  print(log.process(processCounter, files.length))
  processCounter++
}

function addHandFillHeader(to) {
  let arr = Object.keys(inputValues)
  to.splice(1, 0, ...arr)
  print(log.addHandFillHeader)
}

function addHandFillFields(to) {
  let arr = Object.values(inputValues)
  to.splice(1, 0, ...arr)
  print(log.addHandFillFields)
}

function reportValuesError() {
  if (Object.keys(errors).length > 0) {
    for (const key in errors) {
      print(log.reportValuesError(key, error))
      console.log(errors)
    }
  }
}

async function initialize() {
  print(log.startProgram)
  addHandFillHeader(header)
  window.api.writeHeader(tsvFilePath, header)
  print(log.writeHeader)


  if (files.length === 0) {
    printError(log.emptyFolderError)
  }

  processBar.setAttribute('max', files.length)
  processBar.value = 0.2
  processCounter = 1

  for (const { fileName, fileDate } of files) {
    processCounterLog()
    print(log.imageName(fileName))
    print(log.imageDate(fileDate))
    inputValues.Data = fileDate
    let text = await ocrImage(diretoryPath + fileName)
    let data = sanitizeText(text)
    let values = getValues(data, fileName)
    addHandFillFields(values)
    // console.log(values)
    window.api.appendValues(tsvFilePath, values)
    print(log.appendValues)
    processBar.value = processCounter - 1
  }

  await window.api.writeExcel(tsvFilePath, xlsFilePath)
  print(log.writeExcel)
  printAllValuesErrors()
  print(log.finishProgram)
}

// Append line on respective excel workbook
// Create AVR Case