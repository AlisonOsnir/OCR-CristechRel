import { createWorker } from 'tesseract.js'
import chalk from 'chalk';
import Jimp from 'jimp';
import * as fs from 'fs';

const imagesDirPath = './images/';
const txtFilePath = './values.txt';

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

const regExpTM = {
  'Serial': /númerodesérie:\d{6}/i,
  'RTD-A': /RTDA:?\d{3},\d/i,
  'RTD-B': /RTD[5B8]?:\d{3},\d/i,
  'TC-CR': /correntedereferência:\d,\d{2}/i,
  'TC-CL': /correntelida:\d,\d{2}/i,
  'Saida-1mA': /1ma:\d{2}/i,
  'Saida-5mA': /[s5]ma:?\d{2}/i,
  'Saida-10mA': /10ma:?\d{2}/i,
  'Saida-20mA': /20ma:?\d{2}/i,
}

async function cropImage(img) {
  console.log(chalk.blue(`>>> ImagePath: ${img}`));
  for (let i = 1; i < 4; i++) {
    const image = await Jimp.read(img);
    image.grayscale()
    image.crop(...cropCoords[Object.keys(cropCoords)[i - 1]]);
    await image.writeAsync(`cropped_images/cropped_part${i}.png`);
  }
  console.log('>>> cropImage Done.')
}

async function ocrImage(part) {
  console.log(`>>> OCR cropped_${part} Start`);

  try {
    const worker = createWorker({
      //logger: m => console.log(m), // Add logger here
    });

    await worker.load();
    await worker.loadLanguage('por');
    await worker.initialize('por');
    const { data: { text } } = await worker.recognize(`./cropped_images/cropped_${part}.png`);
    //console.log(text);
    await worker.terminate();
    return new Promise((resolve, reject) => {
      resolve(text)
    })
  } catch (error) {
    console.log("error" + error);
  } finally {
    console.log(`>>> OCR cropped_${part} Done.`);
  }
  sleep(6000);
}

function processData(a, b, c) {
  let text = (a + b + c);
  if (!text) throw TypeError;
  text = text.replace(/\s/g, '');
  text = text.replace("'", '');
  text = text.replace('"', '');
  console.log('>>> Data process Done.');
  return text;

}

function getValues(text) {
  let repeatCalibraçãoSaida = true;
  let repeatCalibraçãoTC = true;
  const arr = [];

  for (let i = 0; i < Object.keys(regExpTM).length; i++) {
    let result = Object.values(regExpTM)[i].exec(text);
    if (result) {
      result = result.toString();
      if (i == 0) arr.push(result.slice(-6));
      if (i == 1) arr.push(result.slice(-5));
      if (i == 2) arr.push(result.slice(-5));
      if (i == 3) arr.push(result.slice(-4));
      if (i == 4) arr.push(result.slice(-4));
      if (i == 5) arr.push(result.slice(-2));
      if (i == 6) arr.push(result.slice(-2));
      if (i == 7) arr.push(result.slice(-2));
      if (i == 8) arr.push(result.slice(-2));

      if (i == 4 && repeatCalibraçãoTC) { i = 2; repeatCalibraçãoTC = false; };
      if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; };

      text = text.replace(result, (chalk.bgGreen('###')));
    } else if (result == undefined) {
      arr.push('N/A');
      //console.log(chalk.red('regExp not found'));
    }
  }
  //console.log(arr);
  //console.log(text);
  console.log('>>> getValues Done.')
  return arr
}

async function appendValues(arrValues) {
  fs.appendFile(txtFilePath, arrValues.join(" ") + '\n', 'utf8', function (err) {
    if (err) throw err;
  })

  //sleep(6000)
  console.log(chalk.green('>>> Values Appended to textFile.\n'));
}

function writeHeader(header) {
  fs.writeFile(txtFilePath, header.join(" ") + '\n', 'utf8', function (err) {
    if (err) throw err;
  })
  console.log(chalk.green('>>> Header writed to textFile.\n'));
}

function counterImagesLog(index, files) {
  console.log(chalk.green(`>>> ImagesCounter: ${index + 1}/${files.length}`));
}

function startingLog() {
  console.log(chalk.bgGreen('>>>     Starting Program     <<<\n'));
}

async function finishLog() {
  await sleep(5000);
  console.log(chalk.bgGreen('>>>     Program Finished     <<<\n'));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(imagePath) {
  try {
    await cropImage(imagePath)
    let crop1 = await ocrImage('part1')
    let crop2 = await ocrImage('part2')
    let crop3 = await ocrImage('part3')
    let text = processData(crop1, crop2, crop3)
    let values = getValues(text)
    await appendValues(values)
  } catch (error) {
    console.log('error:', error)
  }
}

(async () => {
  try {
    startingLog();
    writeHeader(headerTM);

    // Get the files as an array
    const files = await fs.promises.readdir(imagesDirPath, (err) => {
      if (err) return console.log('Unable to scan directory: ' + err)
    });

    // Loop them all with for...of
    for (const file of files) {
      //counterImagesLog(i, files);
      await main(imagesDirPath + file)
    }
  }
  catch (error) {
    console.error("Error:", error);
  } finally {
    finishLog();
  }
})(); // Wrap in parenthesis and call now

//main('./images/img1.png')   // Teste main em uma unica imagem.