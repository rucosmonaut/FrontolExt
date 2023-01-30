const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
/**
 * @param {vscode.ExtensionContext} context
 */

// ToDo add recursively getting files
function getFilesNamesFromeFolder(folderURL){

	const files = [];

	fs.readdirSync(folderURL).forEach(file => {
		if(path.extname(file).toLowerCase() === ".txt" || path.extname(file).toLowerCase() === ".js"){
			const filePath = `${folderURL}\\${file}`;

			const fileInfo = {
				name: file,
				path: filePath
			};

			files.push(fileInfo);
		}
	  });

	return files;
}

function getFileContent(srcPath, callback) { 
    fs.readFile(srcPath, 'utf8', function (err, data) {
        if (err) handleError(err);
        callback(data);
        }
    );
}

// ToDo add new line between modules
function copyFileContent(savPath, srcPath) { 
    getFileContent(srcPath, function(data) {
		// remove import and export
		data = removeImportExport(data);

        fs.appendFile (savPath, data, function(err) {
            if (err) handleError(err);
        });
    });
}

function checkOutputFolder(folderPath){
	if (!fs.existsSync(folderPath)){
		fs.mkdirSync(folderPath);
	}
}

function checkOutputFile(filePath){
	if(fs.existsSync(filePath)){
		fs.unlink(filePath,function(err){
			if (err) handleError(err);
	   });  
	}

	// Create outputFile
	fs.open(filePath, "wx", function (err, fd) {
		if (err) handleError(err);

		fs.close(fd, function (err) {
			if (err) handleError(err);
		});
	});
}

function handleError(err){
	console.log(err);
	throw err;
}
// Remove import and export from file data
function removeImportExport(data){
	let newData = data;
	const importRegexp = /import\s*{.*}\s*from\s*["'`].*["'`];?/mi
	//const importAllRegexp = /import\s*.*\s*from\s*["'`].*["'`];?/mi
	//const importAllAsRegexp = /import\s*.\s*as\s\w*\sfrom\s["'`]\w*["'`];?/mi
	const exportRegexp = /export\s*{.*}\s*;?/mi
	const exportDefaultRegexp = /export default \s*\w*;?/mi

	// remove while exist importRegexp and exportRegexp in data
	while(importRegexp.test(newData) || exportRegexp.test(newData) || exportDefaultRegexp.test(newData)){

		// remove all imports
		newData = newData.replace(importRegexp, "");
		//newData = newData.replace(importAllRegexp, "");
		//newData = newData.readFile(importAllAsRegexp);

		// remove all exports
		newData = newData.replace(exportRegexp, "");
		newData = newData.replace(exportDefaultRegexp, "");
	}

	newData = newData.trim();

	return newData;
}

//ToDo copy output file to clipboard || Opens the file before all modules are written
function copyOutputFileToClipboard(filePath){
	getFileContent(filePath, (data) => {
		vscode.env.clipboard.writeText(data || "There is no data to copy them");
		vscode.window.showInformationMessage("Output file copied to clipboard");
	});
}

async function activate(context) {

	let disposable = vscode.commands.registerCommand('frontol-ext.compile', async () =>  {

		vscode.window.showInformationMessage("Compile Frontol project started");

		const foldersNames = vscode.workspace.workspaceFolders;

		if(foldersNames === undefined){
			vscode.window.showInformationMessage("Please open project folder");
			return;
		}
		if(foldersNames.length > 1){
			vscode.window.showInformationMessage("Please open project root folder");
			return;
		}

		const rootFolderPath = foldersNames[0].uri.fsPath;
		let files = getFilesNamesFromeFolder(rootFolderPath);

		// Find root Index.js file
		const indexFile = files.filter((file) => (file.name === "Index.js") && (file.path === `${rootFolderPath}\\Index.js`))[0];
		const outputFolderPath = `${rootFolderPath}\\output`;
		const outputFilePath = `${rootFolderPath}\\output\\output.js`;

		checkOutputFolder(outputFolderPath);
		checkOutputFile(outputFilePath);

		copyFileContent(outputFilePath, indexFile.path);

		files = files.filter(f => f.path !== indexFile.path && f.name !== indexFile.name)

		files.forEach((file)  => {
			copyFileContent(outputFilePath, file.path);
		});

		copyOutputFileToClipboard(outputFilePath);
		
		vscode.window.showInformationMessage("Compile Frontol project completed");
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}