const log = {
  startProgram     : '>>> Program started <<< <br>',
  writeHeader      : '>>> Header writed to output.tsv<br>',
  process          : (counter, total) => `>>> Processing: ${counter}/${total}`,
  imageName        : name => `>>> ImageName: ${name}`,
  imageDate        : date => `>>> ImageDate: ${date}`,
  recognize        : `>>> Recognition completed`,
  sanitize         : '>>> Sanitization completed',
  extract          : '>>> Value extraction completed',
  appendValues     : '>>> Values appended to output.tsv<br>',
  writeExcel       : '>>> Excel writed to output.xls',
  finishProgram    : '>>> Program finished <<< <br>',

  checkValuesWarn  : '>>> Please check all values below',

  templateErrors   : '>>> No valid product selected',
  emptyFolderError : '>>> Error: Screenshot directory is empty',
  extractErrors    : counter => `>>> Error: ${counter} values not found`,
  reportErrors     : (key, errors) => `>>> ${key} - ${errors} values not found <br>`,
}