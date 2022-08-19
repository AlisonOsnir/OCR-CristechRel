import Tesseract from "tesseract.js";

const img = ('./imagens/imageteste.png');

function ocrRecognize(){
    Tesseract.recognize(
    img,
    'por',
    { logger: m => console.log(m) }
).then(({ data: { text } }) => {
    //text = text.trim().split('\n')
    return text;
})}

const text = ocrRecognize()

function encontraValores(text) {
    const re = /(Escala) (0[\b]a[\b]1mA:[\b])\d\d/ //não está encontrando
    
    let valorEncontrado = re.test(text);
    console.log(valorEncontrado)
}

setTimeout(() => {
    encontraValores(text);
},22000)
