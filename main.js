import Tesseract from 'tesseract.js';
import chalk from 'chalk';
import Jimp from 'jimp';
import * as fs from 'fs';

let img = ('./images/img1.png'); // Ler varias fotos.
let part0;
let part1;
let part2;
let recognizedText;
let formatedText;
let arrValues = [];

function main(image) {
    cropImage(image);
    setTimeout(() => ocrImage(0), 1 * 1000);
    setTimeout(() => ocrImage(1), 8 * 1000);
    setTimeout(() => ocrImage(2), 22 * 1000);
    setTimeout(() => mergeText(part0, part1, part2), 35 * 1000);
    setTimeout(() => formatText(recognizedText), 36 * 1000);
    setTimeout(() => findValues(formatedText), 37 * 1000);
    //setTimeout(() => writeCSV(arrValues), 38 * 1000); // Proxima passo.
}

main(img)

const croppedParts = {
    part0: [1, 20, 200, 30],
    part1: [278, 100, 237, 460],
    part2: [510, 100, 237, 460]
}

async function cropImage(img) {
    for (let i = 0; i < 3; i++) {
        // Read the image.
        const image = await Jimp.read(img);
        // Crop image.
        await image.crop(...croppedParts[Object.keys(croppedParts)[i]]);
        // Save and overwrite the image
        await image.writeAsync(`images/cropped_images/cropped_part${i}.png`);
    }
}

function ocrImage(part) {
    console.log(`OCR croppedPart${part} Iniciado`)
    Tesseract.recognize(
        `images/cropped_images/cropped_part${part}.png`,
        'por',
        //{ logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
        if (part == 0) { part0 = text };
        if (part == 1) { part1 = text };
        if (part == 2) { part2 = text };
        console.log(`OCR croppedPart${part} Concluido`);
    })
}

function mergeText(a, b, c) {
    recognizedText = (a + b + c);
    //console.log(recognizedText) // Show the concatened text. 
}

function formatText(data){
    let text = data;
    text = text.replace(/\s/g, '');
    text = text.replace("'", '');
    text = text.replace('"', '');
    formatedText = text;
}

const regExp = [
    /númerodesérie:\d{6}/i,
    /RTDA:?\d{3},\d/i,
    /RTD[5B8]?:\d{3},\d/i,
    /correntedereferência:\d,\d{2}/i,
    /correntelida:\d,\d{2}/i,
    /1ma:\d{2}/i,
    /[s5]ma:?\d{2}/i,
    /10ma:?\d{2}/i,
    /20ma:?\d{2}/i,
]

//######## Refatorar ###########
function findValues(text) {
    let repeatCalibraçãoSaida = true;
    let repeatCalibraçãoTC = true;

    for (let i = 0; i < regExp.length; i++) {
        let result = regExp[i].exec(text); 
        if (result) {
            result = result.toString();
            if (i == 0) { arrValues.push(result.slice(-6)) }
            if (i == 1) { arrValues.push(result.slice(-5)) }
            if (i == 2) { arrValues.push(result.slice(-5)) }
            if (i == 3) { arrValues.push(result.slice(-4)) }
            if (i == 4) { arrValues.push(result.slice(-4)) }
            if (i == 5) { arrValues.push(result.slice(-2)) }
            if (i == 6) { arrValues.push(result.slice(-2)) }
            if (i == 7) { arrValues.push(result.slice(-2)) }
            if (i == 8) { arrValues.push(result.slice(-2)) }
            
            if (i == 4 && repeatCalibraçãoTC) { i = 2; repeatCalibraçãoTC = false; }
            if (i == 8 && repeatCalibraçãoSaida) { i = 4; repeatCalibraçãoSaida = false; }

            text = text.replace(result, (chalk.bgGreen('#')))
        } else if (result == undefined) {                        
            arrValues.push('RegExp not found')
        }
    }
    console.log(arrValues)
    //console.log(text); //show where the date was obtained.
}


let writeStream = fs.createWriteStream('./values.csv')
function writeCSV(someArrayOfObjects){

    someArrayOfObjects.forEach((someObject, index) => {     
        let newLine = []
        newLine.push(someObject.stringPropertyOne)
        newLine.push(someObject.stringPropertyTwo)
        
    
        writeStream.write(newLine.join(',')+ '\n', () => {
            // a line was written to stream
        })
    })
    
    writeStream.end()
    
    writeStream.on('finish', () => {
        console.log('finish write stream, moving along')
    }).on('error', (err) => {
        console.log(err)
    })
}
