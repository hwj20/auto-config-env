try {
  const openai = require('openai');
} catch (err) {
  console.error("Failed to load 'openai' module:", err);
}

const vscode = require('vscode');
const {executeRunPythonAndHandleErrors,testpython,getCondaEnvironments,getPythonVersion} = require('./utils/runPythonFileUtils')
const {generateRequirements,getPackageAndInstall} = require('./utils/createRequirementUtils')
const {completeImports} = require('./utils/addImportsUtils')
const { exec } = require('child_process');


let selectedCondaEnv = 'base';
let selectedPythonVersion = '';
let statusBarItem;
let isPythonVersionValid = false;


async function createNewCondaEnv() {
    const envName = await vscode.window.showInputBox({
        prompt: 'Enter name for new Conda environment',
        placeHolder: 'my_new_env'
    });

    if (!envName) {
        vscode.window.showErrorMessage('Environment name is required to create a new Conda environment.');
        return null;
    }

    const pythonVersion = await vscode.window.showQuickPick(
        ['3.6', '3.7', '3.8', '3.9', '3.10','3.11','3.12'],
        { placeHolder: 'Select Python version for the new environment' }
    );

    if (!pythonVersion) {
        vscode.window.showErrorMessage('Python version is required to create a new Conda environment.');
        return null;
    }

    try {
        await new Promise((resolve, reject) => {
            exec(`conda create -n ${envName} python=${pythonVersion} -y`, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            });
        });
        vscode.window.showInformationMessage(`Conda environment '${envName}' created successfully.`);
        return envName;
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create Conda environment: ${error}`);
        return null;
    }
}


async function updateStatusBar() {
    try{
        const pythonVersion = await getPythonVersion(selectedCondaEnv);
        selectedPythonVersion = pythonVersion;
        statusBarItem.text = `$(database) ${selectedCondaEnv} (Python ${pythonVersion})`;
        statusBarItem.show();
        isPythonVersionValid = true;
    }catch(error){
        statusBarItem.text = `$(database) ${selectedCondaEnv} (Python version not found)`;
        statusBarItem.show();
        isPythonVersionValid = false;
    }
}

async function selectCondaEnv() {
    let condaEnvironments = await getCondaEnvironments();
    condaEnvironments.push('Create new environment...');

    const selectedEnv = await vscode.window.showQuickPick(condaEnvironments, {
        placeHolder: 'Select Conda Environment',
    });

    if (selectedEnv === 'Create new environment...') {
        const newEnvName = await createNewCondaEnv();
        if (newEnvName) {
            selectedCondaEnv = newEnvName;
            await updateStatusBar();
        }
    } else if (selectedEnv) {
        selectedCondaEnv = selectedEnv;
        await updateStatusBar();
    }
}


// async function showCustomMessageBox(context, message) {
//     const panel = vscode.window.createWebviewPanel(
//         'customMessageBox',
//         'Confirmation',
//         vscode.ViewColumn.One,
//         { enableScripts: true }
//     );

//     panel.webview.html = getWebviewContentWindow(message);

//     return new Promise((resolve) => {
//         panel.webview.onDidReceiveMessage(
//             message => {
//                 switch (message.command) {
//                     case 'yes':
//                         resolve('Yes');
//                         panel.dispose();
//                         break;
//                     case 'no':
//                         resolve('No');
//                         panel.dispose();
//                         break;
//                 }
//             },
//             undefined,
//             context.subscriptions
//         );
//     });
// }

// function getWebviewContentWindow(message) {
//     return `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>Confirmation</title>
//         </head>
//         <body>
//             <h1>${message}</h1>
//             <button onclick="sendMessage('yes')">Yes</button>
//             <button onclick="sendMessage('no')">No</button>
//             <script>
//                 const vscode = acquireVsCodeApi();
//                 function sendMessage(command) {
//                     vscode.postMessage({ command: command });
//                 }
//             </script>
//         </body>
//         </html>
//     `;
// }
async function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'auto_config_env.selectCondaEnv';
    context.subscriptions.push(statusBarItem);
    await updateStatusBar();
    
    // addImportStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    // addImportStatusBarItem.text = `$(add) Add Imports`;
    // addImportStatusBarItem.command = 'extension.completeImports';
    // context.subscriptions.push(addImportStatusBarItem);
    // addImportStatusBarItem.show();

    let disposableSelectCondaEnv = vscode.commands.registerCommand('auto_config_env.selectCondaEnv', selectCondaEnv);
    context.subscriptions.push(disposableSelectCondaEnv);

    let disposableAutoConfig = vscode.commands.registerCommand('auto_config_env.autoConfig', async() => {
        if (isPythonVersionValid) {
            try{
                await getPackageAndInstall(selectedPythonVersion,selectedCondaEnv);
                
                const userChoice = await vscode.window.showQuickPick(
                    ['Yes', 'No'], 
                    {
                        placeHolder: 'Config Finished. Do you wish to run the program?',
                        canPickMany: false
                    }
                );
                // const userChoice = await showCustomMessageBox(context, 'Do you want to run the program?');

                // const userChoice = await vscode.window.showInformationMessage(
                //     'Do you want to run the program?',
                //     { modal: true },
                //     'Yes',
                //     'No'
                // );

                if (userChoice === 'Yes') {
                    await executeRunPythonAndHandleErrors(3, selectedCondaEnv); // 设置循环次数为3次，并指定conda环境
                } else {
                    vscode.window.showInformationMessage('Program execution cancelled.');
                }
                
            }
            catch(error){
                vscode.window.showErrorMessage('Error:'+ error);
            }
        } else {
            await selectCondaEnv();
            vscode.window.showErrorMessage('Cannot run Python script: Python version not found for the selected Conda environment.');
        }
    });


    let disposableRunPython = vscode.commands.registerCommand('auto_config_env.runPythonAndHandleErrors', async() => {
        if (isPythonVersionValid) {
            await executeRunPythonAndHandleErrors(3, selectedCondaEnv); // 设置循环次数为3次，并指定conda环境
        } else {
            await selectCondaEnv();
            vscode.window.showErrorMessage('Cannot run Python script: Python version not found for the selected Conda environment.');
        }
    });

    let disposableCompleteImports = vscode.commands.registerCommand('auto_config_env.completeImports', completeImports);

    let disposableGenerateRequirements = vscode.commands.registerCommand('auto_config_env.generateRequirements', async (uri) => {
        if (uri) {
            const folderPath = uri.fsPath;
            await generateRequirements(folderPath,selectedPythonVersion);
        } else {
            vscode.window.showErrorMessage('No folder selected');
        }
    });
     

    context.subscriptions.push(disposableRunPython);
    context.subscriptions.push(disposableCompleteImports);
    context.subscriptions.push(disposableGenerateRequirements);
    context.subscriptions.push(disposableAutoConfig);
    

    // const myProvider = {
    //     async resolveWebviewView(webviewView) {
    //         webviewView.webview.options = {
    //             enableScripts: true,
    //         };

    //         const condaEnvironments = await getCondaEnvironments();
    //         webviewView.webview.html = getWebviewContent(condaEnvironments);
    //         // webviewView.webview.html = getWebviewContent([]);

    //         webviewView.webview.onDidReceiveMessage(async (message) => {
    //             switch (message.command) {
    //                 case 'runScript':
    //                     vscode.commands.executeCommand('extension.runPythonAndHandleErrors',message.condaEnv);
    //                     return;
    //                 case 'completeImports':
    //                     vscode.commands.executeCommand('extension.completeImports');
    //                     return;
    //                 case 'generateRequirements':
    //                     vscode.commands.executeCommand('extension.generateRequirements');
    //                     return;
    //                 case 'refreshCondaEnv':
    //                     const condaEnvironments = await getCondaEnvironments();
    //                     webviewView.webview.html = getWebviewContent(condaEnvironments);
    //             }
    //         });
    //     }
    // };

    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider('view.autorun', myProvider)
    // );
}


