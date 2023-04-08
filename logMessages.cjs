const log = {
  startProgram      : '>>> Starting Program <<< <br>',
  addHandFillHeader : '>>> addHandFillHeader Done.',
  writeHeader       : '>>> Header writed to file.<br>',
  process           : (counter, total) => `>>> Processing: ${counter}/${total}`,
  imageName         : (name) => `>>> ImageName: ${name}`,
  imageDate         : (date) => `>>> ImageDate: ${date}`,
  ocrImage          : `>>> Recognition Done.`,
  processData       : '>>> processData Done.',
  getValues         : '>>> getValues Done.',
  addHandFillFields : '>>> addHandFillFields Done.',
  appendValues      : '>>> Values Appended to file.<br>',
  writeExcel        : '>>> writeExcel Done.',
  finishProgram     : '>>> Program Finished <<<',

  getValuesErrors   : (acc) => `>>> Error: ${acc} values not found.`,
  emptyFolderError  : '>>> Screenshot folder is empty!',
  reportValuesErrors: (key, errors) => `>>> ${key} - ${errors} values not found. <br> `,
}