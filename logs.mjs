import chalk from 'chalk'
import path from 'path'

const log = {
  'startProgram'     : () => console.log(chalk.bgGreen('>>>       Starting Program       <<<\n')),
  'finishProgram'    : () => console.log(chalk.bgGreen('>>>       Program Finished       <<<')),
  'addHandFillHeader': () => console.log('>>> addHandFillHeader Done.'),
  'writeHeader'      : () => console.log(chalk.green('>>> Header writed to file.\n')),
  'imageName'     : (img) => console.log(chalk.blue(`>>> ImageName: ${path.parse(img).name}`)),
  'getImageDate' : (date) => console.log(chalk.blue(`>>> ImageDate: ${date}`)),
  'cropImage'        : () => console.log('>>> cropImage Done.'),
  'ocrImage'      : (img) => console.log(` OCR cropped ${img} Done.`),
  'processData'      : () => console.log('>>> processData Done.'),
  'getValues'        : () => console.log('>>> getValues Done.'),
  'addHandFillFields': () => console.log('>>> addHandFillFields Done.'),
  'appendValues'     : () => console.log(chalk.green('>>> Values Appended to file.\n')),
  'writeExcel'       : () => console.log(chalk.green('>>> writeExcel Done.\n')),

  'getValuesError'   : (acc) => console.error(chalk.red(`>>> Error: ${acc} values not found.`)),
  'emptyFolderError'    : () => console.error(chalk.red('>>> Screenshot folder is empty!')),
  'reportValuesError': (key, errors) => console.error(chalk.bgRed(`>>> ${path.parse(key).name} - ${errors[key]} values not found  <<<`))
}

export default log