const vscode = require('vscode');
const {executeRunPythonAndHandleErrors,testpython,getCondaEnvironments,getPythonVersion} = require('./utils/runPythonFileUtils')
const {generateRequirements} = require('./utils/createRequirementUtils')
const {completeImports} = require('./utils/addImportsUtils')

let selectedCondaEnv = 'base';
let statusBarItem;
let isPythonVersionValid = false;

async function updateStatusBar() {
    try{
        const pythonVersion = await getPythonVersion(selectedCondaEnv);
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
    const condaEnvironments = await getCondaEnvironments();
    const selectedEnv = await vscode.window.showQuickPick(condaEnvironments, {
        placeHolder: 'Select Conda Environment',
    });
    if (selectedEnv) {
        selectedCondaEnv = selectedEnv;
        updateStatusBar();
    }
}


async function activate(context) {
    await selectCondaEnv();
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'extension.selectCondaEnv';
    context.subscriptions.push(statusBarItem);
    await updateStatusBar();

    let disposableSelectCondaEnv = vscode.commands.registerCommand('extension.selectCondaEnv', selectCondaEnv);
    context.subscriptions.push(disposableSelectCondaEnv);


    let disposableRunPython = vscode.commands.registerCommand('extension.runPythonAndHandleErrors', async() => {
        if (isPythonVersionValid) {
            await executeRunPythonAndHandleErrors(3, selectedCondaEnv); // 设置循环次数为3次，并指定conda环境
        } else {
            vscode.window.showErrorMessage('Cannot run Python script: Python version not found for the selected Conda environment.');
        }
    });

    let disposableCompleteImports = vscode.commands.registerCommand('extension.completeImports', completeImports);

    let disposableGenerateRequirements = vscode.commands.registerCommand('extension.generateRequirements', async (uri) => {
        if (uri) {
            const folderPath = uri.fsPath;
            await generateRequirements(folderPath);
        } else {
            vscode.window.showErrorMessage('No folder selected');
        }
    });
     

    context.subscriptions.push(disposableRunPython);
    context.subscriptions.push(disposableCompleteImports);
    context.subscriptions.push(disposableGenerateRequirements);

    const myProvider = {
        async resolveWebviewView(webviewView) {
            webviewView.webview.options = {
                enableScripts: true,
            };

            const condaEnvironments = await getCondaEnvironments();
            webviewView.webview.html = getWebviewContent(condaEnvironments);
            // webviewView.webview.html = getWebviewContent([]);

            webviewView.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'runScript':
                        vscode.commands.executeCommand('extension.runPythonAndHandleErrors',message.condaEnv);
                        return;
                    case 'completeImports':
                        vscode.commands.executeCommand('extension.completeImports');
                        return;
                    case 'generateRequirements':
                        vscode.commands.executeCommand('extension.generateRequirements');
                        return;
                    case 'refreshCondaEnv':
                        const condaEnvironments = await getCondaEnvironments();
                        webviewView.webview.html = getWebviewContent(condaEnvironments);
                }
            });
        }
    };

    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider('view.autorun', myProvider)
    // );
}


function getWebviewContent(condaEnvironments) {
    const options = condaEnvironments.map(env => `<option value="${env}">${env}</option>`).join('');
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Run Script</title>
            <style>
            .full-width-button {
                width: 90%;
                background-color: #0078D4;
                color: white;
                border: none;
                padding: 7px 0px;
                font-size: 12px;
                cursor: pointer;
                margin: 7px;
                border-radius: 2px; /* Round */
                font-family: Arial;
            }
            </style>
        </head>
        <body>
            <label for="condaEnv">Select Conda Environment:</label>
            <select id="condaEnv">
                ${options}
            </select>
            <button onclick="refreshCondaEnv()" class="full-width-button">Refresh Conda Env List</button>
            <button onclick="runScript()" class="full-width-button">Run Python Script</button>
            <button onclick="completeImports()" class="full-width-button">Complete Imports</button>
            <button onclick="generateRequirements()" class="full-width-button">Generate requirements.txt</button>
            <!--  <button onclick="addNewCondaEnv(" class="full-width-button">Add new CondaEnv</button> -->
            <script>
                const vscode = acquireVsCodeApi();
                function runScript() {
                    const condaEnv = document.getElementById('condaEnv').value;
                    vscode.postMessage({ command: 'runScript', condaEnv: condaEnv } );
                }
                function completeImports() {
                    const condaEnv = document.getElementById('condaEnv').value;
                    vscode.postMessage({ command: 'completeImports', condaEnv: condaEnv } );
                }
                function generateRequirements() {
                    const condaEnv = document.getElementById('condaEnv').value;
                    vscode.postMessage({ command: 'generateRequirements', condaEnv: condaEnv  });
                }
                function refreshCondaEnv() {
                    const condaEnv = document.getElementById('condaEnv').value;
                    vscode.postMessage({ command: 'refreshCondaEnv', condaEnv: condaEnv  });
                }
            </script>
        </body>
        </html>
    `;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