// function getWebviewContent(condaEnvironments) {
//     const options = condaEnvironments.map(env => `<option value="${env}">${env}</option>`).join('');
//     return `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>Run Script</title>
//             <style>
//             .full-width-button {
//                 width: 90%;
//                 background-color: #0078D4;
//                 color: white;
//                 border: none;
//                 padding: 7px 0px;
//                 font-size: 12px;
//                 cursor: pointer;
//                 margin: 7px;
//                 border-radius: 2px; /* Round */
//                 font-family: Arial;
//             }
//             </style>
//         </head>
//         <body>
//             <label for="condaEnv">Select Conda Environment:</label>
//             <select id="condaEnv">
//                 ${options}
//             </select>
//             <button onclick="refreshCondaEnv()" class="full-width-button">Refresh Conda Env List</button>
//             <button onclick="runScript()" class="full-width-button">Run Python Script</button>
//             <button onclick="completeImports()" class="full-width-button">Complete Imports</button>
//             <button onclick="generateRequirements()" class="full-width-button">Generate requirements.txt</button>
//             <!--  <button onclick="addNewCondaEnv(" class="full-width-button">Add new CondaEnv</button> -->
//             <script>
//                 const vscode = acquireVsCodeApi();
//                 function runScript() {
//                     const condaEnv = document.getElementById('condaEnv').value;
//                     vscode.postMessage({ command: 'runScript', condaEnv: condaEnv } );
//                 }
//                 function completeImports() {
//                     const condaEnv = document.getElementById('condaEnv').value;
//                     vscode.postMessage({ command: 'completeImports', condaEnv: condaEnv } );
//                 }
//                 function generateRequirements() {
//                     const condaEnv = document.getElementById('condaEnv').value;
//                     vscode.postMessage({ command: 'generateRequirements', condaEnv: condaEnv  });
//                 }
//                 function refreshCondaEnv() {
//                     const condaEnv = document.getElementById('condaEnv').value;
//                     vscode.postMessage({ command: 'refreshCondaEnv', condaEnv: condaEnv  });
//                 }
//             </script>
//         </body>
//         </html>
//     `;
// }

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
