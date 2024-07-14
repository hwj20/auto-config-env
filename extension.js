const vscode = require('vscode');
const { exec } = require('child_process');
const axios = require('axios');

function runPythonFile() {
    return new Promise((resolve, reject) => {
        exec('python3 script.py', (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function handleError(error) {
    try {
        const response = await axios.post('https://your-server-url.com/error', { error });
        return response.data.command;
    } catch (err) {
        vscode.window.showErrorMessage('Error sending error to server: ' + err);
        throw err;
    }
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
}

function activate(context) {
    console.log('Congratulations, your extension "auto-conda-runner" is now active!');
    let disposable = vscode.commands.registerCommand('extension.runPythonAndHandleErrors', async () => {
        try {
            await runPythonFile();
            vscode.window.showInformationMessage('Python script ran successfully.');
        } catch (error) {
            vscode.window.showErrorMessage('Error running Python script: ' + error);
            try {
                const command = await handleError(error);
                vscode.window.showInformationMessage('Received command from server: ' + command);
                const output = await runCommand(command);
                vscode.window.showInformationMessage('Command output: ' + output);
            } catch (err) {
                vscode.window.showErrorMessage('Error handling command: ' + err);
            }
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
