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
    // Read the image.
    const image = await Jimp.read(img);
    // Turn image to grayscale.
    image.grayscale()
    // Crop image.
    image.crop(...cropCoords[Object.keys(cropCoords)[i - 1]]);
    // Save and overwrite the image
    await image.writeAsync(`cropped_images/cropped_part${i}.png`);
  }
  console.log('>>> Image Cropped.')
}

async function ocrImage(part) {
  console.log(`>>> OCR cropped ${part} Iniciado`);
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
    console.log(`>>> OCR cropped ${part} Concluido`);
  }
}

function processData(a, b, c) {
  let text = (a + b + c)
  text = text.replace(/\s/g, '');
  text = text.replace("'", '');
  text = text.replace('"', '');
  console.log('>>> Data processed.')
  return text
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
  console.log('>>> The values were found.')
  return arr
}

async function appendValues(arrValues) {
  let arr = [];
  fs.appendFile(txtFilePath, arrValues.join(" ") + '\n', 'utf8', function (err) {
    if (err) throw err;
    console.log(chalk.blue('>>> Values Appended to textFile.\n'));
    return arr
  })
}

function writeValuesHeader(header) {
  fs.writeFile(txtFilePath, header.join(" ") + '\n', 'utf8', function (err) {
    if (err) throw err;
    console.log(chalk.blue('>>> Header writed to textFile.\n'));
  })
}

function counterImagesLog(index, files) {
  console.log(chalk.green(`>>> ImagesCounter: ${index + 1}/${files.length}`));
}

function startingLog() {
  console.log(chalk.bgGreen('>>>     Starting Program     <<<\n'));
}

function finishLog() {
  console.log(chalk.bgGreen('\n>>>     Program Finished     <<<\n'));
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

// async function execProgram() {
//   startingLog();
//   writeValuesHeader(headerTM);

//   fs.readdir(imagesDirPath, (err, files) => {
//     if (err) {
//       return console.log('Unable to scan directory: ' + err);
//     }

//     files.forEach((file, i) => {
//       counterImagesLog(i, files)
//       console.log(file)
//       main(imagesDirPath + file) // ERROR 
//       if (i === files.length - 1) finishLog();
//     })
//   })
// }
 //////////////////////////////////////////////////////////////////////

 async function ls(path) {
  const dir = await fs.promises.opendir(path)
  for await (const dirent of dir) {
    console.log(dirent.name)
  }
}

ls('.').catch(console.error)

///////////////////////////////////////////////////////////////////////

(async () => {
  // Our starting point
  try {
    // Get the files as an array
    const files = await fs.promises.readdir(moveFrom);

    // Loop them all with the new for...of
    for (const file of files) {
      
      // Stat the file to see if we have a file or dir
      const stat = await fs.promises.stat(fromPath);

      if (stat.isFile())
        console.log("'%s' is a file.", fromPath);
      else if (stat.isDirectory())
        console.log("'%s' is a directory.", fromPath);

      await fs.promises.readdir(fromPath, toPath);

    } // End for...of
  }
  catch (error) {
    // Catch anything bad that happens
    console.error("We've thrown! Whoops!", error);
  }

})(); // Wrap in parenthesis and call now


finishLog();



//main('./images/img1.png')   // Teste em uma unica imagem
//execProgram ()
