const imagesDirPath = './screenshots/'

let files = null

window.api.receive("fromMain", (data) => {
  console.log(`Received ${data} from main process`);
  files = data
  init()
});

window.api.send("toMain", imagesDirPath);







const tsvFilePath = './outputs/values.tsv'
const xlsFilePath = './outputs/output.xls'
const errors = {}

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

let recognizingProcessStart = 0
async function ocrImage(imagePath) {
  const scheduler = await Tesseract.createScheduler();
  const worker = await Tesseract.createWorker({
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress === 0) {
        recognizingProcessStart++
      }

      if (recognizingProcessStart == 2) {
        console.log(m.progress.toFixed(1))
      }
    }
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
  // log.ocrImage()
  return text
}

function processData(textArr) {
  let data = textArr.join('')
  data = data.replace(/\s/g, '')
  data = data.replace("'", '')
  data = data.replace('"', '')
  // log.processData()
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
      // data = data.replace(match[0], (chalk.bgGreen('___')))
      data = data.replace(match[0], '___')
    } else {
      errCounter++
      result.push("#ERROR")
    }
    if (i == 2 && repeatCalibraçãoTC) { i = 0; repeatCalibraçãoTC = false; }
    if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; }
  }
  if (errCounter) {
    // log.getValuesError(errCounter)
    errors[imagePath] = errCounter
  }
  // log.getValues()
  return result
}



function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms) })
}

async function main(imagePath) {
  let text = await ocrImage(imagePath)
  let data = processData(text)
  let values = getValues(data, imagePath)
  console.log(values)
}

// async function init() {
//   await main(imagesDirPath + '065549.png')
//   sleep(3000)
// }

async function init() {
  const initial = new Date()

  // if (files.length === 0) log.emptyFolderError()

  for (const file of files) {
    // processCounterLog(files)
    // getImageDate(imagesDirPath + file)
    await main(imagesDirPath + file)
    // sleep(3000)
  }

  const final = new Date()

  console.log((final - initial) / 1000)
}