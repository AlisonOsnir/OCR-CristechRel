import Tesseract from 'tesseract.js';
import chalk from 'chalk';
import Jimp from 'jimp';
import * as fs from 'fs';

const imagesDirectoryPath = './images/';
const txtFilePath = './values.txt';

const cropCoords = {
    'part1' : [1, 20, 200, 30],
    'part2' : [278, 100, 237, 460],
    'part3' : [510, 100, 237, 460]
}

const headerTM = [
'Serial', 'RTD-A', 'RTD-B', 'TC1-CR', 'TC1-CL', 'TC2-CR', 'TC2-CL',
'Saida_mA1-1mA','Saida_mA1-5mA','Saida_mA1-10mA','Saida_mA1-20mA',
'Saida_mA2-1mA','Saida_mA2-5mA','Saida_mA2-10mA','Saida_mA2-20mA'
]

const regExpTM = {
    'Serial'    : /númerodesérie:\d{6}/i,
    'RTD-A'     : /RTDA:?\d{3},\d/i,
    'RTD-B'     : /RTD[5B8]?:\d{3},\d/i,
    'TC-CR'     : /correntedereferência:\d,\d{2}/i,
    'TC-CL'     : /correntelida:\d,\d{2}/i,
    'Saida-1mA' : /1ma:\d{2}/i,
    'Saida-5mA' : /[s5]ma:?\d{2}/i,
    'Saida-10mA': /10ma:?\d{2}/i,
    'Saida-20mA': /20ma:?\d{2}/i,
}

let textPart1;
let textPart2;
let textPart3;
let recognizedText;
let formatedText;
let arrValues = [];

function startProgram () {
    fs.readdir(imagesDirectoryPath, (err, files) => {
        if (err) throw err;
        
        console.log(chalk.bgGreen('>>>     Starting Program     <<<\n'));
        writeTXT(headerTM);
        
        files.forEach( (file,i) => {
            setTimeout( _ => counterImagesLog(i, files), i * 60000);
            setTimeout( _ => main(imagesDirectoryPath + file), i * 60000);
            if (i === files.length - 1) {setTimeout( _ => finishLog(), (i + 1) * 60000)};
        })
    })
}

function main(imagePath) {
    setTimeout(() => cropImage(imagePath), 3 * 1000);;
    setTimeout(() => ocrImage('part1'), 6 * 1000);
    setTimeout(() => ocrImage('part2'), 16 * 1000);
    setTimeout(() => ocrImage('part3'), 30 * 1000);
    setTimeout(() => mergeText(textPart1, textPart2, textPart3), 53 * 1000);
    setTimeout(() => formatText(), 54 * 1000);
    setTimeout(() => findValues(), 55 * 1000);
    setTimeout(() => appendTXT(), 56 * 1000);
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

function ocrImage(part) {
    console.log(`>>> OCR cropped ${part} Iniciado`);
    Tesseract.recognize(
        `cropped_images/cropped_${part}.png`,
        'por',
        //{ logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
        if (part == 'part1') textPart1 = text;
        if (part == 'part2') textPart2 = text;
        if (part == 'part3') textPart3 = text;
        console.log(`>>> OCR cropped ${part} Concluido`);
    })
}

function mergeText(a, b, c) {
    recognizedText = a + b + c;
    //console.log(recognizedText)  //Show the concatened text. 
}

function formatText() {
    let text = recognizedText;
    text = text.replace(/\s/g, '');
    text = text.replace("'", '');
    text = text.replace('"', '');
    formatedText = text;
    recognizedText = '';
    console.log('>>> Text Formated.')
}

function findValues() {
    let repeatCalibraçãoSaida = true;
    let repeatCalibraçãoTC = true;

    for (let i = 0; i < Object.keys(regExpTM).length; i++) {
        let result = Object.values(regExpTM)[i].exec(formatedText);
        if (result) {
            result = result.toString();
            if (i == 0) arrValues.push(result.slice(-6));
            if (i == 1) arrValues.push(result.slice(-5));
            if (i == 2) arrValues.push(result.slice(-5));
            if (i == 3) arrValues.push(result.slice(-4));
            if (i == 4) arrValues.push(result.slice(-4));
            if (i == 5) arrValues.push(result.slice(-2));
            if (i == 6) arrValues.push(result.slice(-2));
            if (i == 7) arrValues.push(result.slice(-2));
            if (i == 8) arrValues.push(result.slice(-2));

            if (i == 4 && repeatCalibraçãoTC) { i = 2; repeatCalibraçãoTC = false; };
            if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; };

            formatedText = formatedText.replace(result, (chalk.bgGreen('###')));
        } else if (result == undefined) {
            arrValues.push('N/A');
            //console.log(chalk.red('regExp not found'));
        }
    }
    formatedText = '';
    //console.log(arrValues)    //show the values push to array.
    //console.log(text);        //show where the date was obtained.
}

function writeTXT(header) {
    fs.writeFile(txtFilePath, header.join(" ") + '\n', 'utf8', function (err) {
        if (err) throw err;
        console.log(chalk.blue('>>> Header writed to textFile.\n'));
    })
}

function appendTXT() {
    fs.appendFile(txtFilePath, arrValues.join(" ") + '\n', 'utf8', function (err) {
        if (err) throw err;
        console.log(chalk.blue('>>> Values Appended to textFile.\n'));
    })
    arrValues = [];
}

function counterImagesLog(index, files) {
    console.log(chalk.green(`>>> ImagesCounter: ${index + 1}/${files.length}`));
}

function finishLog() {   
    console.log(chalk.bgGreen('>>>     Program Finished     <<<\n'));
}

startProgram()