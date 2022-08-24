import Tesseract from 'tesseract.js';
import chalk from 'chalk';
import Jimp from 'jimp';

let img = ('./images/img1.png'); // Ler varias fotos.
let part0;
let part1;
let part2;
let recognizedText;

function main(image) {
    cropImage(image);
    setTimeout(() => ocrImage(0), 1 * 1000)
    setTimeout(() => ocrImage(1), 10 * 1000)
    setTimeout(() => ocrImage(2), 25 * 1000)
    setTimeout(() => mergeText(part0, part1, part2), 42 * 1000)
    setTimeout(() => findValues(recognizedText), 45 * 1000)
    //setTimeout(() => writeCSV(), 48 * 1000) // Proxima passo.
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
    console.log(recognizedText) // Show the concatened text. 
}

//######## Refatorar ###########
function findValues(recognizedText) {
    //trata texto
    let text = recognizedText;
    text = text.replace(/\s/g, '');
    text = text.replace("'", '');
    text = text.replace('"', '');

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

    let repeatCalibraçãoSaida = true;
    let repeatCalibraçãoTC = true;
    for (let i = 0; i < regExp.length; i++) {
        let valorEncontrado = regExp[i].exec(text);  //renomear valorEncontrado
        if (valorEncontrado) {
            valorEncontrado = valorEncontrado.toString();
            if (i == 0) { console.log(valorEncontrado.slice(-6)) }
            if (i == 1) { console.log(valorEncontrado.slice(-5)) }
            if (i == 2) { console.log(valorEncontrado.slice(-5)) }
            if (i == 3) { console.log(valorEncontrado.slice(-4)) }
            if (i == 4) { console.log(valorEncontrado.slice(-4)) }
            
            if (i == 4 && repeatCalibraçãoTC) {
                i = 2; 
                repeatCalibraçãoTC = false;
            }

            if (i == 5) { console.log(valorEncontrado.slice(-2)) }
            if (i == 6) { console.log(valorEncontrado.slice(-2)) }
            if (i == 7) { console.log(valorEncontrado.slice(-2)) }
            if (i == 8) { console.log(valorEncontrado.slice(-2)) }

            if (i == 8 && repeatCalibraçãoSaida) {
                i = 4; 
                repeatCalibraçãoSaida = false;
            }

            text = text.replace(valorEncontrado, (chalk.bgGreen('#')))
        } else if (valorEncontrado == undefined) {                        //Repensar para não floodar
            console.log(chalk.red('RegExp not found'))
        }
    }
    //console.log(text); //show where the date was obtained.
}
