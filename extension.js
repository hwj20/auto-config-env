const vscode = require('vscode');
const {executeRunPythonAndHandleErrors,testpython} = require('./utils/runPythonFileUtils')
const {generateRequirements} = require('./utils/createRequirementUtils')
const {completeImports} = require('./utils/addImportsUtils')

function activate(context) {
    let disposableRunPython = vscode.commands.registerCommand('extension.runPythonAndHandleErrors', () => {
        executeRunPythonAndHandleErrors(3,"base"); // 设置循环次数为3次
        // testpython();
    });

    let disposableCompleteImports = vscode.commands.registerCommand('extension.completeImports', completeImports);

    let disposableGenerateRequirements = vscode.commands.registerCommand('extension.generateRequirements', generateRequirements);

    context.subscriptions.push(disposableRunPython);
    context.subscriptions.push(disposableCompleteImports);
    context.subscriptions.push(disposableGenerateRequirements);

    const myProvider = {
        resolveWebviewView(webviewView) {
            webviewView.webview.options = {
                enableScripts: true,
            };

            webviewView.webview.html = getWebviewContent();

            webviewView.webview.onDidReceiveMessage((message) => {
                switch (message.command) {
                    case 'runScript':
                        vscode.commands.executeCommand('extension.runPythonAndHandleErrors');
                        return;
                    case 'completeImports':
                        vscode.commands.executeCommand('extension.completeImports');
                        return;
                    case 'generateRequirements':
                        vscode.commands.executeCommand('extension.generateRequirements');
                        return;
                }
            });
        }
    };

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('view.autorun', myProvider)
    );
}

function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Run Script</title>
        </head>
        <body>
            <button onclick="runScript()">Run Python Script</button>
            <button onclick="completeImports()">Complete Imports</button>
            <button onclick="generateRequirements()">Generate requirements.txt</button>
            <script>
                const vscode = acquireVsCodeApi();
                function runScript() {
                    vscode.postMessage({ command: 'runScript' });
                }
                function completeImports() {
                    vscode.postMessage({ command: 'completeImports' });
                }
                function generateRequirements() {
                    vscode.postMessage({ command: 'generateRequirements' });
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
