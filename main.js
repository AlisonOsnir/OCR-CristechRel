import Tesseract from 'tesseract.js';
import chalk from 'chalk';
import * as fs from 'fs';

let img = ('./imagens/img2.png');

// img = fs.readFileSync(img)
// console.log(img)

function encontraValores(text) {
    const regExp = [
        /númerodesérie:\d{6}/i,
        /tensão\wV:C:\d,\d{2}/i,
        /P:\d,\d{2}/i,
        /RTDA:?\d{3},\d/i,
        /RTD[5B8]?:\d{3},\d/i,
        /correntedereferência:\d,\d{2}/i,
        /correntelida:\d,\d{2}/i,
        /1ma:\d{2}/i,
        /[s5]ma:?\d{2}/i,
        /10ma:?\d{2}/i,
        /20ma:?\d{2}/i,
    ]

    let i = 0;
    let qtdValores = regExp.length;
    let repete = true;

    while (i < qtdValores) {
        let valorEncontrado = regExp[i].exec(text);
        if (valorEncontrado) {
            valorEncontrado = valorEncontrado.toString();
            if (i == 0) { console.log(valorEncontrado.slice(-6)) }
            if (i == 1) { console.log(valorEncontrado.slice(-4)) }
            if (i == 2) { console.log(valorEncontrado.slice(-4)) }
            if (i == 3) { console.log(valorEncontrado.slice(-5)) }
            if (i == 4) { console.log(valorEncontrado.slice(-5)) }
            if (i == 5) { console.log(valorEncontrado.slice(-4)) }
            if (i == 6) { console.log(valorEncontrado.slice(-4)) }
            if (i == 7) { console.log(valorEncontrado.slice(-2)) }
            if (i == 8) { console.log(valorEncontrado.slice(-2)) }
            if (i == 9) { console.log(valorEncontrado.slice(-2)) }
            if (i == 10) { console.log(valorEncontrado.slice(-2)) }
            i++;

            if (i == 11 && repete) { i = 7; repete = false; }
            text = text.replace(valorEncontrado, (chalk.bgGreen('#')))
        } else if (valorEncontrado == undefined) {
            console.log(chalk.red('Error: regExp não encontrado'))
            i++;
        }
    }
    console.log(text);
}

let textoReconhecido = '';
function ocrRecognize(img) {
    Tesseract.recognize(
        img,
        'por',
        { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
        console.log(text);
        text = text.replace(/\s/g, '');
        text = text.replace("'", '');
        text = text.replace('"', '');
        textoReconhecido = text;
        encontraValores(textoReconhecido);
    })
}

ocrRecognize(img);
