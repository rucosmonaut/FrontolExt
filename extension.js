const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
/**
 * @param {vscode.ExtensionContext} context
 */

/**
 * Logging and throw error.
 * @param {Error} err The error message.
 */
function handleError(err) {
  console.log(err);
  throw err;
}

/**
 * Adds two numbers together.
 * @param {string} folderURL URL forlder.
 * @param {string} exclusionFilePath File that will not be added.
 * @return {Array<object>} Return Array of objects with file name and path.
 */
function getFilesNamesFromeFolder(folderURL, exclusionFilePath) {
  const files = [];

  const getFilesRecursively = (folderURL) => {
    const filesInDirectory = fs.readdirSync(folderURL);
    for (const file of filesInDirectory) {
      const absolute = path.join(folderURL, file);
      if (fs.statSync(absolute).isDirectory()) {
        getFilesRecursively(absolute);
      } else {
        if (exclusionFilePath === absolute) continue;
        if (path.extname(file).toLowerCase() === '.txt' ||
        path.extname(file).toLowerCase() === '.js') {
          const filePath = `${folderURL}\\${file}`;

          const fileInfo = {
            name: file,
            path: filePath,
          };

          files.push(fileInfo);
        }
      }
    }
  };

  getFilesRecursively(folderURL);

  return files;
}

/**
 * @param {string} srcPath Path to file.
 * @param {Function} callback Return file data.
 */
function getFileContent(srcPath, callback) {
  fs.readFile(srcPath, 'utf8', (err, data) => {
    if (err) handleError(err);
    callback(data);
  });
}

// ToDo add new line between modules.
/**
 * @param {string} savPath Output file path to write.
 * @param {string} srcPath Path to data reading.
 */
function copyFileContent(savPath, srcPath) {
  getFileContent(srcPath, (data) => {
    // remove import and export
    data = removeImportExport(data);

    fs.appendFile(savPath, data, (err) => {
      if (err) handleError(err);
    });
  });
}

// ToDo add new line between modules.
/**
 * @param {string} folderPath Path to folder.
 */
function checkOutputFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
}

// ToDo add new line between modules.
/**
 * @param {string} filePath Path to file.
 */
function checkOutputFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) handleError(err);
    });
  }

  // Create outputFile.
  fs.open(filePath, 'wx', (err, fd) => {
    if (err) handleError(err);

    fs.close(fd, (err) => {
      if (err) handleError(err);
    });
  });
}

// ToDo add new line between modules.
/**
 * @param {string} data file data.
 * @return {string} return data without imports and exports.
 */
function removeImportExport(data) {
  let newData = data;
  const importRegexp = /import\s*{.*}\s*from\s*["'`].*["'`];?/mi;
  // const importAllRegexp = /import\s*.*\s*from\s*["'`].*["'`];?/mi
  // const importAllAsRegexp = /import\s*.\s*as\s\w*\sfrom\s["'`]\w*["'`];?/mi
  const exportRegexp = /export\s*{.*}\s*;?/mi;
  const exportDefaultRegexp = /export default \s*\w*;?/mi;

  // remove while exist importRegexp and exportRegexp in data.
  while (importRegexp.test(newData) ||
        exportRegexp.test(newData) ||
        exportDefaultRegexp.test(newData)) {
    // remove all imports.
    newData = newData.replace(importRegexp, '');
    // newData = newData.replace(importAllRegexp, "");
    // newData = newData.readFile(importAllAsRegexp);

    // remove all exports.
    newData = newData.replace(exportRegexp, '');
    newData = newData.replace(exportDefaultRegexp, '');
  }

  newData = newData.trim();

  return newData;
}

// ToDo copy output file to clipboard.
// Opens the file before all modules are written.
/**
 * @param {string} filePath Path to file.
 */
function copyOutputFileToClipboard(filePath) {
  getFileContent(filePath, (data) => {
    vscode.env.clipboard.writeText(data || 'There is no data to copy them');
    vscode.window.showInformationMessage('Output file copied to clipboard');
  });
}

/**
 * @param {context} context context VS Code.
 */
async function activate(context) {
  // eslint-disable-next-line max-len
  const disposable = vscode.commands.registerCommand('frontol-ext.compile', async () => {
    vscode.window.showInformationMessage('Compile Frontol project started');

    const foldersNames = vscode.workspace.workspaceFolders;

    if (foldersNames === undefined) {
      vscode.window.showInformationMessage('Please open project folder');
      return;
    }
    if (foldersNames.length > 1) {
      vscode.window.showInformationMessage('Please open project root folder');
      return;
    }

    const rootFolderPath = foldersNames[0].uri.fsPath;

    // Find root Index.js file.
    const indexFile = {
      name: 'Index.js',
      path: `${rootFolderPath}\\Index.js`,
    };

    const outputFolderPath = `${rootFolderPath}\\output`;
    const outputFilePath = `${rootFolderPath}\\output\\output.js`;

    checkOutputFolder(outputFolderPath);
    checkOutputFile(outputFilePath);

    let files = getFilesNamesFromeFolder(rootFolderPath, outputFilePath);

    copyFileContent(outputFilePath, indexFile.path);

    files = files.filter((f) => {
      return f.path !== indexFile.path && f.name !== indexFile.name;
    });

    files.forEach((file) => {
      copyFileContent(outputFilePath, file.path);
    });

    copyOutputFileToClipboard(outputFilePath);

    vscode.window.showInformationMessage('Compile Frontol project completed');
  });

  context.subscriptions.push(disposable);
}

/**
 * This method is called when your extension is deactivated.
 */
function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
